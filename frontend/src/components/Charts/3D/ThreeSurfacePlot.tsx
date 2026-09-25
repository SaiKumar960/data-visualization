import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface ThreeSurfacePlotProps {
  data: any[];
  seriesKeys?: string[];
}

export const ThreeSurfacePlot: React.FC<ThreeSurfacePlotProps> = ({
  data,
  seriesKeys = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCell, setHoveredCell] = useState<{ row: string; col: string; val: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 340;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xf59e0b, 1.5);
    dirLight.position.set(15, 30, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const rows = data.length;
    const cols = seriesKeys.length > 0 ? seriesKeys.length : 5;

    let maxVal = 1;
    data.forEach((row) => {
      seriesKeys.forEach((key) => {
        const v = Number(row[key]) || 0;
        if (v > maxVal) maxVal = v;
      });
    });

    const gridGroup = new THREE.Group();
    scene.add(gridGroup);

    const gridFloor = new THREE.GridHelper(Math.max(rows, cols) * 1.8, 12, 0xf59e0b, 0x334155);
    gridFloor.position.y = 0;
    gridGroup.add(gridFloor);

    const barWidth = 0.9;
    const barDepth = 0.9;
    const spacing = 0.2;
    const meshes: THREE.Mesh[] = [];

    const startX = -((cols * (barWidth + spacing)) / 2) + barWidth / 2;
    const startZ = -((rows * (barDepth + spacing)) / 2) + barDepth / 2;

    data.forEach((rowObj, rIdx) => {
      const rowName = String(rowObj.x || rowObj.row || `Row ${rIdx + 1}`);

      seriesKeys.forEach((colKey, cIdx) => {
        const val = Number(rowObj[colKey]) || 0;
        const normH = Math.max((val / maxVal) * 6, 0.15);

        const geo = new THREE.BoxGeometry(barWidth, normH, barDepth);
        geo.translate(0, normH / 2, 0);

        // Heatmap color interpolation from Blue (low) -> Emerald -> Amber -> Crimson (high)
        const ratio = val / maxVal;
        const color = new THREE.Color();
        if (ratio < 0.33) {
          color.setHSL(0.6 - ratio * 0.5, 0.8, 0.5);
        } else if (ratio < 0.66) {
          color.setHSL(0.3 - (ratio - 0.33) * 0.5, 0.9, 0.5);
        } else {
          color.setHSL(0.1 - (ratio - 0.66) * 0.3, 0.95, 0.5);
        }

        const mat = new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.25,
          metalness: 0.3,
          emissive: color,
          emissiveIntensity: 0.15,
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(startX + cIdx * (barWidth + spacing), 0, startZ + rIdx * (barDepth + spacing));
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.userData = { rowName, colKey, val };
        gridGroup.add(mesh);
        meshes.push(mesh);
      });
    });

    camera.position.set(10, 10, 14);
    camera.lookAt(0, 2, 0);

    let isMouseDown = false;
    let prevMousePos = { x: 0, y: 0 };
    let rotY = 0, rotX = 0;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      isMouseDown = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const u = hitMesh.userData;
        setHoveredCell({ row: u.rowName, col: u.colKey, val: u.val });

        meshes.forEach((m) => {
          (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.15;
        });
        (hitMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7;
      } else {
        if (!isMouseDown) {
          setHoveredCell(null);
          meshes.forEach((m) => {
            (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.15;
          });
        }
      }

      if (!isMouseDown) return;

      const dx = e.clientX - prevMousePos.x;
      const dy = e.clientY - prevMousePos.y;

      rotY += dx * 0.01;
      rotX += dy * 0.01;
      rotX = Math.max(-0.5, Math.min(1.2, rotX));

      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => { isMouseDown = false; };

    const dom = renderer.domElement;
    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    let animId: number;
    let autoRot = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isMouseDown) autoRot += 0.003;

      gridGroup.rotation.y = rotY + autoRot;
      gridGroup.rotation.x = rotX;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resObs = new ResizeObserver(handleResize);
    resObs.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      resObs.disconnect();
      renderer.dispose();
      scene.clear();
    };
  }, [data, seriesKeys]);

  return (
    <div className="relative w-full h-full min-h-[320px] select-none cursor-grab active:cursor-grabbing overflow-hidden rounded-xl bg-slate-950/80 border border-slate-800">
      <div ref={containerRef} className="w-full h-[320px]" />

      <div className="absolute top-2 left-3 text-[10px] text-amber-400 font-mono flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded border border-amber-500/30 backdrop-blur-md pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        3D Matrix Elevation Terrain • Heat Topography
      </div>

      {hoveredCell && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-amber-500/40 px-3 py-1.5 rounded-lg shadow-xl text-xs backdrop-blur-md text-white flex items-center gap-2 pointer-events-none">
          <span className="text-slate-400 font-semibold">{hoveredCell.row} × {hoveredCell.col}:</span>
          <span className="font-bold text-amber-400">{hoveredCell.val.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};
