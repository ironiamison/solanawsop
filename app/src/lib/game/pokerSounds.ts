export type PokerSound =
  | "shuffle"
  | "deal"
  | "chip"
  | "fold"
  | "check"
  | "flop"
  | "turn"
  | "river"
  | "showdown"
  | "win";

const MUTE_KEY = "poker-sounds-muted";

class PokerSoundEngine {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = "sine",
    volume = 0.08,
    when = 0
  ): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + when);
    gain.gain.setValueAtTime(0, ctx.currentTime + when);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + when + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + when);
    osc.stop(ctx.currentTime + when + duration + 0.02);
  }

  private noiseBurst(duration: number, volume = 0.04, when = 0): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    src.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 0.6;
    gain.gain.setValueAtTime(volume, ctx.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(ctx.currentTime + when);
    src.stop(ctx.currentTime + when + duration);
  }

  play(sound: PokerSound): void {
    if (isSoundMuted()) return;

    switch (sound) {
      case "shuffle":
        for (let i = 0; i < 8; i++) this.noiseBurst(0.04, 0.035, i * 0.045);
        break;
      case "deal":
        this.tone(520, 0.07, "triangle", 0.07);
        this.tone(780, 0.05, "sine", 0.04, 0.04);
        break;
      case "chip":
        this.tone(1800, 0.05, "square", 0.035);
        this.tone(2400, 0.04, "sine", 0.025, 0.02);
        this.noiseBurst(0.03, 0.02, 0.01);
        break;
      case "fold":
        this.tone(280, 0.18, "sine", 0.06);
        this.noiseBurst(0.12, 0.03);
        break;
      case "check":
        this.tone(660, 0.06, "sine", 0.05);
        break;
      case "flop":
        for (let i = 0; i < 3; i++) {
          this.tone(140 + i * 20, 0.09, "triangle", 0.09, i * 0.11);
          this.noiseBurst(0.05, 0.04, i * 0.11 + 0.02);
        }
        break;
      case "turn":
        this.tone(160, 0.1, "triangle", 0.09);
        this.noiseBurst(0.06, 0.045, 0.03);
        break;
      case "river":
        this.tone(120, 0.12, "triangle", 0.1);
        this.tone(200, 0.08, "sine", 0.05, 0.05);
        this.noiseBurst(0.07, 0.05, 0.04);
        break;
      case "showdown":
        [440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.14, "sine", 0.05, i * 0.1));
        break;
      case "win":
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.2, "triangle", 0.06, i * 0.12));
        break;
    }
  }
}

let engine: PokerSoundEngine | null = null;

export function playPokerSound(sound: PokerSound): void {
  if (isSoundMuted()) return;
  if (!engine) engine = new PokerSoundEngine();
  engine.play(sound);
}

export function isSoundMuted(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(MUTE_KEY) === "1";
}

export function setSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}
