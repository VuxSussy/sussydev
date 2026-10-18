/**
 * Site audio (see assets-src/audio/README.md). On by default: it tries to start as soon as the page loads, which works
 * wherever the browser allows autoplay (e.g. Chrome for a site the visitor has played media on before, or a site they
 * allowed). Where autoplay is blocked it starts at the first mouse press, tap or key press, the earliest moment browsers
 * permit (scrolling does not count):
 * - music: "Slowburn – Relaxing LoFi Background Music" by JoelFazhari (Pixabay Content License), a seamless 93 s loop
 *   streamed through an <audio> element so it is never decoded into memory;
 * - a soft countryside breeze that fades in towards the sunset.
 * Once Sussy is through the studio door the music steps down to OUTSIDE_MUSIC, leaving room for the wind.
 */
const MUSIC = "/audio/ambient.mp3";
const WIND = "/audio/countryside-wind.mp3";
/** Levels: everything sits under the page, not on top of it. */
const VOLUME = 0.5;
const WIND_LEVEL = 0.55;
/** Events that count as a user gesture for starting audio (scroll and wheel do not). */
const GESTURES = ["pointerdown", "mousedown", "pointerup", "click", "keydown", "touchend"] as const;
/** Music level outside the studio, relative to inside. */
const OUTSIDE_MUSIC = 0.6;

export class Ambience {
  private audio: HTMLAudioElement | null = null;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private wind: GainNode | null = null;
  private enabled = false;
  private mix = 0;
  private outside = 0;
  private pauseTimer = 0;
  private abort = new AbortController();

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled && !this.audio) this.init();
    const { audio, context, master } = this;
    if (!audio || !context || !master) return;
    window.clearTimeout(this.pauseTimer);
    master.gain.setTargetAtTime(enabled ? 1 : 0, context.currentTime, 0.4);
    if (enabled) {
      this.start();
    } else {
      // Pause once faded out, so a muted page does not keep streaming or running the audio graph.
      this.pauseTimer = window.setTimeout(() => {
        audio.pause();
        void context.suspend();
      }, 1500);
    }
  }

  /** Try to play now; if the browser blocks autoplay, try again at the first gesture. */
  private start() {
    const { audio, context } = this;
    if (!audio || !context) return;
    void context.resume();
    audio
      .play()
      // The <audio> element may be allowed while the AudioContext it plays through is still suspended (silent).
      .then(() => { if (context.state !== "running") this.waitForGesture(); })
      .catch(() => this.waitForGesture());
  }

  private waitForGesture() {
    GESTURES.forEach((type) => window.addEventListener(type, this.onGesture, { capture: true, passive: true }));
  }

  private onGesture = () => {
    GESTURES.forEach((type) => window.removeEventListener(type, this.onGesture, { capture: true }));
    if (this.enabled) this.start();
  };

  get isEnabled() {
    return this.enabled;
  }

  /**
   * @param mix 0 = studio, 1 = sunset countryside: how much of the wind bed is heard
   * @param outside 0 = in the studio, 1 = through the door: the music eases down to OUTSIDE_MUSIC
   */
  setMix(mix: number, outside: number) {
    const changed = (a: number, b: number) => Math.abs(a - b) >= 0.01 || ((b === 0 || b === 1) && a !== b);
    if (!changed(this.mix, mix) && !changed(this.outside, outside)) return;
    this.mix = mix;
    this.outside = outside;
    this.applyLevels(0.3);
  }

  private applyLevels(smoothing: number) {
    const { context, music, wind } = this;
    if (!context || !music || !wind) return;
    const clamp = (value: number) => Math.min(Math.max(value, 0), 1);
    music.gain.setTargetAtTime(VOLUME * (1 - (1 - OUTSIDE_MUSIC) * clamp(this.outside)), context.currentTime, smoothing);
    wind.gain.setTargetAtTime(WIND_LEVEL * clamp(this.mix), context.currentTime, smoothing);
  }

  private init() {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const context = (this.context = new Ctor());
    const master = (this.master = context.createGain());
    master.gain.value = 0;
    master.connect(context.destination);

    const audio = (this.audio = new Audio(MUSIC));
    audio.loop = true;
    audio.preload = "auto";
    const music = (this.music = context.createGain());
    context.createMediaElementSource(audio).connect(music).connect(master);

    const wind = (this.wind = context.createGain());
    wind.connect(master);
    this.applyLevels(0.01);
    void this.load(context, WIND)
      .then((windBuffer) => {
        if (this.context !== context) return;
        const source = context.createBufferSource();
        source.buffer = windBuffer;
        source.loop = true;
        source.connect(wind);
        source.start();
      })
      .catch(() => { /* offline or aborted: music only */ });
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  private async load(context: AudioContext, url: string) {
    const response = await fetch(url, { signal: this.abort.signal });
    return context.decodeAudioData(await response.arrayBuffer());
  }

  /** No sound from a background tab. */
  private onVisibility = () => {
    if (!this.audio || !this.context || !this.enabled) return;
    if (document.hidden) {
      this.audio.pause();
      void this.context.suspend();
    } else {
      void this.context.resume();
      void this.audio.play().catch(() => {});
    }
  };

  dispose() {
    GESTURES.forEach((type) => window.removeEventListener(type, this.onGesture, { capture: true }));
    this.abort.abort();
    window.clearTimeout(this.pauseTimer);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.audio?.pause();
    this.audio?.removeAttribute("src");
    this.audio = null;
    void this.context?.close();
    this.context = null;
  }
}
