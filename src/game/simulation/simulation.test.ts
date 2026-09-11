import { describe, expect, it } from "vitest";
import { CHECKPOINTS, MISSION_DURATION } from "../content/route";
import { MissionSimulation } from "./MissionSimulation";
import { VehicleSimulation } from "./VehicleSimulation";

describe("VehicleSimulation", () => {
  it("accelerates, consumes nitro, and stays inside the city boundary", () => {
    const vehicle = new VehicleSimulation();
    for (let i = 0; i < 240; i += 1) {
      vehicle.update({ throttle: 1, steer: 0, handbrake: false, nitro: true }, 1 / 60);
    }
    expect(vehicle.state.displaySpeed).toBeGreaterThan(100);
    expect(vehicle.state.nitro).toBeLessThan(100);
    expect(Math.abs(vehicle.state.position.z)).toBeLessThanOrEqual(139);
  });

  it("resets the vehicle to the starting state", () => {
    const vehicle = new VehicleSimulation();
    vehicle.update({ throttle: 1, steer: 1, handbrake: true, nitro: false }, 1);
    vehicle.reset();
    expect(vehicle.state.position).toEqual({ x: 0, z: 92 });
    expect(vehicle.state.displaySpeed).toBe(0);
    expect(vehicle.state.nitro).toBe(100);
  });
});

describe("MissionSimulation", () => {
  it("completes after all checkpoints are crossed in order", () => {
    const mission = new MissionSimulation();
    for (const checkpoint of CHECKPOINTS) mission.update(checkpoint, 0.1);
    expect(mission.state.status).toBe("complete");
    expect(mission.state.reward).toBeGreaterThan(1200);
  });

  it("fails when time expires", () => {
    const mission = new MissionSimulation();
    mission.update({ x: 999, z: 999 }, MISSION_DURATION + 1);
    expect(mission.state.status).toBe("failed");
    expect(mission.state.timeRemaining).toBe(0);
  });
});
