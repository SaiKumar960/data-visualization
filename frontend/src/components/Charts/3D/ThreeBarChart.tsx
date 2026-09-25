import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface ThreeBarChartProps {
  data: any[];
  xField: string;
  yField: string;
  chartType?: string;
}

export const ThreeBarChart: React.FC<ThreeBarChartProps> = ({
  data,
  xField,
  yField,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredInfo, setHoveredInfo] = useState<{ x: string; y: number; label?: string } | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 340;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x60a5fa, 1.2);
    dirLight1.position.set(20, 40, 30);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa78bfa, 0.8);
    dirLight2.position.set(-20, -20, -20);
    scene.add(dirLight2);

    // Vibrant Color Palette
    const colors = [
      0x3b82f6, // Blue
      0x8b5cf6, // Violet
      0xec4899, // Pink
      0x10b981, // Emerald
      0xf59e0b, // Amber
      0x06b6d4, // Cyan
      0x6366f1, // Indigo
      0xf43f5e, // Rose
    ];

    // Compute Y max
    let maxY = 1;
    data.forEach((item) => {
      const val = Number(item[yField]) || 0;
      if (val > maxY) maxY = val;
    });

    const itemCount = data.length;
    const barWidth = 1.2;
    const barDepth = 1.2;
    const spacing = 0.5;
    const totalLength = itemCount * (barWidth + spacing);
    const startX = -totalLength / 2 + barWidth / 2;

    const barGroup = new THREE.Group();
    scene.add(barGroup);

    // Base Grid Floor
    const gridHelper = new THREE.GridHelper(Math.max(totalLength + 4, 15), 10, 0x3b82f6, 0x334155);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    const meshes: THREE.Mesh[] = [];

    // Create 3D Bars
    data.forEach((item, index) => {
      const rawVal = Number(item[yField]) || 0;
      const normalizedHeight = Math.max((rawVal / maxY) * 8, 0.2);

      const geometry = new THREE.BoxGeometry(barWidth, normalizedHeight, barDepth);
      // Chamfer look by shifting geometry origin to bottom
      geometry.translate(0, normalizedHeight / 2, 0);

      const colorHex = colors[index % colors.length];
      const material = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.2,
        metalness: 0.4,
        emissive: colorHex,
        emissiveIntensity: 0.1,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(startX + index * (barWidth + spacing), 0, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Store data info on mesh
      mesh.userData = {
        xVal: String(item[xField] ?? index),
        yVal: rawVal,
        colorHex,
      };

      barGroup.add(mesh);
      meshes.push(mesh);
    });

    // Camera setup
    camera.position.set(0, 10, 18);
    camera.lookAt(0, 3, 0);

    // Mouse Controls (Orbit Rotation & Raycasting Hover)
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

      // Raycast hover check
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const dataInfo = hitMesh.userData;
        setHoveredInfo({
          x: dataInfo.xVal,
          y: dataInfo.yVal,
          label: xField,
        });

        meshes.forEach((m) => {
          (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.1;
        });
        (hitMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6;
      } else {
        if (!isMouseDown) {
          setHoveredInfo(null);
          meshes.forEach((m) => {
            (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.1;
          });
        }
      }

      if (!isMouseDown) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      rotationY += deltaX * 0.01;
      rotationX += deltaY * 0.01;

      // Clamp X rotation
      rotationX = Math.max(-0.5, Math.min(1.2, rotationX));

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isMouseDown = false;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // Animation Loop
    let animationFrameId: number;
    let autoRotate = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isMouseDown) {
        autoRotate += 0.003;
      }

      barGroup.rotation.y = rotationY + autoRotate;
      barGroup.rotation.x = rotationX;

      renderer.render(scene, camera);
    };

    animate();

    // Resize handling
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      resizeObserver.disconnect();
      renderer.dispose();
      scene.clear();
    };
  }, [data, xField, yField]);

  return (
    <div className="relative w-full h-full min-h-[320px] select-none cursor-grab active:cursor-grabbing overflow-hidden rounded-xl bg-slate-950/80 border border-slate-800">
      <div ref={containerRef} className="w-full h-[320px]" />

      <div className="absolute top-2 left-3 text-[10px] text-blue-400 font-mono flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded border border-blue-500/30 backdrop-blur-md pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        3D WebGL Engine • Drag to Rotate 360°
      </div>

      {hoveredInfo && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-blue-500/40 px-3 py-1.5 rounded-lg shadow-xl text-xs backdrop-blur-md text-white flex items-center gap-2 pointer-events-none">
          <span className="text-slate-400 font-semibold">{hoveredInfo.label}:</span>
          <span className="font-bold text-blue-400">{hoveredInfo.x}</span>
          <span className="text-slate-400 font-semibold">Value:</span>
          <span className="font-bold text-emerald-400">{hoveredInfo.y.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};
