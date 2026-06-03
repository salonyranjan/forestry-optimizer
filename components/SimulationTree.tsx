import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Low‑poly procedural tree used for the urban telemetry simulation.
 *
 * Props
 * -----
 * @param position    XYZ coordinate where the tree should be placed.
 * @param delayOffset Optional time offset (in seconds) used to desynchronise the sway animation
 *                    between multiple instances. Default is `0`.
 */
interface SimulationTreeProps {
  position: [number, number, number];
  delayOffset?: number;
}

const SimulationTree: React.FC<SimulationTreeProps> = ({ position, delayOffset = 0 }) => {
  // Group ref to apply the sway animation to the whole tree.
  const groupRef = useRef<THREE.Group>(null);

  // Animate a subtle organic sway using the render loop.
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    // Access elapsedTime directly to avoid deprecated Clock usage warnings
    const time = clock.elapsedTime + delayOffset;
    // Small sinusoidal rotation on X and Z axes.
    const sway = Math.sin(time) * 0.06; // ~3.5°
    groupRef.current.rotation.x = sway;
    groupRef.current.rotation.z = sway * 0.5; // a bit less on Z for variety
  });

  // Geometry dimensions
  const trunkHeight = 0.8;
  const trunkRadiusTop = 0.08;
  const trunkRadiusBottom = 0.12;

  // Canopy tiers – each tier is a cone with decreasing radius/height.
  const canopyTiers = [
    // Base tier (dark emerald)
    { radius: 0.4, height: 0.7, color: '#065f46' },
    // Middle tier (mid green)
    { radius: 0.35, height: 0.6, color: '#059669' },
    // Apex tier (bright emerald)
    { radius: 0.3, height: 0.5, color: '#10b981' },
  ];

  // Compute Y offsets so each tier sits on top of the previous one.
  let yOffset = trunkHeight / 2; // top of the trunk (cylinder is centred)

  return (
    <group ref={groupRef} position={position} castShadow receiveShadow>
      {/* Trunk */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[trunkRadiusTop, trunkRadiusBottom, trunkHeight, 8]} />
        <meshStandardMaterial color="#5c4033" flatShading />
      </mesh>
      {/* Canopy tiers */}
      {canopyTiers.map((tier, idx) => {
        yOffset += tier.height / 2; // move up by half the cone height
        const element = (
          <mesh key={idx} position={[0, yOffset, 0]} castShadow receiveShadow>
            <coneGeometry args={[tier.radius, tier.height, 7]} />
            <meshStandardMaterial color={tier.color} flatShading />
          </mesh>
        );
        yOffset += tier.height / 2; // prepare for next tier
        return element;
      })}
    </group>
  );
};

export default SimulationTree;
