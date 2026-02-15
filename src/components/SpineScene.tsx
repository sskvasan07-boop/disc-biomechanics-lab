import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

interface SpineSceneProps {
  axialLoad: number;
  flexionAngle: number;
  discHealth: "healthy" | "mild" | "severe";
}

/** Create a kidney-bean shaped vertebral body cross-section */
function createVertebraShape() {
  const shape = new THREE.Shape();
  // Kidney-bean profile using bezier curves
  shape.moveTo(0, 1.1);
  shape.bezierCurveTo(0.7, 1.15, 1.2, 0.8, 1.25, 0.3);
  shape.bezierCurveTo(1.3, -0.1, 1.1, -0.6, 0.9, -0.9);
  shape.bezierCurveTo(0.7, -1.1, 0.3, -1.15, 0, -1.1);
  shape.bezierCurveTo(-0.3, -1.15, -0.7, -1.1, -0.9, -0.9);
  shape.bezierCurveTo(-1.1, -0.6, -1.3, -0.1, -1.25, 0.3);
  shape.bezierCurveTo(-1.2, 0.8, -0.7, 1.15, 0, 1.1);
  return shape;
}

function VertebralBody() {
  const geometry = useMemo(() => {
    const shape = createVertebraShape();
    const extrudeSettings = {
      depth: 0.7,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.04,
      bevelSegments: 4,
      curveSegments: 24,
    };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Rotate so extrusion goes along Y axis and center it
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -0.35, 0);
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#e8e0d4"
        roughness={0.85}
        metalness={0.02}
      />
    </mesh>
  );
}

/** Concave endplate disc on top/bottom of vertebral body */
function Endplate({ side }: { side: "top" | "bottom" }) {
  const geometry = useMemo(() => {
    const shape = createVertebraShape();
    // Scale down slightly for endplate
    const geo = new THREE.ShapeGeometry(shape, 24);
    geo.rotateX(side === "top" ? -Math.PI / 2 : Math.PI / 2);
    // Warp vertices to create concavity
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      const dip = -0.06 * (1 - dist / 1.3); // concave center
      pos.setY(i, pos.getY(i) + (side === "top" ? dip : -dip));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [side]);

  const yPos = side === "top" ? 0.35 : -0.35;

  return (
    <mesh geometry={geometry} position={[0, yPos, 0]}>
      <meshStandardMaterial
        color="#d8d0c4"
        roughness={0.75}
        metalness={0.03}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Bony ridges around vertebral body perimeter */
function BonyRidges() {
  const ridges = useMemo(() => {
    const items: { pos: [number, number, number]; rot: [number, number, number]; scale: [number, number, number] }[] = [];
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 1.1 + Math.sin(angle * 3) * 0.08;
      items.push({
        pos: [Math.cos(angle) * r, (Math.random() - 0.5) * 0.3, Math.sin(angle) * r],
        rot: [0, -angle, (Math.random() - 0.5) * 0.3],
        scale: [0.08 + Math.random() * 0.04, 0.12 + Math.random() * 0.08, 0.15 + Math.random() * 0.1],
      });
    }
    return items;
  }, []);

  return (
    <group>
      {ridges.map((r, i) => (
        <mesh key={i} position={r.pos} rotation={r.rot} scale={r.scale}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshStandardMaterial color="#ddd8cc" roughness={0.9} metalness={0.01} />
        </mesh>
      ))}
    </group>
  );
}

/** Spinous process - the posterior spike */
function SpinousProcess() {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.08, 0.25);
    shape.lineTo(0.05, 0.9);
    shape.lineTo(0, 1.0);
    shape.lineTo(-0.05, 0.9);
    shape.lineTo(-0.08, 0.25);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 2 });
    geo.rotateX(-Math.PI / 2);
    geo.rotateY(Math.PI);
    geo.translate(0, 0.1, -0.6);
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#dcd4c8" roughness={0.88} metalness={0.02} />
    </mesh>
  );
}

/** Transverse process - lateral wing */
function TransverseProcess({ side }: { side: "left" | "right" }) {
  const s = side === "left" ? -1 : 1;
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.2, 0.05, 0.5, 0.08, 0.7, 0);
    shape.bezierCurveTo(0.5, -0.06, 0.2, -0.05, 0, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
    geo.rotateX(-Math.PI / 2);
    geo.translate(s * 0.9, 0, -0.2);
    if (side === "left") {
      geo.scale(-1, 1, 1);
    }
    geo.computeVertexNormals();
    return geo;
  }, [s, side]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#dcd4c8" roughness={0.88} metalness={0.02} />
    </mesh>
  );
}

function Vertebra({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <VertebralBody />
      <Endplate side="top" />
      <Endplate side="bottom" />
      <BonyRidges />
      <SpinousProcess />
      <TransverseProcess side="left" />
      <TransverseProcess side="right" />
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

  // Create kidney-bean disc geometry
  const discGeometry = useMemo(() => {
    const shape = createVertebraShape();
    // Scale slightly smaller than vertebra
    const extrudeSettings = {
      depth: 0.45,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 3,
      curveSegments: 24,
    };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -0.225, 0);
    geo.scale(0.95, 1, 0.95);
    geo.computeVertexNormals();
    return geo;
  }, []);

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
      <mesh ref={meshRef} geometry={discGeometry}>
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
        <sphereGeometry args={[0.5, 32, 32]} />
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
        position={[0, 0.75 - compression * 0.12, Math.sin(angleRad) * 0.15]}
        rotation={[angleRad * 0.5, 0, 0]}
      />
      {/* Disc */}
      <Disc axialLoad={axialLoad} flexionAngle={flexionAngle} discHealth={discHealth} />
      {/* Lower vertebra */}
      <Vertebra
        position={[0, -0.75 + compression * 0.12, -Math.sin(angleRad) * 0.15]}
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
      shadows
    >
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[5, 6, 5]}
        intensity={0.9}
        color="#fff8f0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.001}
      />
      <directionalLight position={[-3, 2, -3]} intensity={0.25} color="#c0e8ff" />
      <pointLight position={[0, 0, 3]} intensity={0.4} color="#00d4ff" distance={10} />
      {/* Rim light for depth */}
      <pointLight position={[-2, -1, -2]} intensity={0.2} color="#ffeedd" distance={8} />
      <SpineModel axialLoad={axialLoad} flexionAngle={flexionAngle} discHealth={discHealth} />
      <ContactShadows
        position={[0, -1.8, 0]}
        opacity={0.4}
        scale={6}
        blur={2.5}
        far={4}
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
