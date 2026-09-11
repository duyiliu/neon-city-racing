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
    slipAngle: 0,
    boostActive: false,
    steerVisual: 0,
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
      slipAngle: 0,
      boostActive: false,
      steerVisual: 0,
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

    const absoluteSpeed = Math.abs(forwardSpeed);
    const usingNitro = input.nitro && input.throttle > 0 && state.nitro > 0 && absoluteSpeed > 6;
    state.boostActive = usingNitro;

    const roadAcceleration = usingNitro ? 38 : 28;
    const acceleration = state.offroad ? 15 : roadAcceleration;
    const maxForward = state.offroad ? 18 : usingNitro ? 50 : 35;
    const maxReverse = -11;

    if (input.throttle !== 0) {
      const reversingDirection = Math.sign(input.throttle) !== Math.sign(forwardSpeed) && absoluteSpeed > 1;
      const force = reversingDirection ? 44 : acceleration;
      forwardSpeed += input.throttle * force * dt;
    } else {
      forwardSpeed = approach(forwardSpeed, 0, (state.offroad ? 10 : 3.4) * dt);
    }

    // High-speed aerodynamic drag keeps the car controllable and makes boost feel distinct.
    if (forwardSpeed > 0) {
      const normalized = clamp(forwardSpeed / maxForward, 0, 1);
      forwardSpeed -= normalized * normalized * (usingNitro ? 0.7 : 1.25) * dt;
    }
    forwardSpeed = clamp(forwardSpeed, maxReverse, maxForward);

    const speedRatio = clamp(absoluteSpeed / 30, 0, 1);
    const reverseDirection = forwardSpeed >= 0 ? 1 : -1;
    const steeringAuthority = 0.58 + speedRatio * 1.12;
    const highSpeedStability = 1 - clamp((absoluteSpeed - 28) / 30, 0, 0.28);
    const driftRequested = input.handbrake && Math.abs(input.steer) > 0.05 && absoluteSpeed > 8;

    if (driftRequested) {
      const driftYawBoost = 1.62 + speedRatio * 0.5;
      state.yaw += input.steer * reverseDirection * steeringAuthority * driftYawBoost * dt;
      // Kick the rear axle outward on initiation, then let the slide build naturally.
      lateralSpeed += input.steer * absoluteSpeed * 1.85 * dt;
    } else {
      state.yaw += input.steer * reverseDirection * steeringAuthority * highSpeedStability * dt;
    }

    const driftHold = driftRequested || (state.drifting && Math.abs(lateralSpeed) > 2.2 && absoluteSpeed > 7);
    state.drifting = driftHold;

    const lateralGrip = state.offroad ? 5.2 : driftHold ? 2.15 : 12.8;
    lateralSpeed = approach(lateralSpeed, 0, lateralGrip * dt);
    lateralSpeed = clamp(lateralSpeed, -absoluteSpeed * 0.62, absoluteSpeed * 0.62);

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
      state.velocity.x *= -0.28;
      forwardSpeed *= 0.56;
    }
    if (Math.abs(state.position.z) > WORLD_LIMIT) {
      state.position.z = clamp(state.position.z, -WORLD_LIMIT, WORLD_LIMIT);
      state.velocity.z *= -0.28;
      forwardSpeed *= 0.56;
    }

    if (usingNitro) state.nitro = Math.max(0, state.nitro - 30 * dt);
    else state.nitro = Math.min(100, state.nitro + (absoluteSpeed < 8 ? 12 : 7.5) * dt);

    state.speed = forwardSpeed;
    state.displaySpeed = Math.hypot(state.velocity.x, state.velocity.z) * 6.2;
    state.slipAngle = Math.atan2(lateralSpeed, Math.max(Math.abs(forwardSpeed), 0.01));
    state.steerVisual = approach(state.steerVisual, input.steer, 5.5 * dt);
  }
}
