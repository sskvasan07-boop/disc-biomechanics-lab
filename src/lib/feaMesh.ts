import * as THREE from "three";

/**
 * FEA Mesh Generator for Intervertebral Disc
 * Generates a cylindrical disc mesh with per-vertex stress calculation,
 * stress-based vertex coloring, and local deformation.
 */

export interface FEAParams {
  axialLoad: number;       // 0–2000 N
  flexionAngle: number;    // -15 to +15 degrees
  discHealth: "healthy" | "mild" | "severe";
}

// Disc geometry constants
const DISC_RADIUS = 1.15;
const DISC_HEIGHT = 0.5;
const RADIAL_SEGMENTS = 32;
const HEIGHT_SEGMENTS = 8;
const RING_SEGMENTS = 6; // radial rings from center to edge

// Material properties by health
const MATERIAL_PROPS = {
  healthy:  { youngModulus: 10, poissonRatio: 0.45, yieldStress: 1.2 },
  mild:     { youngModulus: 6,  poissonRatio: 0.40, yieldStress: 0.8 },
  severe:   { youngModulus: 3,  poissonRatio: 0.35, yieldStress: 0.5 },
};

/**
 * Build a high-density cylindrical disc mesh as BufferGeometry
 * with position, normal, and color attributes.
 */
export function createDiscGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(
    DISC_RADIUS,
    DISC_RADIUS,
    DISC_HEIGHT,
    RADIAL_SEGMENTS,
    HEIGHT_SEGMENTS,
    false
  );

  // Add vertex colors (initialized to green)
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = 0.2;
    colors[i * 3 + 1] = 0.8;
    colors[i * 3 + 2] = 0.4;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  return geometry;
}

/**
 * Calculate Von Mises stress at a vertex position given loading conditions.
 * Uses simplified FEA: axial stress + bending stress from flexion.
 */
function calculateVonMisesStress(
  x: number, y: number, z: number,
  params: FEAParams
): number {
  const mat = MATERIAL_PROPS[params.discHealth];
  const crossArea = Math.PI * DISC_RADIUS * DISC_RADIUS * 1e6; // mm²
  const momentOfInertia = (Math.PI * Math.pow(DISC_RADIUS * 1000, 4)) / 4; // mm⁴ simplified

  // Axial stress component (compressive, uniform)
  const axialStress = params.axialLoad / (crossArea / 1000); // MPa simplified

  // Bending stress component (varies with position)
  // Flexion: positive angle = forward bend, posterior (negative z) gets more compression
  const angleRad = THREE.MathUtils.degToRad(params.flexionAngle);
  const bendingMoment = params.axialLoad * Math.sin(angleRad) * DISC_RADIUS * 50; // N·mm
  const distFromNeutral = -z * 1000; // mm, posterior = positive stress
  const bendingStress = (bendingMoment * distFromNeutral) / (momentOfInertia / 1000);

  // Radial position factor: edges have higher stress concentration
  const radialDist = Math.sqrt(x * x + z * z) / DISC_RADIUS;
  const stressConcentration = 1 + radialDist * 0.5;

  // Height factor: mid-plane has highest stress
  const heightFactor = 1 - Math.abs(y / (DISC_HEIGHT / 2)) * 0.3;

  // Combined stress (simplified Von Mises)
  const sigma_axial = axialStress * stressConcentration * heightFactor;
  const sigma_bending = bendingStress * stressConcentration * heightFactor;
  const sigma_total = sigma_axial + sigma_bending;

  // Shear from torsion/flexion coupling
  const tau = Math.abs(sigma_bending) * 0.3 * (1 - Math.abs(y / (DISC_HEIGHT / 2)));

  // Von Mises: sqrt(σ² + 3τ²)
  const vonMises = Math.sqrt(sigma_total * sigma_total + 3 * tau * tau);

  return Math.abs(vonMises);
}

/**
 * Map a stress value [0, maxStress] to an RGB color.
 * Low stress → blue/green, medium → yellow, high → red
 */
function stressToColor(stress: number, maxStress: number): [number, number, number] {
  const t = Math.min(stress / Math.max(maxStress, 0.001), 1);

  // Blue → Cyan → Green → Yellow → Red
  if (t < 0.25) {
    const s = t / 0.25;
    return [0.1, 0.3 + s * 0.5, 0.8 - s * 0.2]; // blue to cyan
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return [0.1 + s * 0.2, 0.8, 0.6 - s * 0.5]; // cyan to green
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return [0.3 + s * 0.7, 0.8 - s * 0.2, 0.1]; // green to yellow
  } else {
    const s = (t - 0.75) / 0.25;
    return [1.0, 0.6 - s * 0.6, 0.1 - s * 0.1]; // yellow to red
  }
}

/**
 * Apply local deformation to disc mesh vertices based on load and flexion.
 * During flexion, the posterior side bulges more than the anterior.
 */
function applyLocalDeformation(
  origX: number, origY: number, origZ: number,
  params: FEAParams
): [number, number, number] {
  const compression = params.axialLoad / 2000;
  const angleRad = THREE.MathUtils.degToRad(params.flexionAngle);

  // Uniform compression
  const yDeformed = origY * (1 - compression * 0.25);

  // Directional bulge: more bulge on the side opposite to flexion
  const theta = Math.atan2(origZ, origX);
  const radialDist = Math.sqrt(origX * origX + origZ * origZ);

  // Flexion causes posterior bulge (negative Z direction when angle > 0)
  const directionalBulge = -Math.sin(theta) * Math.sin(angleRad) * 0.15;
  // Uniform radial bulge from compression
  const uniformBulge = compression * 0.2;
  // Combined radial scale
  const bulgeScale = 1 + uniformBulge + directionalBulge;

  // Only deform vertices near the outer edge more
  const edgeFactor = Math.pow(radialDist / DISC_RADIUS, 2);
  const finalBulge = 1 + (bulgeScale - 1) * (0.3 + 0.7 * edgeFactor);

  const xDeformed = origX * finalBulge;
  const zDeformed = origZ * finalBulge;

  // Tilt from flexion
  const tiltOffset = origY * Math.sin(angleRad) * 0.3;

  return [xDeformed, yDeformed, zDeformed + tiltOffset];
}

export interface FEAResult {
  peakVonMises: number;
}

/**
 * Update geometry: apply deformation, calculate stress, set vertex colors.
 * Returns the peak Von Mises stress.
 */
export function updateFEAMesh(
  geometry: THREE.BufferGeometry,
  originalPositions: Float32Array,
  params: FEAParams
): FEAResult {
  const positions = geometry.attributes.position.array as Float32Array;
  const colors = geometry.attributes.color.array as Float32Array;
  const count = geometry.attributes.position.count;

  // First pass: calculate stress for normalization
  const stresses: number[] = new Array(count);
  let peakVonMises = 0;

  for (let i = 0; i < count; i++) {
    const ox = originalPositions[i * 3];
    const oy = originalPositions[i * 3 + 1];
    const oz = originalPositions[i * 3 + 2];

    const stress = calculateVonMisesStress(ox, oy, oz, params);
    stresses[i] = stress;
    if (stress > peakVonMises) peakVonMises = stress;
  }

  // Second pass: apply deformation and coloring
  for (let i = 0; i < count; i++) {
    const ox = originalPositions[i * 3];
    const oy = originalPositions[i * 3 + 1];
    const oz = originalPositions[i * 3 + 2];

    // Deformation
    const [dx, dy, dz] = applyLocalDeformation(ox, oy, oz, params);
    positions[i * 3] = dx;
    positions[i * 3 + 1] = dy;
    positions[i * 3 + 2] = dz;

    // Vertex color from stress
    const [r, g, b] = stressToColor(stresses[i], peakVonMises);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
  geometry.computeVertexNormals();

  return { peakVonMises };
}
