import * as THREE from "three";
import { CHECKPOINTS } from "../../game/content/route";

export interface CheckpointVisuals {
  rings: THREE.Group[];
  update(activeIndex: number, elapsed: number): void;
}

export function createCheckpoints(scene: THREE.Scene): CheckpointVisuals {
  const rings = CHECKPOINTS.map((point, index) => {
    const root = new THREE.Group();
    root.position.set(point.x, 0.08, point.z);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(5.7, 0.34, 10, 40),
      new THREE.MeshBasicMaterial({ color: 0x4ffcff, transparent: true, opacity: 0.22 }),
    );
    ring.rotation.x = Math.PI / 2;
    root.add(ring);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(5.1, 5.1, 11, 32, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x33e6ff, transparent: true, opacity: 0.035, side: THREE.DoubleSide }),
    );
    beam.position.y = 5.5;
    root.add(beam);
    root.visible = index === 0;
    scene.add(root);
    return root;
  });

  return {
    rings,
    update(activeIndex, elapsed) {
      rings.forEach((root, index) => {
        root.visible = index === activeIndex;
        if (root.visible) {
          root.rotation.y = elapsed * 0.8;
          const scale = 1 + Math.sin(elapsed * 4) * 0.06;
          root.scale.setScalar(scale);
        }
      });
    },
  };
}
