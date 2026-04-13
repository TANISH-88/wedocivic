"use client";

import { useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useGLTF, useKTX2 } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";

export default function Earth() {
  const earthRef = useRef<THREE.Group>(null);
  const cloudRef = useRef<THREE.Mesh>(null);

  const model = useGLTF("/models/earth.glb");

  const textures = useKTX2([
    "/models/TEXTURES/earth_normal.ktx2",
    "/models/TEXTURES/earth_diffuse_grade.ktx2",
    "/models/TEXTURES/earth_roughness.ktx2",
    "/models/TEXTURES/earth_clouds.ktx2",
  ]);

  const [earthNormalMap, earthMap, earthRoughnessMap, earthCloudMap] = textures.map((t) => {
    t.flipY = false;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });

  useThree(({ camera, gl }) => {
    camera.position.set(0, 0, 5);
    (camera as THREE.PerspectiveCamera).fov = 45;
    camera.updateProjectionMatrix();
    gl.toneMapping = THREE.ReinhardToneMapping;
    gl.toneMappingExposure = 0.9;
  });

  useEffect(() => {
    const mat = new THREE.MeshStandardMaterial({
      normalMap: earthNormalMap,
      map: earthMap,
      roughnessMap: earthRoughnessMap,
      roughness: 0.55,
      metalness: 0.5,
    });
    model.scene.traverse((child) => {
      if (child.name.toLowerCase().includes("earth")) {
        (child as THREE.Mesh).material = mat;
      }
    });
  }, [model, earthNormalMap, earthMap, earthRoughnessMap]);

  useEffect(() => {
    if (!earthRef.current) return;
    gsap.to(earthRef.current.rotation, {
      y: 0.15, duration: 8, ease: "sine.inOut", yoyo: true, repeat: -1,
    });
  }, []);

  useEffect(() => {
    if (!cloudRef.current) return;
    gsap.to(cloudRef.current.rotation, {
      y: "+=" + Math.PI * 2, duration: 200, ease: "none", repeat: -1,
    });
  }, []);

  return (
    <group ref={earthRef}>
      <primitive object={model.scene} position={[0, 0, 1.5]} />
      <mesh scale={1.02}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial color="#4fa3ff" transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>
      <mesh ref={cloudRef} position={[0, 0, 1.5]}>
        <sphereGeometry args={[1.01, 60, 60]} />
        <meshStandardMaterial color="white" alphaMap={earthCloudMap} transparent opacity={0.7} depthWrite={false} />
      </mesh>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={3} />
      <directionalLight position={[-3, 2, -3]} intensity={0.8} color="#6699ff" />
    </group>
  );
}

useGLTF.preload("/models/earth.glb");
