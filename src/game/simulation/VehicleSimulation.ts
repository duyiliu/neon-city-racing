import type { DriveInput, VehicleState } from "./types";

const START_X = 0;
const START_Z = 92;
const WORLD_LIMIT = 139;
const ROAD_SPACING = 36;
const ROAD_HALF_WIDTH = 5.6;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function approach(value: number, target: number, amount: number): number {
  if (value < target) return Math.min(value + amount, target);
  return Math.max(value - amount, target);
}

function distanceToNearestRoad(value: number): number {
  return Math.abs(value - Math.round(value / ROAD_SPACING) * ROAD_SPACING);
}

export class VehicleSimulation {
  readonly state: VehicleState = {
    position: { x: START_X, z: START_Z },
    velocity: { x: 0, z: 0 },
    yaw: Math.PI,
    speed: 0,
    displaySpeed: 0,
    nitro: 100,
    drifting: false,
    offroad: false,
  };

  reset(): void {
    Object.assign(this.state, {
      position: { x: START_X, z: START_Z },
      velocity: { x: 0, z: 0 },
      yaw: Math.PI,
      speed: 0,
      displaySpeed: 0,
      nitro: 100,
      drifting: false,
      offroad: false,
    });
  }

  update(input: DriveInput, delta: number): void {
    const dt = Math.min(delta, 1 / 30);
    const state = this.state;
    const forwardX = Math.sin(state.yaw);
    const forwardZ = Math.cos(state.yaw);
    const rightX = forwardZ;
    const rightZ = -forwardX;
    let forwardSpeed = state.velocity.x * forwardX + state.velocity.z * forwardZ;
    let lateralSpeed = state.velocity.x * rightX + state.velocity.z * rightZ;

    state.offroad = distanceToNearestRoad(state.position.x) > ROAD_HALF_WIDTH &&
      distanceToNearestRoad(state.position.z) > ROAD_HALF_WIDTH;

    const usingNitro = input.nitro && input.throttle > 0 && state.nitro > 0 && Math.abs(forwardSpeed) > 5;
    const acceleration = state.offroad ? 16 : 28;
    const maxForward = state.offroad ? 19 : usingNitro ? 48 : 34;
    const maxReverse = -11;

    if (input.throttle !== 0) {
      const reversingDirection = Math.sign(input.throttle) !== Math.sign(forwardSpeed) && Math.abs(forwardSpeed) > 1;
      const force = reversingDirection ? 42 : acceleration * (usingNitro ? 1.8 : 1);
      forwardSpeed += input.throttle * force * dt;
    } else {
      forwardSpeed = approach(forwardSpeed, 0, (state.offroad ? 9 : 3.2) * dt);
    }

    forwardSpeed = clamp(forwardSpeed, maxReverse, maxForward);
    const speedRatio = clamp(Math.abs(forwardSpeed) / 24, 0, 1);
    const turnDirection = forwardSpeed >= 0 ? 1 : -1;
    const driftFactor = input.handbrake && Math.abs(forwardSpeed) > 8 ? 1.75 : 1;
    state.yaw += input.steer * turnDirection * (0.45 + speedRatio * 1.45) * driftFactor * dt;

    state.drifting = input.handbrake && Math.abs(input.steer) > 0 && Math.abs(forwardSpeed) > 9;
    const lateralGrip = state.drifting ? 1.5 : state.offroad ? 8 : 13;
    lateralSpeed = approach(lateralSpeed, 0, lateralGrip * dt);
    if (state.drifting) lateralSpeed += input.steer * Math.abs(forwardSpeed) * 0.95 * dt;

    const newForwardX = Math.sin(state.yaw);
    const newForwardZ = Math.cos(state.yaw);
    const newRightX = newForwardZ;
    const newRightZ = -newForwardX;
    state.velocity.x = newForwardX * forwardSpeed + newRightX * lateralSpeed;
    state.velocity.z = newForwardZ * forwardSpeed + newRightZ * lateralSpeed;
    state.position.x += state.velocity.x * dt;
    state.position.z += state.velocity.z * dt;

    if (Math.abs(state.position.x) > WORLD_LIMIT) {
      state.position.x = clamp(state.position.x, -WORLD_LIMIT, WORLD_LIMIT);
      state.velocity.x *= -0.3;
      forwardSpeed *= 0.55;
    }
    if (Math.abs(state.position.z) > WORLD_LIMIT) {
      state.position.z = clamp(state.position.z, -WORLD_LIMIT, WORLD_LIMIT);
      state.velocity.z *= -0.3;
      forwardSpeed *= 0.55;
    }

    if (usingNitro) state.nitro = Math.max(0, state.nitro - 28 * dt);
    else state.nitro = Math.min(100, state.nitro + 9 * dt);

    state.speed = forwardSpeed;
    state.displaySpeed = Math.hypot(state.velocity.x, state.velocity.z) * 6.2;
  }
}
