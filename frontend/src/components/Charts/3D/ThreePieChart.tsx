import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface ThreePieChartProps {
  data: any[];
  nameField?: string;
  valueField?: string;
}

export const ThreePieChart: React.FC<ThreePieChartProps> = ({
  data,
  nameField = "name",
  valueField = "value",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredInfo, setHoveredInfo] = useState<{ name: string; value: number; pct: string } | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 340;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x60a5fa, 1.5);
    dirLight.position.set(15, 30, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xa78bfa, 1, 50);
    pointLight.position.set(-10, 15, -10);
    scene.add(pointLight);

    const colors = [
      0x3b82f6, 0x8b5cf6, 0xec4899, 0x10b981, 0xf59e0b, 0x06b6d4, 0x6366f1, 0x14b8a6,
    ];

    const totalValue = data.reduce((acc, curr) => acc + (Number(curr[valueField]) || 0), 0) || 1;

    const pieGroup = new THREE.Group();
    scene.add(pieGroup);

    const extrudeSettings = {
      depth: 1.2,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.1,
      bevelThickness: 0.1,
    };

    let startAngle = 0;
    const meshes: THREE.Mesh[] = [];

    data.slice(0, 10).forEach((item, index) => {
      const val = Number(item[valueField]) || 0;
      const angle = (val / totalValue) * Math.PI * 2;
      if (angle <= 0.001) return;

      const innerRadius = 1.8;
      const outerRadius = 3.8;

      const shape = new THREE.Shape();
      shape.absarc(0, 0, outerRadius, startAngle, startAngle + angle, false);
      shape.absarc(0, 0, innerRadius, startAngle + angle, startAngle, true);

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      const colorHex = colors[index % colors.length];

      const material = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.15,
        metalness: 0.3,
        emissive: colorHex,
        emissiveIntensity: 0.1,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const pctStr = ((val / totalValue) * 100).toFixed(1) + "%";

      mesh.userData = {
        name: String(item[nameField] || `Item ${index + 1}`),
        val,
        pctStr,
        midAngle: startAngle + angle / 2,
      };

      pieGroup.add(mesh);
      meshes.push(mesh);

      startAngle += angle;
    });

    camera.position.set(0, 8, 12);
    camera.lookAt(0, 0, 0);

    let isMouseDown = false;
    let previousMousePosition = { x: 0, y: 0 };
    let rotationY = 0;
    let rotationX = 0;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      isMouseDown = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const uData = hitMesh.userData;
        setHoveredInfo({
          name: uData.name,
          value: uData.val,
          pct: uData.pctStr,
        });

        meshes.forEach((m) => {
          (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.1;
          m.position.set(0, 0, 0);
        });

        (hitMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6;
        // Pop slice slightly outward
        const dx = Math.cos(uData.midAngle) * 0.3;
        const dz = -Math.sin(uData.midAngle) * 0.3;
        hitMesh.position.set(dx, 0, dz);
      } else {
        if (!isMouseDown) {
          setHoveredInfo(null);
          meshes.forEach((m) => {
            (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.1;
            m.position.set(0, 0, 0);
          });
        }
      }

      if (!isMouseDown) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      rotationY += deltaX * 0.01;
      rotationX += deltaY * 0.01;
      rotationX = Math.max(-0.6, Math.min(1.0, rotationX));

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isMouseDown = false;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    let animId: number;
    let autoRot = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isMouseDown) autoRot += 0.003;

      pieGroup.rotation.y = rotationY + autoRot;
      pieGroup.rotation.x = rotationX;

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

    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      domElem.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      resizeObs.disconnect();
      renderer.dispose();
      scene.clear();
    };
  }, [data, nameField, valueField]);

  return (
    <div className="relative w-full h-full min-h-[320px] select-none cursor-grab active:cursor-grabbing overflow-hidden rounded-xl bg-slate-950/80 border border-slate-800">
      <div ref={containerRef} className="w-full h-[320px]" />

      <div className="absolute top-2 left-3 text-[10px] text-indigo-400 font-mono flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded border border-indigo-500/30 backdrop-blur-md pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
        3D Donut Cylinder • Drag to Rotate
      </div>

      {hoveredInfo && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-indigo-500/40 px-3 py-1.5 rounded-lg shadow-xl text-xs backdrop-blur-md text-white flex items-center gap-2 pointer-events-none">
          <span className="text-slate-400 font-semibold">{hoveredInfo.name}:</span>
          <span className="font-bold text-indigo-400">{hoveredInfo.value.toLocaleString()}</span>
          <span className="text-emerald-400 font-bold">({hoveredInfo.pct})</span>
        </div>
      )}
    </div>
  );
};
