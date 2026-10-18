/**
 * Site audio (see assets-src/audio/README.md), all off until the visitor turns sound on:
 * - music: "Slowburn – Relaxing LoFi Background Music" by JoelFazhari (Pixabay Content License), a seamless 93 s loop
 *   streamed through an <audio> element so it is never decoded into memory;
 * - two sounds made in FL Studio: a soft tech chime when the focused tech changes, and a countryside wind bed
 *   (wind chimes over a breeze) that fades in as the studio gives way to the sunset.
 */
const MUSIC = "/audio/ambient.mp3";
const WIND = "/audio/countryside-wind.mp3";
const CHIME = "/audio/tech-chime.mp3";
/** Levels: everything sits under the page, not on top of it. */
const VOLUME = 0.5;
const WIND_LEVEL = 0.55;
const CHIME_LEVEL = 0.35;
/** A fast scroll through the conveyor should not machine-gun the chime. */
const CHIME_GAP_MS = 220;

export class Ambience {
  private audio: HTMLAudioElement | null = null;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private wind: GainNode | null = null;
  private chimeBuffer: AudioBuffer | null = null;
  private enabled = false;
  private mix = 0;
  private lastChime = 0;
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
      void context.resume();
      void audio.play().catch(() => { /* blocked or offline: stay silent */ });
    } else {
      // Pause once faded out, so a muted page does not keep streaming or running the audio graph.
      this.pauseTimer = window.setTimeout(() => {
        audio.pause();
        void context.suspend();
      }, 1500);
    }
  }

  get isEnabled() {
    return this.enabled;
  }

  /** 0 = studio, 1 = sunset countryside: how much of the wind bed is heard. */
  setMix(mix: number) {
    if (Math.abs(mix - this.mix) < 0.01 && mix !== 0 && mix !== 1) return;
    this.mix = mix;
    if (this.context && this.wind) this.wind.gain.setTargetAtTime(WIND_LEVEL * Math.min(Math.max(mix, 0), 1), this.context.currentTime, 0.3);
  }

  /** The tech chime, for a newly focused tech on the conveyor. */
  chime() {
    const { context, master, chimeBuffer } = this;
    const now = performance.now();
    if (!this.enabled || !context || !master || !chimeBuffer || now - this.lastChime < CHIME_GAP_MS) return;
    this.lastChime = now;
    const source = context.createBufferSource();
    source.buffer = chimeBuffer;
    const gain = context.createGain();
    gain.gain.value = CHIME_LEVEL;
    source.connect(gain).connect(master);
    source.start();
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
    const music = context.createGain();
    music.gain.value = VOLUME;
    context.createMediaElementSource(audio).connect(music).connect(master);

    const wind = (this.wind = context.createGain());
    wind.gain.value = WIND_LEVEL * this.mix;
    wind.connect(master);
    void Promise.all([this.load(context, WIND), this.load(context, CHIME)])
      .then(([windBuffer, chimeBuffer]) => {
        if (this.context !== context) return;
        this.chimeBuffer = chimeBuffer;
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
