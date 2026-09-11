import type { Vec2 } from "../simulation/types";

export const CHECKPOINTS: Vec2[] = [
  { x: 0, z: 36 },
  { x: 0, z: -36 },
  { x: 36, z: -72 },
  { x: 108, z: -72 },
  { x: 108, z: 0 },
  { x: 72, z: 72 },
  { x: 0, z: 72 },
];

export const MISSION_DURATION = 80;
