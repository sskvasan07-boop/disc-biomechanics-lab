import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";

interface SpineSceneProps {
  axialLoad: number;
  flexionAngle: number;
  discHealth: "healthy" | "mild" | "severe";
}

function Vertebra({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Main vertebral body */}
      <mesh>
        <cylinderGeometry args={[1.2, 1.3, 0.8, 32]} />
        <meshStandardMaterial color="#d4d4cc" roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Spinous process */}
      <mesh position={[0, 0.1, -0.9]}>
        <boxGeometry args={[0.15, 0.5, 0.8]} />
        <meshStandardMaterial color="#c8c8c0" roughness={0.7} />
      </mesh>
      {/* Transverse processes */}
      <mesh position={[1.1, 0, -0.3]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.6, 0.2, 0.15]} />
        <meshStandardMaterial color="#c8c8c0" roughness={0.7} />
      </mesh>
      <mesh position={[-1.1, 0, -0.3]} rotation={[0, -0.3, 0]}>
        <boxGeometry args={[0.6, 0.2, 0.15]} />
        <meshStandardMaterial color="#c8c8c0" roughness={0.7} />
      </mesh>
      {/* Endplate ring */}
      <mesh position={[0, -0.4, 0]}>
        <torusGeometry args={[1.0, 0.08, 8, 32]} />
        <meshStandardMaterial color="#b0b0a8" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Disc({
  axialLoad,
  flexionAngle,
  discHealth,
}: {
  axialLoad: number;
  flexionAngle: number;
  discHealth: "healthy" | "mild" | "severe";
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const nucleusRef = useRef<THREE.Mesh>(null);

  const compression = axialLoad / 2000;
  const bulge = 1 + compression * 0.3;
  const heightScale = 1 - compression * 0.25;

  const discColor = useMemo(() => {
    switch (discHealth) {
      case "healthy": return "#00c896";
      case "mild": return "#d4a020";
      case "severe": return "#c84040";
    }
  }, [discHealth]);

  const nucleusColor = useMemo(() => {
    switch (discHealth) {
      case "healthy": return "#40e0d0";
      case "mild": return "#e0c050";
      case "severe": return "#e06060";
    }
  }, [discHealth]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.set(bulge, heightScale, bulge);
      meshRef.current.rotation.x = THREE.MathUtils.degToRad(flexionAngle * 0.5);
    }
    if (nucleusRef.current) {
      nucleusRef.current.scale.set(bulge * 1.05, heightScale * 0.9, bulge * 1.05);
      nucleusRef.current.rotation.x = THREE.MathUtils.degToRad(flexionAngle * 0.5);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Annulus fibrosus */}
      <mesh ref={meshRef}>
        <cylinderGeometry args={[1.15, 1.15, 0.5, 32]} />
        <meshStandardMaterial
          color={discColor}
          roughness={0.4}
          metalness={0.1}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Nucleus pulposus */}
      <mesh ref={nucleusRef}>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial
          color={nucleusColor}
          roughness={0.3}
          metalness={0.2}
          transparent
          opacity={0.6}
          emissive={nucleusColor}
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
  );
}

function SpineModel({ axialLoad, flexionAngle, discHealth }: SpineSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const angleRad = THREE.MathUtils.degToRad(flexionAngle);
  const compression = axialLoad / 2000;

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Upper vertebra */}
      <Vertebra
        position={[0, 0.65 - compression * 0.12, Math.sin(angleRad) * 0.15]}
        rotation={[angleRad * 0.5, 0, 0]}
      />
      {/* Disc */}
      <Disc axialLoad={axialLoad} flexionAngle={flexionAngle} discHealth={discHealth} />
      {/* Lower vertebra */}
      <Vertebra
        position={[0, -0.65 + compression * 0.12, -Math.sin(angleRad) * 0.15]}
        rotation={[-angleRad * 0.5, 0, 0]}
      />
    </group>
  );
}

export default function SpineScene({ axialLoad, flexionAngle, discHealth }: SpineSceneProps) {
  return (
    <Canvas
      camera={{ position: [3, 2, 4], fov: 40 }}
      style={{ background: "transparent" }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" />
      <directionalLight position={[-3, 2, -3]} intensity={0.3} color="#00d4ff" />
      <pointLight position={[0, 0, 3]} intensity={0.5} color="#00d4ff" distance={10} />
      <SpineModel axialLoad={axialLoad} flexionAngle={flexionAngle} discHealth={discHealth} />
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={8}
        autoRotate={false}
      />
      <Environment preset="studio" />
    </Canvas>
  );
}
