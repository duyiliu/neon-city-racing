import * as THREE from "three";

const WORLD_SIZE = 300;
const ROAD_SPACING = 36;
const ROAD_WIDTH = 11;

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0xffffffff;
  };
}

export function createCity(scene: THREE.Scene): void {
  const random = seededRandom(1988);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE),
    new THREE.MeshStandardMaterial({ color: 0x132628, roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x111923, roughness: 0.88, metalness: 0.08 });
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffcb43 });
  for (let coordinate = -144; coordinate <= 144; coordinate += ROAD_SPACING) {
    const horizontal = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIZE, ROAD_WIDTH), roadMaterial);
    horizontal.rotation.x = -Math.PI / 2;
    horizontal.position.set(0, 0.018, coordinate);
    horizontal.receiveShadow = true;
    scene.add(horizontal);

    const vertical = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, WORLD_SIZE), roadMaterial);
    vertical.rotation.x = -Math.PI / 2;
    vertical.position.set(coordinate, 0.02, 0);
    vertical.receiveShadow = true;
    scene.add(vertical);

    const hLine = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIZE, 0.15), lineMaterial);
    hLine.rotation.x = -Math.PI / 2;
    hLine.position.set(0, 0.035, coordinate);
    scene.add(hLine);

    const vLine = new THREE.Mesh(new THREE.PlaneGeometry(0.15, WORLD_SIZE), lineMaterial);
    vLine.rotation.x = -Math.PI / 2;
    vLine.position.set(coordinate, 0.037, 0);
    scene.add(vLine);
  }

  const facadeColors = [0x173453, 0x263453, 0x304b5c, 0x31405a, 0x1d3545];
  for (let gx = -126; gx <= 126; gx += ROAD_SPACING) {
    for (let gz = -126; gz <= 126; gz += ROAD_SPACING) {
      const height = 10 + random() * 34;
      const width = 15 + random() * 7;
      const depth = 15 + random() * 7;
      const material = new THREE.MeshStandardMaterial({
        color: facadeColors[Math.floor(random() * facadeColors.length)],
        roughness: 0.58,
        metalness: 0.18,
        emissive: random() > 0.5 ? 0x071629 : 0x090d18,
        emissiveIntensity: 0.35,
      });
      const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
      building.position.set(gx + (random() - 0.5) * 4, height / 2, gz + (random() - 0.5) * 4);
      building.castShadow = true;
      building.receiveShadow = true;
      scene.add(building);

      const crown = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.72, 0.35, depth * 0.72),
        new THREE.MeshBasicMaterial({ color: random() > 0.5 ? 0x19d9ff : 0xff3b91 }),
      );
      crown.position.set(building.position.x, height + 0.2, building.position.z);
      scene.add(crown);
    }
  }

  const skyline = new THREE.Mesh(
    new THREE.CylinderGeometry(142, 142, 0.5, 64),
    new THREE.MeshBasicMaterial({ color: 0x123747, transparent: true, opacity: 0.55 }),
  );
  skyline.position.y = -0.3;
  scene.add(skyline);
}
