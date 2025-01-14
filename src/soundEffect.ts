import {
  Params,
  SoundEffect as JsfxrSoundEffect,
  setRandomFunction,
} from "../lib/jsfxr/sfxr";
import { audioContext, getQuantizedTime } from "./audio";
import { random } from "./random";
import { times } from "./util";

export type SoundEffect = {
  type: Type;
  params;
  volume: number;
  buffers: AudioBuffer[];
  bufferSourceNodes: AudioBufferSourceNode[];
  gainNode: GainNode;
  isPlaying: boolean;
  playedTime: number;
};

export const types = [
  "coin",
  "laser",
  "explosion",
  "powerUp",
  "hit",
  "jump",
  "select",
  "synth",
  "tone",
  "click",
  "random",
] as const;
export type Type = typeof types[number];
const typeFunctionNames = {
  coin: "pickupCoin",
  laser: "laserShoot",
  explosion: "explosion",
  powerUp: "powerUp",
  hit: "hitHurt",
  jump: "jump",
  select: "blipSelect",
  synth: "synth",
  tone: "tone",
  click: "click",
  random: "random",
};

let soundEffects: SoundEffect[];

export function init() {
  soundEffects = [];
  setRandomFunction(() => random.get());
}

export function play(soundEffect: SoundEffect) {
  playSoundEffect(soundEffect);
}

export function update() {
  const currentTime = audioContext.currentTime;
  soundEffects.forEach((se) => {
    updateSoundEffect(se, currentTime);
  });
}

export function add(
  type: Type,
  seed: number,
  count = 2,
  volume = 0.1,
  freq: number = undefined,
  attackRatio: number = 1,
  sustainRatio: number = 1
): SoundEffect {
  const params = times(count, (i) => {
    random.setSeed(seed + i * 1063);
    let p = new Params();
    p[typeFunctionNames[type]]();
    if (freq != null) {
      p.p_base_freq = freq;
    }
    p.p_env_attack *= attackRatio;
    p.p_env_sustain *= sustainRatio;
    return p;
  });
  const se = fromJSON({ type, params, volume });
  soundEffects.push(se);
  return se;
}

export function remove(tse: SoundEffect) {
  soundEffects = soundEffects.filter((se) => se !== tse);
}

export function setVolume(soundEffect: SoundEffect, volume: number) {
  soundEffect.gainNode.gain.value = volume;
}

function playSoundEffect(soundEffect: SoundEffect) {
  soundEffect.isPlaying = true;
}

function updateSoundEffect(soundEffect: SoundEffect, currentTime: number) {
  if (!soundEffect.isPlaying) {
    return;
  }
  soundEffect.isPlaying = false;
  const time = getQuantizedTime(currentTime);
  if (soundEffect.playedTime == null || time > soundEffect.playedTime) {
    playLater(soundEffect, time);
    soundEffect.playedTime = time;
  }
}

export function playLater(
  soundEffect: SoundEffect,
  when: number,
  detune: number = undefined
) {
  soundEffect.bufferSourceNodes = [];
  soundEffect.buffers.forEach((b) => {
    const bufferSourceNode = audioContext.createBufferSource();
    bufferSourceNode.buffer = b;
    if (detune != null && bufferSourceNode.playbackRate != null) {
      const semitoneRatio = Math.pow(2, 1 / 12);
      bufferSourceNode.playbackRate.value = Math.pow(semitoneRatio, detune);
    }
    bufferSourceNode.start =
      bufferSourceNode.start || (bufferSourceNode as any).noteOn;
    bufferSourceNode.connect(soundEffect.gainNode);
    bufferSourceNode.start(when);
    soundEffect.bufferSourceNodes.push(bufferSourceNode);
  });
}

export function stop(soundEffect: SoundEffect, when: number = undefined) {
  if (soundEffect.bufferSourceNodes != null) {
    soundEffect.bufferSourceNodes.forEach((n) => {
      if (when == null) {
        n.stop();
      } else {
        n.stop(when);
      }
    });
    soundEffect.bufferSourceNodes = undefined;
  }
}

export function toJson(soundEffect: SoundEffect) {
  return {
    type: soundEffect.type,
    params: soundEffect.params,
    volume: soundEffect.volume,
  };
}

export function fromJSON(json): SoundEffect {
  const type = json.type;
  const params = json.params;
  const volume = json.volume;
  const buffers = params.map((p) => {
    const s = new JsfxrSoundEffect(p).generate();
    if (s.buffer.length === 0) {
      return audioContext.createBuffer(1, 1, s.sampleRate);
    }
    const buffer = audioContext.createBuffer(1, s.buffer.length, s.sampleRate);
    var channelData = buffer.getChannelData(0);
    channelData.set(s.buffer);
    return buffer;
  });
  const gainNode = audioContext.createGain();
  gainNode.gain.value = volume;
  gainNode.connect(audioContext.destination);
  return {
    type,
    params,
    volume,
    buffers,
    bufferSourceNodes: undefined,
    gainNode,
    isPlaying: false,
    playedTime: undefined,
  };
}
