export interface Vec2 {
  x: number;
  z: number;
}

export interface DriveInput {
  throttle: number;
  steer: number;
  handbrake: boolean;
  nitro: boolean;
}

export interface VehicleState {
  position: Vec2;
  velocity: Vec2;
  yaw: number;
  speed: number;
  displaySpeed: number;
  nitro: number;
  drifting: boolean;
  offroad: boolean;
}

export interface MissionState {
  checkpointIndex: number;
  timeRemaining: number;
  status: "active" | "complete" | "failed";
  reward: number;
}
