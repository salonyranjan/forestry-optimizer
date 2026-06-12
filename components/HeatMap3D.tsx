"use client";

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls, Environment, Grid } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import SimulationTree from "@/components/SimulationTree";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeatherTelemetry {
  temp: number;
  humidity: number;
  wind: number;
}

interface HeatMap3DProps {
  canopyCoverage: number;
  concreteRatio: number;
  weather?: WeatherTelemetry | null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Ground plane — color shifts from cool green toward scorched orange as
 * concreteRatio climbs, giving an at-a-glance read on the urban heat state.
 */
function GroundPlane({ concreteRatio }: { concreteRatio: number }) {
  // Lerp hue: lush green (0.35) → parched terracotta (0.05) with ratio
  const t = concreteRatio / 100;
  const groundColor = useMemo(() => {
    const green = new THREE.Color("#1a3320");
    const baked = new THREE.Color("#3d2008");
    return green.clone().lerp(baked, t);
  }, [t]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6, -0.01, 6]} receiveShadow>
      <planeGeometry args={[18, 18]} />
      <meshStandardMaterial color={groundColor} roughness={0.95} />
    </mesh>
  );
}

/**
 * Infrastructure block — emissive heat glow scales with concreteRatio and
 * actual temperature telemetry so hot-day / high-concrete is visually distinct.
 */
interface BlockProps {
  position: [number, number, number];
  concreteRatio: number;
  temp: number;
}

function Block({ position, concreteRatio, temp }: BlockProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  // Heat shimmer: subtle emissive pulse when the concrete ratio is high AND
  // the temperature is genuinely hot.
  const isHot   = concreteRatio > 55 && temp > 28;
  const baseEmissiveIntensity = isHot ? 0.08 + (concreteRatio - 55) / 200 : 0;

  useFrame((_s, delta) => {
    if (!meshRef.current || !isHot) return;
    timeRef.current += delta;
    // Slow shimmer — not distracting but alive
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity =
      baseEmissiveIntensity + Math.sin(timeRef.current * 1.2) * 0.03;
  });

  // Block height varies slightly with concrete ratio for visual texture
  const blockH = 0.65 + (concreteRatio / 100) * 0.4;

  return (
    <mesh
      ref={meshRef}
      position={[position[0], blockH / 2, position[2]]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.75, blockH, 0.75]} />
      <meshStandardMaterial
        color="#4a4a52"
        roughness={0.7}
        metalness={0.15}
        emissive={isHot ? "#ef4444" : "#000000"}
        emissiveIntensity={baseEmissiveIntensity}
      />
    </mesh>
  );
}

/**
 * Atmosphere fog + ambient glow that reacts to temperature and humidity.
 * High humidity + high temp → thick hazy orange fog.
 * Cold or low humidity → crisp, clean dark air.
 */
function AtmosphericScene({
  weather,
  lightColor,
  lightIntensity,
}: {
  weather?: WeatherTelemetry | null;
  lightColor: string;
  lightIntensity: number;
}) {
  const temp     = weather?.temp     ?? 25;
  const humidity = weather?.humidity ?? 50;

  // Fog density ramps with both heat and humidity
  const fogDensity = Math.min(0.06, (temp / 40) * (humidity / 100) * 0.08);
  const fogColor   = temp > 32 ? "#1a1008" : "#070d14";

  return (
    <>
      <fog attach="fog" args={[fogColor, 8, 8 + (1 - fogDensity / 0.08) * 22]} />
      <ambientLight intensity={0.45} color={temp > 32 ? "#ffe8cc" : "#c8d8ff"} />
      <directionalLight
        castShadow
        position={[8, 14, 6]}
        intensity={lightIntensity}
        color={lightColor}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.001}
      />
      {/* Warm fill light from below to simulate ground thermal radiation */}
      {temp > 30 && (
        <pointLight
          position={[6, 0.5, 6]}
          intensity={0.3 * ((temp - 30) / 15)}
          color="#ff6b35"
          distance={20}
          decay={2}
        />
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const HeatMap3D = ({ canopyCoverage, concreteRatio, weather }: HeatMap3DProps) => {
  // ── Derived weather values ──────────────────────────────────────────────────
  const temp         = weather?.temp     ?? 25;
  const currentWind  = weather?.wind     ?? 5;

  // Lighting reacts to temperature telemetry
  const lightColor     = temp > 32 ? "#ffedd5" : temp > 26 ? "#fff3dc" : "#e8f0ff";
  const lightIntensity = temp > 32 ? 1.6 : temp > 26 ? 1.2 : 0.85;

  // ── Grid cell generation ────────────────────────────────────────────────────
  //
  // 10×10 grid. Each cell uses a deterministic pseudo-random weight derived
  // from its coordinates so the pattern is stable across re-renders but
  // varies spatially — no Math.random() calls in render.
  const cells = useMemo(() => {
    const arr: {
      position: [number, number, number];
      x: number;
      z: number;
      weight: number;
    }[] = [];

    for (let x = 0; x < 10; x++) {
      for (let z = 0; z < 10; z++) {
        // Deterministic weight in [0, 100) — same formula as before for
        // backward compatibility with existing canopyCoverage behaviour
        const weight = (x * 7 + z * 13) % 100;
        arr.push({
          position: [x * 1.25, 0, z * 1.25],
          x,
          z,
          weight,
        });
      }
    }
    return arr;
  }, []);

  return (
    <Canvas
      shadows={{ type: THREE.PCFSoftShadowMap }}
      camera={{ position: [7, 7, 7], fov: 48 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      dpr={[1, 2]}
    >
      {/* ── Atmosphere ── */}
      <AtmosphericScene
        weather={weather}
        lightColor={lightColor}
        lightIntensity={lightIntensity}
      />

      {/* ── Ground ── */}
      <GroundPlane concreteRatio={concreteRatio} />

      {/* ── Subtle grid overlay for readability ── */}
      <Grid
        position={[6, 0.002, 6]}
        args={[18, 18]}
        cellSize={1.25}
        cellThickness={0.4}
        cellColor="#1e3a2a"
        sectionSize={5}
        sectionThickness={0.8}
        sectionColor="#2d5a3d"
        fadeDistance={28}
        fadeStrength={1.2}
        infiniteGrid={false}
      />

      {/* ── Cell rendering ── */}
      {cells.map(({ position, x, z, weight }, i) => {
        if (weight < canopyCoverage) {
          return (
            <SimulationTree
              key={i}
              position={position}
              // Stagger per-tree offset for organic, wave-free grove feel
              delayOffset={(x * 1.7 + z * 2.3) * 0.18}
              windSpeed={currentWind}
            />
          );
        }
        return (
          <Block
            key={i}
            position={position}
            concreteRatio={concreteRatio}
            temp={temp}
          />
        );
      })}

      {/* ── Camera controls ── */}
      <OrbitControls
        makeDefault
        minDistance={4}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.1}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
      />
    </Canvas>
  );
};

export default HeatMap3D;