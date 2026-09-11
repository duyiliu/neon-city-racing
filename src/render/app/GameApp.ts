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
    const input = this.input.read();
    const safeDelta = Math.min(delta, 0.05);
    const visualLerp = 1 - Math.pow(0.004, safeDelta);

    this.car.root.position.set(state.position.x, 0, state.position.z);
    this.car.root.rotation.y = state.yaw;

    const targetRoll = -state.steerVisual * Math.min(state.displaySpeed / 900, 0.09) - state.slipAngle * 0.08;
    const targetPitch = state.boostActive ? -0.022 : input.throttle < 0 ? 0.026 : input.throttle > 0 ? -0.012 : 0;
    this.car.root.rotation.z = THREE.MathUtils.lerp(this.car.root.rotation.z, targetRoll, visualLerp);
    this.car.root.rotation.x = THREE.MathUtils.lerp(this.car.root.rotation.x, targetPitch, visualLerp * 0.7);

    this.car.wheels.forEach((wheel) => {
      wheel.rotation.x += state.speed * safeDelta * 1.8;
    });

    this.car.brakeLights.emissiveIntensity = input.throttle < 0 ? 3.4 : 1.1;
    this.car.nitroFlames.forEach((flame, index) => {
      flame.visible = state.boostActive;
      const pulse = 1 + Math.sin(this.elapsed * 42 + index * 1.7) * 0.2;
      flame.scale.set(0.9 + pulse * 0.08, 0.9 + pulse * 0.35, 0.9 + pulse * 0.08);
    });

    const forward = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const speed01 = THREE.MathUtils.clamp(state.displaySpeed / 310, 0, 1);
    const driftOffset = THREE.MathUtils.clamp(state.slipAngle * 3.2, -1.7, 1.7);
    const chaseDistance = THREE.MathUtils.lerp(8.7, state.boostActive ? 12.4 : 10.4, speed01);
    const chaseHeight = THREE.MathUtils.lerp(4.1, 4.9, speed01);

    const desired = new THREE.Vector3(state.position.x, chaseHeight, state.position.z)
      .addScaledVector(forward, -chaseDistance)
      .addScaledVector(right, driftOffset);

    if (state.boostActive) {
      const shake = Math.sin(this.elapsed * 58) * 0.045;
      desired.addScaledVector(right, shake);
      desired.y += Math.cos(this.elapsed * 47) * 0.025;
    } else if (state.offroad && state.displaySpeed > 45) {
      desired.y += Math.sin(this.elapsed * 36) * 0.055;
    }

    const cameraLerp = 1 - Math.pow(state.drifting ? 0.018 : 0.0035, safeDelta);
    this.camera.position.lerp(desired, cameraLerp);

    const lookAhead = THREE.MathUtils.lerp(5.5, 10.5, speed01);
    const lookAt = new THREE.Vector3(state.position.x, 1.05, state.position.z)
      .addScaledVector(forward, lookAhead)
      .addScaledVector(right, driftOffset * 0.38);
    this.camera.lookAt(lookAt);

    const targetFov = state.boostActive ? 74 : THREE.MathUtils.lerp(62, 66.5, speed01);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, state.boostActive ? 0.1 : 0.055);
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
