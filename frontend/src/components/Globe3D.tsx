import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import type { Issue } from "../lib/types";
import { STATUS_COLOR } from "../lib/api";

const R = 2;

/** Convert lat/lng to a point on the globe surface. */
function latLngToVec3(lat: number, lng: number, radius = R): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function Pin({ position, color, critical }: { position: THREE.Vector3; color: string; critical: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (halo.current) {
      const s = 1 + Math.sin(t * 2 + position.x) * (critical ? 0.5 : 0.25);
      halo.current.scale.setScalar(s);
      (halo.current.material as THREE.MeshBasicMaterial).opacity =
        0.35 - Math.sin(t * 2 + position.x) * 0.15;
    }
  });
  return (
    <group position={position}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} />
      </mesh>
      <mesh ref={halo}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function Earth({ issues }: { issues: Issue[] }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current) group.current.rotation.y += 0.0016;
  });

  // Center the globe on Hyderabad so demo pins are visible.
  const baseLat = 17.45;
  const baseLng = 78.37;

  const pins = useMemo(
    () =>
      issues.map((i) => {
        // Amplify tiny local deltas so pins spread across the visible hemisphere.
        const lat = baseLat + (i.lat - baseLat) * 380;
        const lng = baseLng + (i.lng - baseLng) * 380;
        return {
          id: i.id,
          pos: latLngToVec3(lat, lng, R + 0.02),
          color: STATUS_COLOR[i.status] || "#00E5C3",
          critical: i.severity >= 4 && i.status !== "RESOLVED",
        };
      }),
    [issues]
  );

  return (
    <group ref={group}>
      {/* core sphere */}
      <mesh>
        <sphereGeometry args={[R, 64, 64]} />
        <meshStandardMaterial
          color="#0d1b3a"
          emissive="#08122b"
          emissiveIntensity={0.5}
          roughness={0.85}
          metalness={0.2}
        />
      </mesh>
      {/* glowing wireframe atmosphere */}
      <mesh scale={1.04}>
        <sphereGeometry args={[R, 32, 32]} />
        <meshBasicMaterial color="#00E5C3" wireframe transparent opacity={0.12} />
      </mesh>
      <mesh scale={1.12}>
        <sphereGeometry args={[R, 32, 32]} />
        <meshBasicMaterial color="#00E5C3" transparent opacity={0.04} />
      </mesh>
      {pins.map((p) => (
        <Pin key={p.id} position={p.pos} color={p.color} critical={p.critical} />
      ))}
    </group>
  );
}

export default function Globe3D({
  issues,
  height = 340,
  interactive = true,
}: {
  issues: Issue[];
  height?: number;
  interactive?: boolean;
}) {
  return (
    <div style={{ height }} className="w-full">
      <Canvas camera={{ position: [0, 0, 5.2], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 3, 5]} intensity={1.2} color="#00E5C3" />
        <pointLight position={[-5, -3, -5]} intensity={0.6} color="#FFB800" />
        <Stars radius={50} depth={30} count={1800} factor={4} fade speed={1} />
        <Earth issues={issues} />
        {interactive && (
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            autoRotate={false}
            rotateSpeed={0.5}
          />
        )}
      </Canvas>
    </div>
  );
}
