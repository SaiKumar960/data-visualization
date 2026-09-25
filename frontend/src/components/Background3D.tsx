import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export const SCENE_NAMES = [
  "Harmonic Wavefield",
  "Cosmic Warp Tunnel",
  "Polyhedron Constellation",
  "DNA Double Helix",
  "Synthwave Grid Terrain",
  "Quantum Swarm Vortex",
  "Digital Data Rain",
  "Floating Cube Field",
] as const;

export type SceneIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface Background3DProps {
  theme: "dark" | "light";
  activeSceneIndex?: number;
  onSceneChange?: (index: number) => void;
}

export const Background3D: React.FC<Background3DProps> = ({
  theme,
  activeSceneIndex = 0,
  onSceneChange,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [currentScene, setCurrentScene] = useState<number>(activeSceneIndex);

  useEffect(() => {
    setCurrentScene(activeSceneIndex);
  }, [activeSceneIndex]);

  // 30-Second Auto Cycle Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentScene((prev) => {
        const next = (prev + 1) % SCENE_NAMES.length;
        if (onSceneChange) onSceneChange(next);
        return next;
      });
    }, 30000);

    return () => clearInterval(timer);
  }, [onSceneChange]);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 0, 45);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const isDark = theme === "dark";
    const opacityMult = isDark ? 1.0 : 0.65;

    // Palette per theme
    const neonColors = isDark
      ? [0xd946ef, 0xa855f7, 0x38bdf8, 0xc084fc, 0xec4899]
      : [0x2563eb, 0x7c3aed, 0x0284c7, 0x059669, 0xd97706];

    const group = new THREE.Group();
    scene.add(group);

    let updateFrame: (clock: number, mouseX: number, mouseY: number) => void = () => {};

    // ----------------------------------------------------
    // SCENE GENERATORS
    // ----------------------------------------------------

    switch (currentScene) {
      // SCENE 0: Harmonic Wavefield
      case 0: {
        const NUM_STRANDS = 18;
        const POINTS_PER_STRAND = 80;
        const strandGeos: THREE.BufferGeometry[] = [];
        const strandPos: Float32Array[] = [];

        for (let s = 0; s < NUM_STRANDS; s++) {
          const positions = new Float32Array(POINTS_PER_STRAND * 3);
          const geo = new THREE.BufferGeometry();
          geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

          const mat = new THREE.LineBasicMaterial({
            color: neonColors[s % neonColors.length],
            transparent: true,
            opacity: (isDark ? 0.85 : 0.5) * opacityMult,
            blending: THREE.AdditiveBlending,
          });

          const line = new THREE.Line(geo, mat);
          group.add(line);
          strandGeos.push(geo);
          strandPos.push(positions);
        }

        updateFrame = (clock, mX, mY) => {
          group.rotation.y = mX * 0.3 + Math.sin(clock * 0.2) * 0.1;
          group.rotation.x = -mY * 0.2;

          for (let s = 0; s < NUM_STRANDS; s++) {
            const pos = strandPos[s];
            const offset = s * 0.35;
            for (let p = 0; p < POINTS_PER_STRAND; p++) {
              const t = p / POINTS_PER_STRAND;
              const x = (t - 0.5) * 60;
              const waveY =
                Math.sin(t * 8 + clock * 1.5 + offset) * 4 +
                Math.cos(t * 4 - clock * 0.8 + offset) * 3;
              const waveZ = Math.cos(t * 6 + clock * 1.2 + offset) * 8;

              pos[p * 3] = x;
              pos[p * 3 + 1] = waveY + (s - NUM_STRANDS / 2) * 0.6;
              pos[p * 3 + 2] = waveZ;
            }
            strandGeos[s].attributes.position.needsUpdate = true;
          }
        };
        break;
      }

      // SCENE 1: Cosmic Warp Tunnel
      case 1: {
        const PARTICLE_COUNT = 600;
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const origZ = new Float32Array(PARTICLE_COUNT);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 6 + Math.random() * 18;
          positions[i * 3] = Math.cos(angle) * radius;
          positions[i * 3 + 1] = Math.sin(angle) * radius;
          const z = (Math.random() - 0.5) * 100;
          positions[i * 3 + 2] = z;
          origZ[i] = z;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
          color: neonColors[0],
          size: 0.6,
          transparent: true,
          opacity: 0.8 * opacityMult,
          blending: THREE.AdditiveBlending,
        });

        const tunnelParticles = new THREE.Points(geo, mat);
        group.add(tunnelParticles);

        updateFrame = (clock, _mX, _mY) => {
          group.rotation.z = clock * 0.1;
          const pos = geo.attributes.position.array as Float32Array;
          for (let i = 0; i < PARTICLE_COUNT; i++) {
            pos[i * 3 + 2] += 0.8;
            if (pos[i * 3 + 2] > 40) pos[i * 3 + 2] = -60;
          }
          geo.attributes.position.needsUpdate = true;
        };
        break;
      }

      // SCENE 2: Polyhedron Constellation
      case 2: {
        const polyGroup = new THREE.Group();
        group.add(polyGroup);

        const geos = [
          new THREE.IcosahedronGeometry(2.5, 1),
          new THREE.OctahedronGeometry(2.2, 0),
          new THREE.DodecahedronGeometry(2.0, 0),
        ];

        for (let i = 0; i < 9; i++) {
          const mat = new THREE.MeshBasicMaterial({
            color: neonColors[i % neonColors.length],
            wireframe: true,
            transparent: true,
            opacity: 0.5 * opacityMult,
          });

          const mesh = new THREE.Mesh(geos[i % geos.length], mat);
          mesh.position.set(
            (Math.random() - 0.5) * 45,
            (Math.random() - 0.5) * 25,
            (Math.random() - 0.5) * 30
          );
          polyGroup.add(mesh);
        }

        updateFrame = (clock, mX, _mY) => {
          polyGroup.rotation.y = clock * 0.1 + mX * 0.2;
          polyGroup.children.forEach((c, idx) => {
            c.rotation.x += 0.008 * (idx % 2 === 0 ? 1 : -1);
            c.rotation.y += 0.01;
          });
        };
        break;
      }

      // SCENE 3: DNA Double Helix
      case 3: {
        const HELIX_NODES = 60;
        const helixGroup = new THREE.Group();
        group.add(helixGroup);

        const sphereGeo = new THREE.SphereGeometry(0.35, 8, 8);
        const strand1Meshes: THREE.Mesh[] = [];
        const strand2Meshes: THREE.Mesh[] = [];

        for (let i = 0; i < HELIX_NODES; i++) {
          const mat1 = new THREE.MeshBasicMaterial({ color: neonColors[0] });
          const mat2 = new THREE.MeshBasicMaterial({ color: neonColors[2] });

          const m1 = new THREE.Mesh(sphereGeo, mat1);
          const m2 = new THREE.Mesh(sphereGeo, mat2);

          helixGroup.add(m1);
          helixGroup.add(m2);

          strand1Meshes.push(m1);
          strand2Meshes.push(m2);
        }

        updateFrame = (clock, mX, _mY) => {
          helixGroup.rotation.y = clock * 0.3 + mX * 0.3;
          helixGroup.rotation.z = 0.2;

          for (let i = 0; i < HELIX_NODES; i++) {
            const y = (i - HELIX_NODES / 2) * 0.7;
            const angle = i * 0.25 + clock * 1.2;
            const radius = 4.5;

            strand1Meshes[i].position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
            strand2Meshes[i].position.set(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius);
          }
        };
        break;
      }

      // SCENE 4: Synthwave Grid Terrain
      case 4: {
        const gridFloor = new THREE.GridHelper(90, 30, neonColors[0], isDark ? 0x1e1b4b : 0xc7d2fe);
        gridFloor.position.y = -10;
        gridFloor.rotation.x = 0.1;
        group.add(gridFloor);

        updateFrame = (clock, mX, _mY) => {
          gridFloor.position.z = (clock * 4) % 3;
          group.rotation.y = mX * 0.2;
        };
        break;
      }

      // SCENE 5: Quantum Swarm Vortex
      case 5: {
        const COUNT = 800;
        const pos = new Float32Array(COUNT * 3);

        for (let i = 0; i < COUNT; i++) {
          const r = Math.random() * 20 + 2;
          const theta = Math.random() * Math.PI * 2;
          pos[i * 3] = Math.cos(theta) * r;
          pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
          pos[i * 3 + 2] = Math.sin(theta) * r;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

        const mat = new THREE.PointsMaterial({
          color: neonColors[1],
          size: 0.5,
          transparent: true,
          opacity: 0.8 * opacityMult,
          blending: THREE.AdditiveBlending,
        });

        const swarm = new THREE.Points(geo, mat);
        group.add(swarm);

        updateFrame = (clock, _mX, mY) => {
          swarm.rotation.y = clock * 0.4;
          swarm.rotation.x = mY * 0.2;
        };
        break;
      }

      // SCENE 6: Digital Data Rain
      case 6: {
        const COLS = 40;
        const DROPS_PER_COL = 10;
        const pos = new Float32Array(COLS * DROPS_PER_COL * 3);

        let idx = 0;
        for (let c = 0; c < COLS; c++) {
          const x = (c - COLS / 2) * 1.5;
          for (let d = 0; d < DROPS_PER_COL; d++) {
            pos[idx] = x;
            pos[idx + 1] = (Math.random() - 0.5) * 40;
            pos[idx + 2] = (Math.random() - 0.5) * 20;
            idx += 3;
          }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

        const mat = new THREE.PointsMaterial({
          color: neonColors[2],
          size: 0.45,
          transparent: true,
          opacity: 0.75 * opacityMult,
          blending: THREE.AdditiveBlending,
        });

        const rain = new THREE.Points(geo, mat);
        group.add(rain);

        updateFrame = (_clock, mX, _mY) => {
          const array = geo.attributes.position.array as Float32Array;
          for (let i = 1; i < array.length; i += 3) {
            array[i] -= 0.5;
            if (array[i] < -20) array[i] = 20;
          }
          geo.attributes.position.needsUpdate = true;
          group.rotation.y = mX * 0.2;
        };
        break;
      }

      // SCENE 7: Floating Cube Field
      case 7: {
        const cubeGroup = new THREE.Group();
        group.add(cubeGroup);

        const cubeGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        const cubes: THREE.Mesh[] = [];

        for (let x = -4; x <= 4; x++) {
          for (let z = -4; z <= 4; z++) {
            const mat = new THREE.MeshBasicMaterial({
              color: neonColors[(Math.abs(x) + Math.abs(z)) % neonColors.length],
              wireframe: true,
              transparent: true,
              opacity: 0.6 * opacityMult,
            });

            const mesh = new THREE.Mesh(cubeGeo, mat);
            mesh.position.set(x * 3.5, 0, z * 3.5);
            mesh.userData = { origX: x, origZ: z };
            cubeGroup.add(mesh);
            cubes.push(mesh);
          }
        }

        updateFrame = (clock, mX, mY) => {
          cubeGroup.rotation.y = clock * 0.15 + mX * 0.2;
          cubeGroup.rotation.x = 0.3 + mY * 0.1;

          cubes.forEach((cube) => {
            const u = cube.userData;
            cube.position.y = Math.sin(clock * 2 + u.origX * 0.5 + u.origZ * 0.5) * 2;
          });
        };
        break;
      }
    }

    // Mouse Tracking
    let targetMX = 0;
    let targetMY = 0;
    let mX = 0;
    let mY = 0;

    const onPointerMove = (e: MouseEvent) => {
      targetMX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener("mousemove", onPointerMove);

    // Main Render Loop
    let clock = 0;
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      clock += 0.015;
      mX += (targetMX - mX) * 0.05;
      mY += (targetMY - mY) * 0.05;

      updateFrame(clock, mX, mY);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      scene.clear();
    };
  }, [theme, currentScene]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden transition-opacity duration-700"
    />
  );
};
