import * as THREE from "three";

export interface CarVisual {
  root: THREE.Group;
  wheels: THREE.Mesh[];
  brakeLights: THREE.MeshStandardMaterial;
  nitroFlames: THREE.Mesh[];
}

export function createCar(): CarVisual {
  const root = new THREE.Group();
  root.name = "player-car";

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x16d5ff, metalness: 0.75, roughness: 0.2 });
  const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x071e38, metalness: 0.4, roughness: 0.12 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x081018, metalness: 0.45, roughness: 0.45 });
  const brakeLights = new THREE.MeshStandardMaterial({ color: 0x6b080e, emissive: 0xff1838, emissiveIntensity: 1.2 });

  const lower = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.55, 4.4), bodyMaterial);
  lower.position.y = 0.72;
  lower.castShadow = true;
  root.add(lower);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.28, 1.35), bodyMaterial);
  hood.position.set(0, 1.05, 1.18);
  hood.rotation.x = -0.05;
  hood.castShadow = true;
  root.add(hood);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.72, 1.9), glassMaterial);
  cabin.position.set(0, 1.34, -0.28);
  cabin.scale.set(0.92, 1, 0.88);
  cabin.castShadow = true;
  root.add(cabin);

  const spoilerBar = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.12, 0.38), darkMaterial);
  spoilerBar.position.set(0, 1.22, -2.05);
  root.add(spoilerBar);
  for (const x of [-0.7, 0.7]) {
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.12), darkMaterial);
    mount.position.set(x, 1.02, -1.93);
    root.add(mount);
  }

  const wheels: THREE.Mesh[] = [];
  const wheelGeometry = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 18);
  for (const x of [-1.12, 1.12]) {
    for (const z of [-1.35, 1.35]) {
      const wheel = new THREE.Mesh(wheelGeometry, darkMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.55, z);
      wheel.castShadow = true;
      wheels.push(wheel);
      root.add(wheel);
    }
  }

  for (const x of [-0.68, 0.68]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.08), brakeLights);
    light.position.set(x, 0.83, -2.23);
    root.add(light);
  }

  const nitroFlames: THREE.Mesh[] = [];
  const flameMaterial = new THREE.MeshBasicMaterial({ color: 0x5cffff, transparent: true, opacity: 0.82 });
  for (const x of [-0.5, 0.5]) {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.25, 10), flameMaterial);
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(x, 0.54, -2.75);
    flame.visible = false;
    nitroFlames.push(flame);
    root.add(flame);
  }

  return { root, wheels, brakeLights, nitroFlames };
}
