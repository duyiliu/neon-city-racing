import type { MissionState, VehicleState } from "../game/simulation/types";
import { CHECKPOINTS } from "../game/content/route";

export class Hud {
  private readonly root: HTMLElement;
  private readonly speed: HTMLElement;
  private readonly nitro: HTMLElement;
  private readonly timer: HTMLElement;
  private readonly progress: HTMLElement;
  private readonly surface: HTMLElement;
  private readonly centerMessage: HTMLElement;
  private hintHidden = false;

  constructor(host: HTMLElement) {
    host.insertAdjacentHTML("beforeend", `
      <div class="hud" aria-live="polite">
        <section class="objective-chip">
          <span class="eyebrow">CITY RUN · 01</span>
          <strong>穿越下一个光门</strong>
          <span id="progress">CHECKPOINT 1 / ${CHECKPOINTS.length}</span>
        </section>
        <section class="status-cluster">
          <div class="timer" id="timer">01:20.0</div>
          <div class="speedometer"><span id="speed">000</span><small>KM/H</small></div>
          <div class="nitro-label"><span>NITRO</span><span>SHIFT</span></div>
          <div class="nitro-track"><i id="nitro"></i></div>
          <div class="surface" id="surface">ROAD</div>
        </section>
        <div class="controls-hint" id="controls-hint">
          <span><kbd>WASD</kbd> 驾驶</span><span><kbd>SPACE</kbd> 漂移</span><span><kbd>SHIFT</kbd> 氮气</span>
        </div>
        <div class="center-message" id="center-message"></div>
        <button class="pause-button" id="pause-button" aria-label="暂停游戏">Ⅱ</button>
      </div>
    `);
    this.root = host.querySelector<HTMLElement>(".hud")!;
    this.speed = host.querySelector<HTMLElement>("#speed")!;
    this.nitro = host.querySelector<HTMLElement>("#nitro")!;
    this.timer = host.querySelector<HTMLElement>("#timer")!;
    this.progress = host.querySelector<HTMLElement>("#progress")!;
    this.surface = host.querySelector<HTMLElement>("#surface")!;
    this.centerMessage = host.querySelector<HTMLElement>("#center-message")!;
  }

  onPause(callback: () => void): void {
    this.root.querySelector("#pause-button")?.addEventListener("click", callback);
  }

  update(vehicle: VehicleState, mission: MissionState, paused: boolean): void {
    this.speed.textContent = Math.round(vehicle.displaySpeed).toString().padStart(3, "0");
    this.nitro.style.width = `${vehicle.nitro}%`;
    const minutes = Math.floor(mission.timeRemaining / 60);
    const seconds = mission.timeRemaining - minutes * 60;
    this.timer.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toFixed(1).padStart(4, "0")}`;
    this.timer.classList.toggle("danger", mission.timeRemaining < 15);
    this.progress.textContent = mission.status === "active"
      ? `CHECKPOINT ${mission.checkpointIndex + 1} / ${CHECKPOINTS.length}`
      : mission.status.toUpperCase();
    this.surface.textContent = vehicle.offroad ? "OFF ROAD" : vehicle.drifting ? "DRIFT" : "ROAD";
    this.surface.classList.toggle("warning", vehicle.offroad || vehicle.drifting);

    if (!this.hintHidden && vehicle.displaySpeed > 35) {
      this.hintHidden = true;
      this.root.querySelector("#controls-hint")?.classList.add("hidden");
    }

    if (paused) this.showMessage("已暂停", "按 ESC 继续");
    else if (mission.status === "complete") this.showMessage("任务完成", `获得 ${mission.reward.toLocaleString()} CR · 按 R 再跑一次`);
    else if (mission.status === "failed") this.showMessage("时间耗尽", "按 R 重新挑战");
    else this.hideMessage();
  }

  flashCheckpoint(): void {
    this.root.classList.remove("checkpoint-flash");
    requestAnimationFrame(() => this.root.classList.add("checkpoint-flash"));
  }

  private showMessage(title: string, subtitle: string): void {
    this.centerMessage.innerHTML = `<strong>${title}</strong><span>${subtitle}</span>`;
    this.centerMessage.classList.add("visible");
  }

  private hideMessage(): void {
    this.centerMessage.classList.remove("visible");
  }
}
