import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SimulationTreeProps {
  /** World-space XYZ position */
  position: [number, number, number];
  /**
   * Per-instance time offset (seconds) used to desynchronise sway across
   * multiple trees so the grove feels organic rather than robotic.
   */
  delayOffset?: number;
  /**
   * Real-time wind speed in km/h fed from live meteorological telemetry.
   * Drives sway speed AND amplitude so the animation is physically grounded.
   * Defaults to a gentle idle breeze (5 km/h) when offline.
   */
  windSpeed?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Reference wind speed used to normalise the factor to 1.0 */
const REFERENCE_WIND_KMH = 10;

/** Maximum sway angle in radians. At 60 km/h this is fully applied. */
const MAX_SWAY_RAD = 0.14; // ~8°

/** Secondary micro-tremor amplitude (fraction of base sway) */
const TREMOR_SCALE = 0.25;

/** Frequency scale — higher → faster oscillation per windFactor unit */
const FREQ_SCALE = 1.4;

// ─── Component ────────────────────────────────────────────────────────────────

const SimulationTree: React.FC<SimulationTreeProps> = ({
  position,
  delayOffset = 0,
  windSpeed = 5,
}) => {
  // ── Wind physics ────────────────────────────────────────────────────────────
  //
  // windFactor drives BOTH sway speed and sway amplitude:
  //   • At  5 km/h → factor ≈ 0.50 → lazy, low-amplitude idle
  //   • At 10 km/h → factor = 1.00 → reference breeze
  //   • At 20 km/h → factor = 2.00 → brisk, visibly swaying
  //   • At 50 km/h → factor = 5.00 → clamped at aggressive gale (amplitude cap)
  //
  // Amplitude is clamped so trees never flip over; speed is unclamped so storms
  // feel kinetic.
  const windFactor = Math.max(0.2, (windSpeed || 5) / REFERENCE_WIND_KMH);

  // Sway amplitude scales sub-linearly with wind so it saturates at high speeds
  // (log gives a natural-feeling curve: aggressive but not absurd).
  const swayAmplitude = useMemo(
    () => Math.min(MAX_SWAY_RAD, MAX_SWAY_RAD * Math.log1p(windFactor) / Math.log1p(5)),
    [windFactor]
  );

  // ── Refs ────────────────────────────────────────────────────────────────────
  const groupRef   = useRef<THREE.Group>(null);
  const canopyRef  = useRef<THREE.Group>(null);
  const timeRef    = useRef<number>(0);

  // ── Per-instance randomness (stable across renders) ─────────────────────────
  // A single seed per instance drives all the random variation so different trees
  // on the same grid never share phase, frequency, or tremor offset.
  const { phaseShift, freqVariance, tremorPhase } = useMemo(() => ({
    phaseShift:   delayOffset,
    freqVariance: 0.85 + (delayOffset % 1) * 0.3, // 0.85–1.15
    tremorPhase:  (delayOffset * 3.7) % (2 * Math.PI),
  }), [delayOffset]);

  // ── Animation loop ──────────────────────────────────────────────────────────
  useFrame((_state, delta) => {
    if (!groupRef.current || !canopyRef.current) return;

    // Accumulate time with delta so the animation is framerate-independent
    timeRef.current += delta;
    const t = timeRef.current;

    // ── Primary sway ─────────────────────────────────────────────────────────
    // Base frequency × wind speed × per-tree variance keeps each tree unique.
    const baseFreq  = FREQ_SCALE * windFactor * freqVariance;
    const swayX     = Math.sin(t * baseFreq + phaseShift) * swayAmplitude;
    const swayZ     = Math.sin(t * baseFreq * 0.67 + phaseShift + Math.PI / 4) * swayAmplitude * 0.55;

    // Apply to the whole tree group (trunk + canopy move together at base)
    groupRef.current.rotation.x = swayX;
    groupRef.current.rotation.z = swayZ;

    // ── Secondary canopy micro-tremor ────────────────────────────────────────
    // A higher-frequency, lower-amplitude signal applied only to the canopy group
    // makes the leaves feel like they're rustling independently of the trunk sway.
    const tremorFreq = baseFreq * 2.8;
    const tremor     = Math.sin(t * tremorFreq + tremorPhase) * swayAmplitude * TREMOR_SCALE;
    canopyRef.current.rotation.x = tremor;
    canopyRef.current.rotation.z = Math.cos(t * tremorFreq * 0.9 + tremorPhase) * swayAmplitude * TREMOR_SCALE * 0.7;
  });

  // ── Geometry ─────────────────────────────────────────────────────────────────
  const trunkHeight        = 0.8;
  const trunkRadiusTop     = 0.075;
  const trunkRadiusBottom  = 0.115;

  // Three canopy tiers — deepest green at base, brightest at apex
  const canopyTiers: { radiusBase: number; height: number; color: string; segments: number }[] = [
    { radiusBase: 0.42, height: 0.72, color: "#065f46", segments: 7 },
    { radiusBase: 0.36, height: 0.62, color: "#059669", segments: 6 },
    { radiusBase: 0.28, height: 0.52, color: "#10b981", segments: 6 },
  ];

  // Stack tiers: each tier sits directly on top of the previous
  const tierPositions = useMemo(() => {
    const positions: number[] = [];
    let y = trunkHeight; // start at top of trunk
    for (const tier of canopyTiers) {
      y += tier.height * 0.42; // partial overlap for lush, layered look
      positions.push(y);
      y += tier.height * 0.42;
    }
    return positions;
  }, []);

  return (
    <group ref={groupRef} position={position}>
      {/* ── Trunk ── */}
      <mesh castShadow receiveShadow position={[0, trunkHeight / 2, 0]}>
        <cylinderGeometry
          args={[trunkRadiusTop, trunkRadiusBottom, trunkHeight, 8]}
        />
        <meshStandardMaterial color="#5c4033" flatShading roughness={0.9} />
      </mesh>

      {/* ── Canopy (micro-tremor applied here only) ── */}
      <group ref={canopyRef}>
        {canopyTiers.map((tier, idx) => (
          <mesh
            key={idx}
            position={[0, tierPositions[idx], 0]}
            castShadow
            receiveShadow
          >
            <coneGeometry args={[tier.radiusBase, tier.height, tier.segments]} />
            <meshStandardMaterial
              color={tier.color}
              flatShading
              roughness={0.85}
              metalness={0.0}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};

export default SimulationTree;