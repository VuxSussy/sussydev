/**
 * Background music: "Slowburn – Relaxing LoFi Background Music" by JoelFazhari (Pixabay Content License), cut to a
 * seamless loop (see assets-src/audio/README.md). Streamed through an <audio> element so the 93 s track is never
 * decoded into memory; a Web Audio gain fades it in and out. Nothing loads until the visitor turns sound on.
 */
const SRC = "/audio/ambient.mp3";
/** Background level: the music should sit under the page, not on top of it. */
const VOLUME = 0.5;

export class Ambience {
  private audio: HTMLAudioElement | null = null;
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private enabled = false;
  private pauseTimer = 0;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled && !this.audio) this.init();
    const { audio, context, gain } = this;
    if (!audio || !context || !gain) return;
    window.clearTimeout(this.pauseTimer);
    gain.gain.setTargetAtTime(enabled ? VOLUME : 0, context.currentTime, 0.4);
    if (enabled) {
      void context.resume();
      void audio.play().catch(() => { /* blocked or offline: stay silent */ });
    } else {
      // Pause once faded out, so a muted page does not keep streaming.
      this.pauseTimer = window.setTimeout(() => audio.pause(), 1500);
    }
  }

  get isEnabled() {
    return this.enabled;
  }

  private init() {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const audio = (this.audio = new Audio(SRC));
    audio.loop = true;
    audio.preload = "auto";
    const context = (this.context = new Ctor());
    this.gain = context.createGain();
    this.gain.gain.value = 0;
    context.createMediaElementSource(audio).connect(this.gain).connect(context.destination);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  /** No music from a background tab. */
  private onVisibility = () => {
    if (!this.audio || !this.enabled) return;
    if (document.hidden) this.audio.pause();
    else void this.audio.play().catch(() => {});
  };

  dispose() {
    window.clearTimeout(this.pauseTimer);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.audio?.pause();
    this.audio?.removeAttribute("src");
    this.audio = null;
    void this.context?.close();
    this.context = null;
  }
}
