import { AudioDirector, type AudioCue, type AudioFrame } from "./AudioDirector";
import { audioLevel, motorMix } from "./AudioMix";

type Voice = {
  gain: GainNode;
  filter: BiquadFilterNode;
  source: AudioScheduledSourceNode;
};

/** Recorded foley over quiet, bounded atmospheric and musical beds. */
class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private voices = new Map<string, Voice>();
  private director = new AudioDirector();
  private muted = false;
  private volume = 0.65;
  private musicVolume = 0.25;
  private music: GainNode | null = null;
  private recordings = new Map<string, AudioBuffer>();
  private sampleStep = 0;
  private hidden = false;
  private lastMix = -1;
  private stepSide = 1;
  private activeShots = 0;
  private scoreLevel = 1;
  private lastMode: AudioFrame["mode"] = "menu";
  private surface: AudioFrame["destination"] = "moon";

  unlock() {
    if (typeof window === "undefined" || this.hidden) return;
    try {
      if (!this.context) this.create();
      if (this.context?.state === "suspended")
        void this.context.resume().catch(() => {});
    } catch {
      /* Gameplay remains available on browsers without Web Audio. */
    }
  }
  configure(muted: boolean, volume: number, musicVolume = 0.25) {
    this.muted = muted;
    this.volume = audioLevel(volume);
    this.musicVolume = audioLevel(musicVolume, 0.25);
    if (this.music && this.context)
      this.music.gain.setTargetAtTime(this.musicVolume, this.context.currentTime, 0.1);
    if (this.context && this.master)
      this.master.gain.setTargetAtTime(
        muted || this.hidden ? 0 : this.volume * 0.55,
        this.context.currentTime,
        0.04,
      );
  }
  setHidden(hidden: boolean) {
    this.hidden = hidden;
    this.configure(this.muted, this.volume, this.musicVolume);
    if (hidden) {
      this.silence();
      if (this.context?.state === "running")
        void this.context.suspend().catch(() => {});
    } else {
      if (this.context?.state === "suspended")
        void this.context.resume().catch(() => {});
      if (this.lastMode === "menu") this.menu();
    }
  }
  private create() {
    const context = new AudioContext();
    this.context = context;
    const master = context.createGain();
    this.master = master;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -13;
    limiter.knee.value = 18;
    limiter.ratio.value = 3;
    master.connect(limiter).connect(context.destination);
    this.music = context.createGain();
    this.music.connect(master);
    void this.loadRecordings(context);
    const noise = context.createBuffer(
      1,
      context.sampleRate * 4,
      context.sampleRate,
    );
    const samples = noise.getChannelData(0);
    let seed = 7, low = 0, mid = 0;
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      const white = (seed >>> 0) / 2147483648 - 1;
      low += (white - low) * .017;
      mid += (white - mid) * .16;
      const edge = Math.min(1, i / 2200, (samples.length - 1 - i) / 2200);
      samples[i] = (low * 2.2 + mid * .6 + white * .12) * edge;
    }
    this.noise = noise;
    for (const [name, frequency, noisy] of [
      ["air", 360, true],
      ["motor", 57, false],
      ["drivetrain", 155, true],
      ["tool", 145, true],
      ["engine", 90, true],
      ["room", 350, true],
      ["scoreLow", 82.41, false],
      ["scoreHigh", 123.47, false],
    ] as const) {
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = noisy ? frequency : 700;
      const gain = context.createGain();
      gain.gain.value = 0;
      let source: AudioBufferSourceNode | OscillatorNode;
      if (noisy) {
        source = context.createBufferSource();
        source.buffer = noise;
        source.loop = true;
      } else {
        source = context.createOscillator();
        source.type = "sine";
        source.frequency.value = frequency;
      }
      source.connect(filter).connect(gain).connect(name.startsWith("score") ? this.music : master);
      source.start();
      this.voices.set(name, { gain, filter, source });
    }
    this.configure(this.muted, this.volume, this.musicVolume);
    this.menu();
    // Slow intervals sit under the equipment and the exterior's quiet suit mix.
    window.setInterval(() => {
      if (context.state !== "running" || this.hidden) return;
      const chord = [82.41, 73.42, 98, 65.41][Math.floor(context.currentTime / 32) % 4];
      const swell = .55 + .45 * Math.sin(context.currentTime * .19) ** 2;
      this.mix("scoreLow", .034 * this.scoreLevel * swell, chord);
      this.mix("scoreHigh", .013 * this.scoreLevel * swell, chord * 1.5);
    }, 250);
  }
  private async loadRecordings(context: AudioContext) {
    const names = ["footstep_concrete_000", "footstep_concrete_001", "footstep_concrete_002",
      "impactMetal_heavy_000", "impactMetal_medium_001", "impactMetal_light_000",
      "impactPlate_light_000", "doorOpen_000"];
    await Promise.allSettled(names.map(async name => {
      const response = await fetch(`/audio/${name}.ogg`);
      if (!response.ok) return;
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      this.recordings.set(name, buffer);
    }));
  }
  private recorded(name: string, volume: number, rate = 1, pan = 0, delay = 0, cutoff = 3600) {
    const context = this.context!, buffer = this.recordings.get(name);
    if (!buffer) return false;
    const source = context.createBufferSource(), filter = context.createBiquadFilter(),
      gain = context.createGain(), panner = context.createStereoPanner();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const start = context.currentTime + delay, end = start + buffer.duration / rate;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + Math.min(0.008, buffer.duration / 4));
    gain.gain.setTargetAtTime(0, Math.max(start + 0.01, end - 0.035), 0.012);
    panner.pan.value = pan;
    source.connect(filter).connect(gain).connect(panner).connect(this.master!);
    this.activeShots++;
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); panner.disconnect(); this.activeShots--; };
    source.start(start);
    return true;
  }
  private mix(name: string, level: number, frequency?: number) {
    const voice = this.voices.get(name),
      context = this.context;
    if (!voice || !context) return;
    voice.gain.gain.setTargetAtTime(level, context.currentTime, 0.22);
    if (frequency !== undefined) {
      if ("frequency" in voice.source)
        (voice.source as OscillatorNode).frequency.setTargetAtTime(
          frequency,
          context.currentTime,
          0.12,
        );
      else
        voice.filter.frequency.setTargetAtTime(
          frequency,
          context.currentTime,
          0.15,
        );
    }
  }
  menu() {
    this.lastMode = "menu";
    this.scoreLevel = 1;
    this.silence();
    this.mix("scoreLow", 0.034);
    this.mix("scoreHigh", 0.013);
    this.director.reset();
  }
  silence() {
    for (const name of this.voices.keys()) this.mix(name, 0);
  }
  update(frame: AudioFrame, dt: number) {
    if (!this.context || this.hidden || this.context.state !== "running")
      return;
    this.lastMode = frame.mode;
    this.surface = frame.destination;
    for (const cue of this.director.update(frame, dt))
      this.cue(cue, frame.inside);
    const now = this.context.currentTime;
    if (now - this.lastMix < 0.06) return;
    this.lastMix = now;
    const active = !frame.paused;
    const surface = active && frame.mode === "surface";
    const crash = active && frame.mode === "crash";
    const rocket = active && frame.mode === "rocket";
    const wind = frame.destination === "mars" && !frame.inside;
    this.mix(
      "air",
      surface ? (wind ? (frame.storm ? .095 : .022) : .007 + Math.min(frame.speed, 5) * .0012) : 0,
      wind ? (frame.storm ? 680 : 390) : 270,
    );
    this.mix("room", surface && frame.inside ? .021 : 0, 360);
    const motor = motorMix(frame.vehicleSpeed, surface && frame.driving);
    this.mix("motor", motor.gain * .47, 61 * motor.rate);
    this.mix("drivetrain", motor.gain * 1.26, 230 + motor.rate * 270);
    this.mix(
      "tool",
      surface && frame.working ? .026 : surface && frame.airlock ? .036 : 0,
      frame.airlock ? 960 : 540,
    );
    this.mix(
      "engine",
      crash
        ? frame.elapsed < 2
          ? 0.2
          : frame.elapsed < 13
            ? 0.1
            : 0
        : rocket && frame.elapsed >= 4 && frame.elapsed < 25
          ? 0.24
          : 0,
      rocket ? 520 : 320,
    );
    // Leave room for warning cues and close-up mechanical work.
    this.scoreLevel = frame.paused ? .2 : surface ? (frame.oxygen < 22 || frame.working || frame.airlock ? .1 : .24) : .85;
  }
  cue(cue: AudioCue, inside = false) {
    const context = this.context;
    if (
      !context ||
      !this.master ||
      this.muted ||
      this.hidden ||
      context.state !== "running" ||
      this.activeShots >= 24
    )
      return;
    // Small variations prevent a repeated bootstep from sounding like a metronome.
    const variation = 0.94 + (this.sampleStep++ % 5) * 0.027;
    if (cue === "step" || cue === "land") {
      const landed = cue === "land", mars = this.surface === "mars";
      this.stepSide *= -1;
      const pan = this.stepSide * .15;
      if (inside) this.recorded(`footstep_concrete_00${this.sampleStep % 3}`, landed ? .18 : .09, variation * .87, pan, 0, 1450);
      this.shot(true, (inside ? 360 : mars ? 1460 : 810) * variation, landed ? .19 : .094, landed ? .25 : .13, pan);
      this.shot(true, mars ? 690 : 420, .115, inside ? .025 : .061, pan, .046);
      if (landed) this.shot(false, 65, .15, .09);
      return;
    }
    if ((cue === "debris" || cue === "separate") && this.recorded("impactMetal_medium_001", 0.24, 0.86, -0.25)) {
      this.recorded("impactMetal_light_000", 0.15, 0.73, 0.32, 0.24);
      return;
    }
    if (cue === "click" && this.recorded("impactPlate_light_000", .045, .91, 0, 0, 1150)) return;
    if (cue === "impact") {
      this.shot(true, 375, 1.42, .56);
      this.shot(false, 47, .86, .32);
      this.recorded("impactMetal_heavy_000", .21, .74, -.17, .065, 1640);
      this.shot(true, 1480, .38, .17, -.28, .13);
    } else if (cue === "debris" || cue === "separate") {
      for (let i = 0; i < 5; i++)
        this.shot(
          true,
          800 + i * 430,
          0.25 + i * 0.05,
          0.14,
          (i % 2 ? -1 : 1) * 0.5,
          i * 0.13,
        );
    } else if (cue === "ignite") {
      this.shot(true, 300, 1.4, 0.3);
      this.shot(false, 60, 0.8, 0.2);
    } else if (cue === "jump") this.shot(true, 510, .105, .045);
    else if (cue === "airlock") {
      this.recorded("doorOpen_000", .10, .75, 0, 0, 1060);
      this.shot(true, 890, .8, .125);
      this.shot(true, 290, .44, .07, .13, .17);
    } else if (cue === "success") {
      this.shot(false, 196, .48, .037);
      this.shot(false, 293.66, .65, .022, 0, .07);
    } else if (cue === "warning") {
      this.shot(false, 330, .18, .085);
      this.shot(false, 330, .17, .067, 0, .31);
    } else if (cue === "radio") {
      this.shot(true, 1670, .17, .14);
      this.shot(true, 860, .08, .08, 0, .16);
    } else this.shot(true, 980, .06, .06);
  }
  private shot(
    noisy: boolean,
    frequency: number,
    duration: number,
    volume: number,
    pan = 0,
    delay = 0,
  ) {
    const context = this.context!;
    const start = context.currentTime + delay,
      end = start + duration;
    const gain = context.createGain(),
      filter = context.createBiquadFilter(),
      panner = context.createStereoPanner();
    let source: AudioBufferSourceNode | OscillatorNode;
    if (noisy) {
      source = context.createBufferSource();
      source.buffer = this.noise;
    } else {
      source = context.createOscillator();
      source.type = "sine";
      source.frequency.setValueAtTime(frequency, start);
      source.frequency.exponentialRampToValueAtTime(
        Math.max(25, frequency < 150 ? frequency * 0.65 : frequency),
        end,
      );
    }
    filter.type = "lowpass";
    filter.frequency.value = noisy ? frequency : 4000;
    panner.pan.value = pan;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    source.connect(filter).connect(gain).connect(panner).connect(this.master!);
    this.activeShots++;
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      panner.disconnect();
      this.activeShots--;
    };
    if (noisy) (source as AudioBufferSourceNode).start(start, 0.16 + (this.sampleStep % 17) * .07);
    else source.start(start);
    source.stop(end + 0.02);
  }
}
export const gameAudio = new GameAudio();

