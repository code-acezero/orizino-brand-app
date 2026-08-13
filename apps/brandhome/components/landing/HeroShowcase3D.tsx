"use client";
import React, { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, MeshDistortMaterial, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { useWebGLAvailable } from "@/hooks/use-webgl-available";
import { useEffectivePerf } from "@/hooks/use-perf-settings";

function Orb() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.25;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.15;
  });
  return (
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={1.2}>
      <mesh ref={ref} scale={1.6}>
        <icosahedronGeometry args={[1, 6]} />
        <MeshDistortMaterial
          color="#1f2937"
          roughness={0.15}
          metalness={0.9}
          distort={0.32}
          speed={1.4}
          envMapIntensity={1.4}
        />
      </mesh>
    </Float>
  );
}

/** Lazy-loaded 3D hero showcase. Skips rendering if WebGL is unavailable (e.g. sandboxed previews). */
const HeroShowcase3D: React.FC<{ className?: string }> = ({ className = "" }) => {
  const webgl = useWebGLAvailable();
  const { disable3D } = useEffectivePerf();
  const [failed, setFailed] = useState(false);
  if (disable3D || webgl === null || webgl === false || failed) return null;
  return (
    <div className={`w-full h-full ${className}`} aria-hidden="true">
      <Canvas
        dpr={[1, 1.6]}
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", failIfMajorPerformanceCaveat: true }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", () => setFailed(true), { once: true });
        }}
        fallback={null}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.35} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} color="#fef3c7" />
          <pointLight position={[-5, -3, -2]} intensity={2} color="#60a5fa" />
          <Orb />
          <ContactShadows position={[0, -2, 0]} opacity={0.5} scale={8} blur={2.4} far={4} />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default HeroShowcase3D;
// code:4ce0
