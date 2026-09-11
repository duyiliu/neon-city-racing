import { CHECKPOINTS, MISSION_DURATION } from "../content/route";
import type { MissionState, Vec2 } from "./types";

export class MissionSimulation {
  readonly state: MissionState = {
    checkpointIndex: 0,
    timeRemaining: MISSION_DURATION,
    status: "active",
    reward: 0,
  };

  reset(): void {
    this.state.checkpointIndex = 0;
    this.state.timeRemaining = MISSION_DURATION;
    this.state.status = "active";
    this.state.reward = 0;
  }

  update(position: Vec2, delta: number): boolean {
    if (this.state.status !== "active") return false;
    this.state.timeRemaining = Math.max(0, this.state.timeRemaining - delta);
    if (this.state.timeRemaining <= 0) {
      this.state.status = "failed";
      return false;
    }

    const target = CHECKPOINTS[this.state.checkpointIndex];
    if (Math.hypot(position.x - target.x, position.z - target.z) > 8) return false;

    this.state.checkpointIndex += 1;
    if (this.state.checkpointIndex >= CHECKPOINTS.length) {
      this.state.status = "complete";
      this.state.reward = 1200 + Math.round(this.state.timeRemaining * 35);
    }
    return true;
  }
}
