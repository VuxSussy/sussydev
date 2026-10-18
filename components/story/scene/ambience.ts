/**
 * Chill ambient music made in FL Studio (see assets-src/audio/README.md): soft electric keys for the studio and a
 * warm countryside pad with a light breeze for the road and the sunset. Both loops play together and crossfade with the
 * story's sunset mix. The AudioContext is only created after the visitor turns sound on (a user gesture).
 */
const TRACKS = [
  // `seconds` is the musical loop length (8 bars at 130 BPM, played half-time); looping on it skips any MP3 padding.
  { url: "/audio/tech.mp3", seconds: (8 * 4 * 60) / 130 },
  { url: "/audio/countryside.mp3", seconds: (8 * 4 * 60) / 130 },
] as const;
/** Background level: the music should sit under the page, not on top of it. */
const VOLUME = 0.4;

export class Ambience {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private gains: GainNode[] = [];
  private enabled = false;
  private mix = 0;
  private abort = new AbortController();

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled && !this.context) this.init();
    const ctx = this.context;
    if (!ctx || !this.master) return;
    this.master.gain.setTargetAtTime(enabled ? VOLUME : 0, ctx.currentTime, 0.25);
    if (enabled) void ctx.resume();
  }

  get isEnabled() {
    return this.enabled;
  }

  /** 0 = studio (tech loop), 1 = sunset countryside (pad and wind); an equal-power crossfade. */
  setMix(mix: number) {
    if (Math.abs(mix - this.mix) < 0.01 && mix !== 0 && mix !== 1) return;
    this.mix = mix;
    this.applyMix(0.3);
  }

  private applyMix(smoothing: number) {
    const ctx = this.context;
    if (!ctx || this.gains.length < 2) return;
    const angle = (Math.min(Math.max(this.mix, 0), 1) * Math.PI) / 2;
    this.gains[0].gain.setTargetAtTime(Math.cos(angle), ctx.currentTime, smoothing);
    this.gains[1].gain.setTargetAtTime(Math.sin(angle), ctx.currentTime, smoothing);
  }

  private init() {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = (this.context = new Ctor());
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    this.gains = TRACKS.map(() => {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(this.master!);
      return gain;
    });
    document.addEventListener("visibilitychange", this.onVisibility);
    void Promise.all(TRACKS.map((track) => this.load(ctx, track.url)))
      .then((buffers) => {
        if (this.context !== ctx) return;
        // Started together, so the two loops (the same length) stay in step and crossfade on the beat.
        const at = ctx.currentTime + 0.05;
        buffers.forEach((buffer, index) => {
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          source.loopEnd = Math.min(TRACKS[index].seconds, buffer.duration);
          source.connect(this.gains[index]);
          source.start(at);
        });
        this.applyMix(0.05);
      })
      .catch(() => { /* offline or aborted: stay silent */ });
  }

  private async load(ctx: AudioContext, url: string) {
    const response = await fetch(url, { signal: this.abort.signal });
    return ctx.decodeAudioData(await response.arrayBuffer());
  }

  /** No music from a background tab. */
  private onVisibility = () => {
    if (!this.context) return;
    if (document.hidden) void this.context.suspend();
    else if (this.enabled) void this.context.resume();
  };

  dispose() {
    this.abort.abort();
    document.removeEventListener("visibilitychange", this.onVisibility);
    void this.context?.close();
    this.context = null;
  }
}
