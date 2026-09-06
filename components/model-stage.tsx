"use client";

import { useEffect, useRef, useState } from "react";
import type { Model3D } from "@/data/portfolio";

type ModelStageProps = { models: readonly Model3D[] };

export function ModelStage({ models }: ModelStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const model = models[active];

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    let disposed = false;
    let cleanup = () => {};
    setStatus("loading");

    async function mountScene() {
      try {
        const THREE = await import("three");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
        if (disposed || !canvas || !stage) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
        camera.position.set(0, 0.35, 7.2);
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;

        const group = new THREE.Group();
        scene.add(group);
        scene.add(new THREE.HemisphereLight(0xf7f7f5, 0x4a4a45, 2.6));
        const key = new THREE.DirectionalLight(0xffffff, 4.4);
        key.position.set(4, 5, 5);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xffffff, 2.2);
        rim.position.set(-4, -1, 3);
        scene.add(rim);

        const material = new THREE.MeshStandardMaterial({ color: 0xb8b8b1, metalness: 0.78, roughness: 0.24 });
        const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x20201f, metalness: 0.45, roughness: 0.38 });

        if (model.src) {
          const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
          const gltf = await new GLTFLoader().loadAsync(model.src);
          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; }
          });
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const scale = 3.6 / Math.max(size.x, size.y, size.z);
          gltf.scene.position.sub(center);
          gltf.scene.scale.setScalar(scale);
          group.add(gltf.scene);
        } else if (model.variant === "fold") {
          for (let index = 0; index < 5; index += 1) {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.6 - index * 0.28, 0.22, 1.65 - index * 0.14), index % 2 ? darkMaterial : material);
            mesh.position.y = (index - 2) * 0.48;
            mesh.rotation.y = index * 0.23;
            mesh.rotation.z = (index - 2) * 0.05;
            group.add(mesh);
          }
        } else if (model.variant === "signal") {
          const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.25, 0.32, 180, 18, 2, 3), material);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.035, 12, 150), darkMaterial);
          ring.rotation.x = Math.PI / 2.4;
          group.add(knot, ring);
        } else {
          const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.55, 1), material);
          const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.055, 14, 180), darkMaterial);
          orbit.rotation.x = 1.08;
          orbit.rotation.y = 0.35;
          group.add(core, orbit);
        }

        const controls = new OrbitControls(camera, canvas);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.enableZoom = false;
        controls.enabled = !window.matchMedia("(pointer: coarse)").matches;
        controls.minDistance = 4.5;
        controls.maxDistance = 9;
        controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        controls.autoRotateSpeed = 0.7;

        let visible = true;
        const resize = () => {
          const { width, height } = stage.getBoundingClientRect();
          renderer.setSize(width, height, false);
          camera.aspect = width / Math.max(height, 1);
          camera.updateProjectionMatrix();
        };
        const resizeObserver = new ResizeObserver(resize);
        const visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
        resizeObserver.observe(stage);
        visibilityObserver.observe(stage);
        resize();

        renderer.setAnimationLoop(() => {
          if (!visible || document.hidden) return;
          controls.update();
          renderer.render(scene, camera);
        });
        setStatus("ready");

        cleanup = () => {
          resizeObserver.disconnect();
          visibilityObserver.disconnect();
          controls.dispose();
          renderer.setAnimationLoop(null);
          renderer.dispose();
          scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              object.geometry.dispose();
              const materials = Array.isArray(object.material) ? object.material : [object.material];
              materials.forEach((item) => item.dispose());
            }
          });
        };
      } catch { if (!disposed) setStatus("error"); }
    }

    void mountScene();
    return () => { disposed = true; cleanup(); };
  }, [model]);

  return <figure className="model-shell">
    <div className="model-toolbar"><div><span>Không gian 3D</span><strong>{model.name}</strong></div><span>Kéo để xoay</span></div>
    <div ref={stageRef} className="model-stage">
      <canvas ref={canvasRef} aria-label={`Mô hình 3D ${model.name}: ${model.caption}`} />
      {status === "loading" && <output className="model-status">Đang tải không gian 3D…</output>}
      {status === "error" && <output className="model-status">Không thể hiển thị 3D trên thiết bị này.</output>}
    </div>
    <figcaption>
      <fieldset className="model-tabs"><legend className="sr-only">Chọn mô hình 3D</legend>
        {models.map((item, index) => <button key={item.name} type="button" aria-pressed={active === index} onClick={() => setActive(index)}><span>0{index + 1}</span>{item.name}</button>)}
      </fieldset>
      <p>{model.caption}</p>
    </figcaption>
  </figure>;
}
