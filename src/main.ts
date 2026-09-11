import "./styles.css";
import { GameApp } from "./render/app/GameApp";

const host = document.querySelector<HTMLElement>("#app");
if (!host) throw new Error("Game host #app was not found.");

new GameApp(host);
