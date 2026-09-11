import type { DriveInput } from "../simulation/types";

export class KeyboardInput {
  private readonly pressed = new Set<string>();
  private resetRequested = false;
  private pauseRequested = false;

  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.clear);
  }

  read(): DriveInput {
    return {
      throttle: this.axis(["KeyW", "ArrowUp"], ["KeyS", "ArrowDown"]),
      steer: this.axis(["KeyA", "ArrowLeft"], ["KeyD", "ArrowRight"]),
      handbrake: this.pressed.has("Space"),
      nitro: this.pressed.has("ShiftLeft") || this.pressed.has("ShiftRight"),
    };
  }

  consumeReset(): boolean {
    const value = this.resetRequested;
    this.resetRequested = false;
    return value;
  }

  consumePause(): boolean {
    const value = this.pauseRequested;
    this.pauseRequested = false;
    return value;
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.clear);
  }

  private axis(positive: string[], negative: string[]): number {
    const positiveDown = positive.some((code) => this.pressed.has(code));
    const negativeDown = negative.some((code) => this.pressed.has(code));
    return Number(positiveDown) - Number(negativeDown);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
      event.preventDefault();
    }
    if (event.code === "KeyR" && !event.repeat) this.resetRequested = true;
    if (event.code === "Escape" && !event.repeat) this.pauseRequested = true;
    this.pressed.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code);
  };

  private readonly clear = (): void => {
    this.pressed.clear();
  };
}
