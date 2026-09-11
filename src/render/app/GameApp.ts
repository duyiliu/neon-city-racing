import * as THREE from "three";
import { KeyboardInput } from "../../game/input/KeyboardInput";
import { MissionSimulation } from "../../game/simulation/MissionSimulation";
import { VehicleSimulation } from "../../game/simulation/VehicleSimulation";
import { Hud } from "../../ui/Hud";
import { createCar } from "../objects/createCar";
import { createCheckpoints } from "../objects/createCheckpoints";
import { createCity } from "../objects/createCity";

export class GameApp {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  private readonly clock = new THREE.Clock();
  private readonly input = new KeyboardInput();
  private readonly vehicle = new VehicleSimulation();
  private readonly mission = new MissionSimulation();
  private readonly car = createCar();
  private readonly checkpoints = createCheckpoints(this.scene);
  private readonly hud: Hud;
  private paused = false;
  private elapsed = 0;

  constructor(private readonly host: HTMLElement) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.domElement.className = "game-canvas";
    host.appendChild(this.renderer.domElement);

    this.hud = new Hud(host);
    this.hud.onPause(() => this.togglePause());
    this.setupScene();
    this.resize();

    window.addEventListener("resize", this.resize);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.renderer.domElement.addEventListener("webglcontextlost", this.onContextLost);
    this.renderer.domElement.addEventListener("webglcontextrestored", this.onContextRestored);
    this.renderer.setAnimationLoop(this.frame);
  }

  private setupScene(): void {
    this.scene.background = new THREE.Color(0x07111c);
    this.scene.fog = new THREE.FogExp2(0x07111c, 0.0068);
    this.scene.add(new THREE.HemisphereLight(0x9de6ff, 0x081319, 1.7));
    const sun = new THREE.DirectionalLight(0xffe4b5, 2.8);
    sun.position.set(-75, 105, 45);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    this.scene.add(sun);

    createCity(this.scene);
    this.scene.add(this.car.root);

    const skyGlow = new THREE.Mesh(
      new THREE.SphereGeometry(330, 32, 16),
      new THREE.MeshBasicMaterial({ color: 0x0a2942, side: THREE.BackSide, fog: false }),
    );
    this.scene.add(skyGlow);
  }

  private readonly frame = (): void => {
    const rawDelta = this.clock.getDelta();
    if (this.input.consumePause()) this.togglePause();
    if (this.input.consumeReset()) this.reset();

    if (!this.paused && this.mission.state.status === "active") {
      const delta = Math.min(rawDelta, 0.05);
      this.vehicle.update(this.input.read(), delta);
      if (this.mission.update(this.vehicle.state.position, delta)) this.hud.flashCheckpoint();
      this.elapsed += delta;
    }

    this.syncVisuals(rawDelta);
    this.hud.update(this.vehicle.state, this.mission.state, this.paused);
    this.renderer.render(this.scene, this.camera);
  };

  private syncVisuals(delta: number): void {
    const state = this.vehicle.state;
    this.car.root.position.set(state.position.x, 0, state.position.z);
    this.car.root.rotation.y = state.yaw;
    this.car.root.rotation.z = THREE.MathUtils.lerp(this.car.root.rotation.z, -this.input.read().steer * Math.min(state.displaySpeed / 500, 0.08), 0.12);
    this.car.wheels.forEach((wheel) => { wheel.rotation.x += state.speed * delta * 1.8; });
    const nitroActive = this.input.read().nitro && state.nitro > 0 && state.displaySpeed > 30;
    this.car.nitroFlames.forEach((flame, index) => {
      flame.visible = nitroActive;
      flame.scale.y = 0.8 + Math.sin(this.elapsed * 35 + index) * 0.18;
    });

    const forward = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));
    const desired = new THREE.Vector3(state.position.x, 4.5, state.position.z)
      .addScaledVector(forward, -9.5);
    const cameraLerp = 1 - Math.pow(0.002, Math.min(delta, 0.05));
    this.camera.position.lerp(desired, cameraLerp);
    const lookAt = new THREE.Vector3(state.position.x, 1.1, state.position.z).addScaledVector(forward, 6);
    this.camera.lookAt(lookAt);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, nitroActive ? 70 : 62, 0.06);
    this.camera.updateProjectionMatrix();

    this.checkpoints.update(this.mission.state.checkpointIndex, this.elapsed);
  }

  private togglePause(): void {
    if (this.mission.state.status !== "active") return;
    this.paused = !this.paused;
  }

  private reset(): void {
    this.vehicle.reset();
    this.mission.reset();
    this.paused = false;
    this.elapsed = 0;
  }

  private readonly resize = (): void => {
    const width = this.host.clientWidth || window.innerWidth;
    const height = this.host.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  private readonly onVisibilityChange = (): void => {
    if (document.hidden && this.mission.state.status === "active") this.paused = true;
  };

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault();
    this.paused = true;
  };

  private readonly onContextRestored = (): void => {
    this.resize();
  };
}
