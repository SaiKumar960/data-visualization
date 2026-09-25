import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface ThreeScatterPlotProps {
  data: any[];
  xField: string;
  yField: string;
}

export const ThreeScatterPlot: React.FC<ThreeScatterPlotProps> = ({
  data,
  xField,
  yField,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ xVal: number; yVal: number; index: number } | null>(null);

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

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    dirLight.position.set(20, 30, 20);
    scene.add(dirLight);

    // Compute min / max
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    data.forEach((item) => {
      const xv = Number(item[xField]) || 0;
      const yv = Number(item[yField]) || 0;
      if (xv < minX) minX = xv;
      if (xv > maxX) maxX = xv;
      if (yv < minY) minY = yv;
      if (yv > maxY) maxY = yv;
    });

    if (minX === maxX) { minX -= 1; maxX += 1; }
    if (minY === maxY) { minY -= 1; maxY += 1; }

    const scatterGroup = new THREE.Group();
    scene.add(scatterGroup);

    // 3D Axis Box Frame
    const boxGeo = new THREE.BoxGeometry(10, 8, 10);
    const boxWire = new THREE.WireframeGeometry(boxGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x334155, opacity: 0.6, transparent: true });
    const boxLines = new THREE.LineSegments(boxWire, lineMat);
    boxLines.position.set(0, 4, 0);
    scatterGroup.add(boxLines);

    // Grid Floor
    const grid = new THREE.GridHelper(10, 10, 0x38bdf8, 0x1e293b);
    grid.position.set(0, 0, 0);
    scatterGroup.add(grid);

    const sphereGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const meshes: THREE.Mesh[] = [];

    data.slice(0, 150).forEach((item, index) => {
      const xv = Number(item[xField]) || 0;
      const yv = Number(item[yField]) || 0;

      const normX = ((xv - minX) / (maxX - minX)) * 8 - 4;
      const normY = ((yv - minY) / (maxY - minY)) * 6 + 1;
      // Synthesize subtle Z distribution for spatial depth
      const normZ = (Math.sin(index * 0.5) * 0.5 + Math.cos(xv * 0.1) * 0.5) * 3.5;

      const mat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.2,
        metalness: 0.5,
        emissive: 0x0284c7,
        emissiveIntensity: 0.3,
      });

      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.position.set(normX, normY, normZ);
      mesh.userData = { xv, yv, index };

      scatterGroup.add(mesh);
      meshes.push(mesh);
    });

    camera.position.set(12, 10, 15);
    camera.lookAt(0, 4, 0);

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
        setHoveredPoint({ xVal: u.xv, yVal: u.yv, index: u.index });

        meshes.forEach((m) => {
          (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3;
          m.scale.set(1, 1, 1);
        });
        (hitMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.9;
        hitMesh.scale.set(1.8, 1.8, 1.8);
      } else {
        if (!isMouseDown) {
          setHoveredPoint(null);
          meshes.forEach((m) => {
            (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3;
            m.scale.set(1, 1, 1);
          });
        }
      }

      if (!isMouseDown) return;

      const dx = e.clientX - prevMousePos.x;
      const dy = e.clientY - prevMousePos.y;

      rotY += dx * 0.01;
      rotX += dy * 0.01;
      rotX = Math.max(-0.8, Math.min(1.0, rotX));

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

      if (!isMouseDown) autoRot += 0.0025;

      scatterGroup.rotation.y = rotY + autoRot;
      scatterGroup.rotation.x = rotX;

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
  }, [data, xField, yField]);

  return (
    <div className="relative w-full h-full min-h-[320px] select-none cursor-grab active:cursor-grabbing overflow-hidden rounded-xl bg-slate-950/80 border border-slate-800">
      <div ref={containerRef} className="w-full h-[320px]" />

      <div className="absolute top-2 left-3 text-[10px] text-sky-400 font-mono flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded border border-sky-500/30 backdrop-blur-md pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
        3D Spatial Point Cloud • Orbit & Pan
      </div>

      {hoveredPoint && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-sky-500/40 px-3 py-1.5 rounded-lg shadow-xl text-xs backdrop-blur-md text-white flex items-center gap-2 pointer-events-none">
          <span className="text-slate-400 font-semibold">{xField}:</span>
          <span className="font-bold text-sky-400">{hoveredPoint.xVal.toLocaleString()}</span>
          <span className="text-slate-400 font-semibold">{yField}:</span>
          <span className="font-bold text-emerald-400">{hoveredPoint.yVal.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};
