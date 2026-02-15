import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";

type Activity = "standing" | "walking" | "weightlifting";

interface HumanoidSceneProps {
  axialLoad: number;
  flexionAngle: number;
  herniationRisk: number;
  activity: Activity;
}

/* ── Limb helper ── */
function Limb({
  position,
  rotation,
  length,
  width = 0.12,
  color,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  length: number;
  width?: number;
  color: string;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <capsuleGeometry args={[width, length, 8, 16]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.15} />
    </mesh>
  );
}

/* ── Joint sphere ── */
function Joint({ position, color, size = 0.1 }: { position: [number, number, number]; color: string; size?: number }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
    </mesh>
  );
}

/* ── Heatmap lower-back patch ── */
function LowerBackHeatmap({ risk, flexionAngle }: { risk: number; flexionAngle: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const color = useMemo(() => {
    const t = Math.min(1, risk / 100);
    const r = Math.round(40 + t * 215);
    const g = Math.round(200 - t * 160);
    const b = Math.round(100 - t * 60);
    return `rgb(${r},${g},${b})`;
  }, [risk]);

  const emissiveIntensity = useMemo(() => 0.1 + (risk / 100) * 0.6, [risk]);

  return (
    <mesh
      ref={meshRef}
      position={[0, 0.05, -0.18]}
      rotation={[THREE.MathUtils.degToRad(flexionAngle * 0.3), 0, 0]}
    >
      <sphereGeometry args={[0.22, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ── Barbell ── */
function Barbell({ load }: { load: number }) {
  const plateWidth = 0.02 + (load / 2000) * 0.06;
  return (
    <group>
      {/* Bar */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 1.6, 16]} />
        <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Plates */}
      {[-0.65, 0.65].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, plateWidth, 16]} />
          <meshStandardMaterial color="#333333" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Backpack ── */
function Backpack({ load }: { load: number }) {
  const size = 0.15 + (load / 2000) * 0.12;
  return (
    <mesh position={[0, 0.2, -0.25]}>
      <boxGeometry args={[0.3, size * 2, 0.18]} />
      <meshStandardMaterial color="#445566" roughness={0.7} metalness={0.1} />
    </mesh>
  );
}

/* ── Humanoid model ── */
function HumanoidModel({
  axialLoad,
  flexionAngle,
  herniationRisk,
  activity,
}: HumanoidSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  const skinColor = "#c8a882";
  const clothColor = "#2a4a6b";
  const shoeColor = "#333340";

  useFrame((_, delta) => {
    timeRef.current += delta;

    if (groupRef.current) {
      groupRef.current.rotation.y = Math.PI * 0.1; // slight angle for better view
    }
  });

  // Walking animation cycle
  const walkPhase = activity === "walking" ? Math.sin(timeRef.current * 4) : 0;
  const walkLean = activity === "walking" ? THREE.MathUtils.degToRad(3 + (axialLoad / 2000) * 8) : 0;

  // Flexion from slider
  const spineFlexion = THREE.MathUtils.degToRad(flexionAngle * 0.6);

  // Weightlifting lean
  const liftLean = activity === "weightlifting" ? THREE.MathUtils.degToRad(12) : 0;

  const totalLean = spineFlexion + walkLean + liftLean;

  // Leg angles
  const leftLegAngle = activity === "walking" ? walkPhase * 0.5 : 0;
  const rightLegAngle = activity === "walking" ? -walkPhase * 0.5 : 0;
  const liftKneeBend = activity === "weightlifting" ? 0.3 : 0;

  // Arm positions
  const leftArmAngle = activity === "walking" ? -walkPhase * 0.4 : activity === "weightlifting" ? -0.3 : 0.1;
  const rightArmAngle = activity === "walking" ? walkPhase * 0.4 : activity === "weightlifting" ? -0.3 : 0.1;

  return (
    <group ref={groupRef}>
      {/* Body group - leans forward */}
      <group rotation={[totalLean, 0, 0]}>
        {/* Head */}
        <Joint position={[0, 1.65, 0]} color={skinColor} size={0.14} />

        {/* Neck */}
        <Limb position={[0, 1.48, 0]} length={0.08} width={0.06} color={skinColor} />

        {/* Torso upper */}
        <Limb position={[0, 1.2, 0]} length={0.25} width={0.18} color={clothColor} />

        {/* Torso lower (abdomen) */}
        <Limb position={[0, 0.85, 0]} length={0.15} width={0.16} color={clothColor} />

        {/* Lower back heatmap */}
        <group position={[0, 0.75, 0]}>
          <LowerBackHeatmap risk={herniationRisk} flexionAngle={flexionAngle} />
        </group>

        {/* Pelvis */}
        <Limb position={[0, 0.65, 0]} length={0.08} width={0.17} color={clothColor} />

        {/* Shoulders */}
        <Joint position={[-0.28, 1.35, 0]} color={clothColor} size={0.08} />
        <Joint position={[0.28, 1.35, 0]} color={clothColor} size={0.08} />

        {/* Left Arm */}
        <group position={[-0.28, 1.35, 0]} rotation={[leftArmAngle, 0, 0.15]}>
          <Limb position={[0, -0.18, 0]} length={0.2} width={0.055} color={clothColor} />
          <Joint position={[0, -0.35, 0]} color={skinColor} size={0.05} />
          <Limb position={[0, -0.5, 0]} length={0.18} width={0.045} color={skinColor} />
        </group>

        {/* Right Arm */}
        <group position={[0.28, 1.35, 0]} rotation={[rightArmAngle, 0, -0.15]}>
          <Limb position={[0, -0.18, 0]} length={0.2} width={0.055} color={clothColor} />
          <Joint position={[0, -0.35, 0]} color={skinColor} size={0.05} />
          <Limb position={[0, -0.5, 0]} length={0.18} width={0.045} color={skinColor} />
        </group>

        {/* Barbell for weightlifting */}
        {activity === "weightlifting" && (
          <group position={[0, 0.75, 0.35]}>
            <Barbell load={axialLoad} />
          </group>
        )}

        {/* Backpack for walking */}
        {activity === "walking" && axialLoad > 200 && (
          <group position={[0, 1.05, 0]}>
            <Backpack load={axialLoad} />
          </group>
        )}
      </group>

      {/* Legs stay grounded */}
      {/* Left Leg */}
      <group position={[-0.12, 0.55, 0]} rotation={[leftLegAngle - liftKneeBend, 0, 0]}>
        <Limb position={[0, -0.2, 0]} length={0.25} width={0.08} color={clothColor} />
        <group position={[0, -0.42, 0]} rotation={[liftKneeBend * 1.5, 0, 0]}>
          <Joint position={[0, 0, 0]} color={clothColor} size={0.07} />
          <Limb position={[0, -0.2, 0]} length={0.25} width={0.07} color={clothColor} />
          <mesh position={[0, -0.44, 0.06]}>
            <boxGeometry args={[0.1, 0.06, 0.18]} />
            <meshStandardMaterial color={shoeColor} roughness={0.8} />
          </mesh>
        </group>
      </group>

      {/* Right Leg */}
      <group position={[0.12, 0.55, 0]} rotation={[rightLegAngle - liftKneeBend, 0, 0]}>
        <Limb position={[0, -0.2, 0]} length={0.25} width={0.08} color={clothColor} />
        <group position={[0, -0.42, 0]} rotation={[liftKneeBend * 1.5, 0, 0]}>
          <Joint position={[0, 0, 0]} color={clothColor} size={0.07} />
          <Limb position={[0, -0.2, 0]} length={0.25} width={0.07} color={clothColor} />
          <mesh position={[0, -0.44, 0.06]}>
            <boxGeometry args={[0.1, 0.06, 0.18]} />
            <meshStandardMaterial color={shoeColor} roughness={0.8} />
          </mesh>
        </group>
      </group>

      {/* Ground plane */}
      <mesh position={[0, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshStandardMaterial color="#1a2030" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

export default function HumanoidScene({
  axialLoad,
  flexionAngle,
  herniationRisk,
  activity,
}: HumanoidSceneProps) {
  return (
    <Canvas
      camera={{ position: [2, 1.5, 3], fov: 40 }}
      style={{ background: "transparent" }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={0.7} color="#ffffff" />
      <directionalLight position={[-3, 3, -3]} intensity={0.3} color="#00d4ff" />
      <pointLight position={[0, 1, 3]} intensity={0.4} color="#00d4ff" distance={10} />
      <HumanoidModel
        axialLoad={axialLoad}
        flexionAngle={flexionAngle}
        herniationRisk={herniationRisk}
        activity={activity}
      />
      <OrbitControls
        enablePan={false}
        minDistance={2}
        maxDistance={6}
        target={[0, 0.8, 0]}
      />
      <Environment preset="studio" />
    </Canvas>
  );
}
