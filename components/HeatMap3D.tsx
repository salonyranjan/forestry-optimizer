import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMemo } from 'react';
import SimulationTree from '@/components/SimulationTree';

interface HeatMap3DProps {
  canopyCoverage: number;
  concreteRatio: number;
}

// Simple infrastructure block with optional heat glow
const Block = ({ position, concreteRatio }: { position: [number, number, number]; concreteRatio: number }) => {
  const materialProps = concreteRatio > 60 ? { emissive: '#ef4444', emissiveIntensity: 0.15 } : {};
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[0.8, 0.8, 0.8]} />
      <meshStandardMaterial color="#555555" {...materialProps} />
    </mesh>
  );
};

const HeatMap3D = ({ canopyCoverage, concreteRatio }: HeatMap3DProps) => {
  // Generate grid with indices for pseudo‑random weighting
  const cells = useMemo(() => {
    const arr: { position: [number, number, number]; x: number; z: number }[] = [];
    for (let x = 0; x < 10; x++) {
      for (let z = 0; z < 10; z++) {
        arr.push({ position: [x * 1.2, 0, z * 1.2] as const, x, z });
      }
    }
    return arr;
  }, []);

  return (
    <Canvas shadows="pcf" camera={{ position: [5, 5, 5], fov: 50 }}>
      {/* Balanced ambient lighting */}
      <ambientLight intensity={0.5} />
      {/* Directional light with shadows */}
      <directionalLight
        castShadow
        position={[5, 10, 5]}
        intensity={0.8}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {cells.map(({ position, x, z }, i) => {
        const pointWeight = (x * 7 + z * 13) % 100;
        if (pointWeight < canopyCoverage) {
          // Render a procedural low‑poly tree
          return (
            <SimulationTree
              key={i}
              position={position}
              delayOffset={(x + z) * 0.3}
            />
          );
        }
        // Render an infrastructure block with optional heat‑island glow
        return <Block key={i} position={position} concreteRatio={concreteRatio} />;
      })}
      <OrbitControls />
    </Canvas>
  );
};

export default HeatMap3D;