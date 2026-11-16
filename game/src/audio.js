import { S } from './state.js';
let context, master, noiseBuffer;
export function unlockAudio() {
  if (!context) {
    context = new AudioContext(); master = context.createGain(); master.gain.value = .2; master.connect(context.destination);
    noiseBuffer = context.createBuffer(1, context.sampleRate * .2, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    // Fixed sound texture; audio must never consume simulation RNG.
    for (let i = 0; i < data.length; i++) data[i] = Math.sin(i * 91.53) * Math.sin(i * 17.19);
  }
  context.resume();
}
export function sound(kind, volume = 1) {
  if (!context || S.muted || S.shot) return;
  const t = context.currentTime, gain = context.createGain(); gain.connect(master);
  let freq = 500, duration = .07, level = .2 * volume;
  if (kind === 'rifle' || kind === 'smg' || kind === 'sniper' || kind === 'pistol' || kind === 'blast') {
    const source = context.createBufferSource(), filter = context.createBiquadFilter();
    source.buffer = noiseBuffer; filter.type = 'lowpass'; filter.frequency.value = kind === 'sniper' ? 1800 : 3000;
    source.connect(filter); filter.connect(gain); source.start(t); source.stop(t + .14);
    freq = kind === 'blast' ? 46 : kind === 'sniper' ? 62 : 110; duration = kind === 'blast' ? .5 : .14; level = .7 * volume;
  } else if (kind === 'head') { freq = 1500; duration = .14; }
  else if (kind === 'hit') freq = 850;
  else if (kind === 'step') { freq = 90; duration = .03; level = .1; }
  else if (kind === 'reload') { freq = 340; duration = .045; }
  else if (kind === 'win') { freq = 660; duration = .4; }
  else if (kind === 'lose') { freq = 150; duration = .4; }
  else if (kind === 'beep') { freq = 1100; duration = .08; }
  const osc = context.createOscillator(); osc.type = kind === 'beep' ? 'sine' : 'triangle'; osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * .65), t + duration);
  gain.gain.setValueAtTime(Math.max(.001, level), t); gain.gain.exponentialRampToValueAtTime(.001, t + duration);
  osc.connect(gain); osc.start(t); osc.stop(t + duration); osc.onended = () => { osc.disconnect(); gain.disconnect(); };
}
