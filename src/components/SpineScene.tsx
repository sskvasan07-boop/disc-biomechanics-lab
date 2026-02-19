import { useRef, useMemo, useEffect, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { createDiscGeometry, updateFEAMesh, type FEAParams } from "@/lib/feaMesh";

interface SpineSceneProps {
  axialLoad: number;
  flexionAngle: number;
  discHealth: "healthy" | "mild" | "severe";
  onPeakStressChange?: (stress: number) => void;
}

function Vertebra({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <cylinderGeometry args={[1.2, 1.3, 0.8, 32]} />
        <meshStandardMaterial color="#d4d4cc" roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.1, -0.9]}>
        <boxGeometry args={[0.15, 0.5, 0.8]} />
        <meshStandardMaterial color="#c8c8c0" roughness={0.7} />
      </mesh>
      <mesh position={[1.1, 0, -0.3]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.6, 0.2, 0.15]} />
        <meshStandardMaterial color="#c8c8c0" roughness={0.7} />
      </mesh>
      <mesh position={[-1.1, 0, -0.3]} rotation={[0, -0.3, 0]}>
        <boxGeometry args={[0.6, 0.2, 0.15]} />
        <meshStandardMaterial color="#c8c8c0" roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.4, 0]}>
        <torusGeometry args={[1.0, 0.08, 8, 32]} />
        <meshStandardMaterial color="#b0b0a8" roughness={0.5} />
      </mesh>
    </group>
  );
}

function FEADisc({
  axialLoad,
  flexionAngle,
  discHealth,
  onPeakStress,
}: {
  axialLoad: number;
  flexionAngle: number;
  discHealth: "healthy" | "mild" | "severe";
  onPeakStress: (stress: number) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.LineSegments>(null);
  const originalPositions = useRef<Float32Array | null>(null);

  const geometry = useMemo(() => createDiscGeometry(), []);

  // Store original positions on first render
  useEffect(() => {
    const posArr = geometry.attributes.position.array as Float32Array;
    originalPositions.current = new Float32Array(posArr);
  }, [geometry]);

  // Wireframe geometry derived from main geometry
  const wireGeometry = useMemo(() => {
    return new THREE.WireframeGeometry(geometry);
  }, [geometry]);

  useFrame(() => {
    if (!originalPositions.current) return;

    const params: FEAParams = { axialLoad, flexionAngle, discHealth };
    const result = updateFEAMesh(geometry, originalPositions.current, params);
    onPeakStress(result.peakVonMises);

    // Update wireframe to match deformed geometry
    if (wireRef.current) {
      wireRef.current.geometry.dispose();
      wireRef.current.geometry = new THREE.WireframeGeometry(geometry);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Solid FEA mesh with vertex colors */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          roughness={0.4}
          metalness={0.1}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Wireframe overlay */}
      <lineSegments ref={wireRef} geometry={wireGeometry}>
        <lineBasicMaterial
          color="hsl(190, 100%, 50%)"
          transparent
          opacity={0.12}
          linewidth={1}
        />
      </lineSegments>
    </group>
  );
}

function SpineModel({ axialLoad, flexionAngle, discHealth, onPeakStress }: SpineSceneProps & { onPeakStress: (s: number) => void }) {
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
      <Vertebra
        position={[0, 0.65 - compression * 0.12, Math.sin(angleRad) * 0.15]}
        rotation={[angleRad * 0.5, 0, 0]}
      />
      <FEADisc
        axialLoad={axialLoad}
        flexionAngle={flexionAngle}
        discHealth={discHealth}
        onPeakStress={onPeakStress}
      />
      <Vertebra
        position={[0, -0.65 + compression * 0.12, -Math.sin(angleRad) * 0.15]}
        rotation={[-angleRad * 0.5, 0, 0]}
      />
    </group>
  );
}

export default function SpineScene({ axialLoad, flexionAngle, discHealth, onPeakStressChange }: SpineSceneProps) {
  const stressRef = useRef(0);
  const frameCount = useRef(0);

  const handlePeakStress = useCallback((stress: number) => {
    // Throttle callback to avoid excessive re-renders
    stressRef.current = stress;
    frameCount.current++;
    if (frameCount.current % 15 === 0 && onPeakStressChange) {
      onPeakStressChange(stress);
    }
  }, [onPeakStressChange]);

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
      <SpineModel
        axialLoad={axialLoad}
        flexionAngle={flexionAngle}
        discHealth={discHealth}
        onPeakStress={handlePeakStress}
      />
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
