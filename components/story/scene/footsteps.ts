/**
 * Procedural footsteps (Web Audio, no files): a short filtered noise burst plus a low thump.
 * `surface` blends from the hard studio floor (0) to sunset grass (1).
 * The AudioContext is only created after the visitor turns sound on (a user gesture).
 */
export class Footsteps {
  private context: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private master: GainNode | null = null;
  private enabled = false;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled && !this.context) this.init();
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(enabled ? 0.55 : 0, this.context.currentTime, 0.05);
      if (enabled) void this.context.resume();
    }
  }

  get isEnabled() {
    return this.enabled;
  }

  private init() {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.context = new Ctor();
    this.master = this.context.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.context.destination);
    const length = Math.floor(this.context.sampleRate * 0.25);
    this.noise = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
  }

  /**
   * @param surface 0 = studio floor, 1 = grass
   * @param pan -1..1 stereo position (left/right foot)
   * @param strength 0..1, e.g. landing after a hop is stronger
   */
  step(surface: number, pan: number, strength = 1) {
    const ctx = this.context;
    if (!this.enabled || !ctx || !this.noise || !this.master || ctx.state !== "running") return;
    const now = ctx.currentTime;
    const jitter = 0.9 + Math.random() * 0.2;
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan * 0.35;
    panner.connect(this.master);

    // Scuff / rustle: noise, brighter on grass, tighter on the hard floor.
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    source.playbackRate.value = (1.1 - surface * 0.35) * jitter;
    const filter = ctx.createBiquadFilter();
    filter.type = surface > 0.5 ? "highpass" : "bandpass";
    filter.frequency.value = surface > 0.5 ? 1800 * jitter : 900 * jitter;
    filter.Q.value = surface > 0.5 ? 0.4 : 1.2;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime((0.18 + surface * 0.12) * strength, now + 0.006);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09 + surface * 0.08);
    source.connect(filter).connect(noiseGain).connect(panner);
    source.start(now);
    source.stop(now + 0.25);

    // Body: a soft low thump, stronger on the studio floor.
    const thump = ctx.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(110 * jitter, now);
    thump.frequency.exponentialRampToValueAtTime(55, now + 0.08);
    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.0001, now);
    thumpGain.gain.exponentialRampToValueAtTime((0.22 - surface * 0.12) * strength, now + 0.005);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    thump.connect(thumpGain).connect(panner);
    thump.start(now);
    thump.stop(now + 0.14);
  }

  dispose() {
    void this.context?.close();
    this.context = null;
  }
}
