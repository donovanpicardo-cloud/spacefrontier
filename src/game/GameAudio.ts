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
    limiter.threshold.value = -16;
    limiter.knee.value = 16;
    limiter.ratio.value = 5;
    master.connect(limiter).connect(context.destination);
    this.music = context.createGain();
    this.music.connect(master);
    void this.loadRecordings(context);
    const noise = context.createBuffer(
      1,
      context.sampleRate * 2,
      context.sampleRate,
    );
    const samples = noise.getChannelData(0);
    let seed = 7,
      smooth = 0;
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      smooth = (smooth + (((seed >>> 0) / 4294967296) * 2 - 1) * 0.08) / 1.08;
      samples[i] = smooth * 3;
    }
    this.noise = noise;
    for (const [name, frequency, noisy] of [
      ["air", 360, true],
      ["motor", 76, false],
      ["tool", 145, true],
      ["engine", 90, true],
      ["room", 350, true],
      ["scoreLow", 110, false],
      ["scoreHigh", 164.81, false],
      ["scoreAir", 220, false],
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
        source.type = name === "motor" ? "triangle" : "sine";
        source.frequency.value = frequency;
      }
      source.connect(filter).connect(gain).connect(name.startsWith("score") ? this.music : master);
      source.start();
      this.voices.set(name, { gain, filter, source });
    }
    this.configure(this.muted, this.volume, this.musicVolume);
    this.menu();
    // Three sustained voices evolve slowly; no timers or note sources accumulate.
    window.setInterval(() => {
      if (context.state !== "running" || this.hidden) return;
      const chord = [110, 130.81, 98, 146.83][
        Math.floor(context.currentTime / 24) % 4
      ];
      const breathe = 0.8 + 0.2 * Math.sin(context.currentTime * 0.12);
      this.mix("scoreLow", 0.035 * this.scoreLevel * breathe, chord);
      this.mix("scoreHigh", 0.018 * this.scoreLevel, chord * 1.5);
      this.mix("scoreAir", 0.009 * this.scoreLevel * breathe, chord * 2);
    }, 250);
  }
  private async loadRecordings(context: AudioContext) {
    const names = ["footstep_concrete_000", "footstep_concrete_001", "footstep_concrete_002",
      "footstep_snow_000", "footstep_snow_001", "footstep_snow_002",
      "impactMetal_heavy_000", "impactMetal_medium_001", "impactMetal_light_000",
      "impactPlate_light_000", "doorOpen_000", "engineCircular_000",
      "spaceEngineLow_000", "explosionCrunch_000"];
    await Promise.allSettled(names.map(async name => {
      const response = await fetch(`/audio/${name}.ogg`);
      if (!response.ok) return;
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      this.recordings.set(name, buffer);
      const voiceName = name === "engineCircular_000" ? "motor" : name === "spaceEngineLow_000" ? "engine" : null;
      if (voiceName) {
        const voice = this.voices.get(voiceName);
        if (!voice) return;
        voice.source.stop();
        voice.source.disconnect();
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(voice.filter);
        source.start();
        voice.source = source;
      }
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
    this.mix("scoreLow", 0.035);
    this.mix("scoreHigh", 0.018);
    this.mix("scoreAir", 0.009);
    this.director.reset();
  }
  silence() {
    for (const name of this.voices.keys()) this.mix(name, 0);
  }
  update(frame: AudioFrame, dt: number) {
    if (!this.context || this.hidden || this.context.state !== "running")
      return;
    this.lastMode = frame.mode;
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
      surface ? (wind ? (frame.storm ? 0.14 : 0.045) : 0.009) : 0,
      wind ? 580 : 250,
    );
    this.mix("room", surface && frame.inside ? 0.028 : 0, 350);
    const motor = motorMix(frame.vehicleSpeed, surface && frame.driving);
    this.mix(
      "motor",
      motor.gain,
      this.recordings.has("engineCircular_000") ? 1700 : 52 + Math.abs(frame.vehicleSpeed) * 15,
    );
    const motorSource = this.voices.get("motor")?.source;
    if (motorSource && "playbackRate" in motorSource)
      (motorSource as AudioBufferSourceNode).playbackRate.setTargetAtTime(motor.rate, now, 0.35);
    this.mix(
      "tool",
      surface && frame.working ? 0.035 : surface && frame.airlock ? 0.045 : 0,
      frame.airlock ? 1200 : 650,
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
    const score = frame.paused ? 0.25 : surface ? 0.45 : 1;
    this.scoreLevel = score;
    this.mix("scoreLow", 0.035 * score);
    this.mix("scoreHigh", 0.018 * score);
    this.mix("scoreAir", 0.009 * score);
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
      const name = `footstep_${inside ? "concrete" : "snow"}_00${this.sampleStep % 3}`;
      if (this.recorded(name, cue === "land" ? 0.32 : 0.2, variation * (inside ? 0.92 : 0.82), (this.sampleStep % 2 ? 1 : -1) * 0.12, 0, inside ? 2800 : 1300)) return;
    }
    if (cue === "impact" && this.recorded("explosionCrunch_000", 0.65, 0.72, 0, 0, 1900)) {
      this.recorded("impactMetal_heavy_000", 0.38, 0.7, -0.2, 0.08, 2400);
      this.shot(false, 44, 1.2, 0.2);
      return;
    }
    if ((cue === "debris" || cue === "separate") && this.recorded("impactMetal_medium_001", 0.24, 0.86, -0.25)) {
      this.recorded("impactMetal_light_000", 0.15, 0.73, 0.32, 0.24);
      return;
    }
    if (cue === "airlock" && this.recorded("doorOpen_000", 0.22, 0.86, 0, 0, 2000)) return;
    if (cue === "click" && this.recorded("impactPlate_light_000", 0.075, 1.3, 0, 0, 1600)) return;
    if (cue === "step") {
      this.stepSide *= -1;
      this.shot(
        true,
        inside ? 800 : 1800,
        0.12,
        inside ? 0.12 : 0.18,
        this.stepSide * 0.2,
      );
      this.shot(false, inside ? 130 : 85, 0.1, 0.12);
    } else if (cue === "impact") {
      this.shot(true, 750, 1.8, 0.65);
      this.shot(false, 48, 1.3, 0.44);
      this.shot(true, 2300, 0.48, 0.25, -0.35, 0.12);
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
    } else if (cue === "land") {
      this.shot(true, inside ? 700 : 1500, 0.22, 0.19);
      this.shot(false, 65, 0.22, 0.16);
    } else if (cue === "jump") this.shot(true, 900, 0.18, 0.08);
    else if (cue === "airlock") {
      this.shot(false, 110, 0.5, 0.12);
      this.shot(true, 2100, 0.65, 0.12);
    } else if (cue === "success") {
      for (const [i, frequency] of [392, 523.25].entries())
        this.shot(false, frequency, 0.3, 0.045, 0, i * 0.14);
    } else if (cue === "warning") {
      this.shot(false, 530, 0.19, 0.13);
      this.shot(false, 440, 0.19, 0.11, 0, 0.28);
    } else if (cue === "radio") {
      this.shot(true, 2600, 0.15, 0.1);
      this.shot(false, 960, 0.12, 0.08, 0, 0.12);
      this.shot(false, 720, 0.14, 0.07, 0, 0.25);
    } else this.shot(false, 620, 0.09, 0.07);
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
    source.start(start);
    source.stop(end + 0.02);
  }
}
export const gameAudio = new GameAudio();
