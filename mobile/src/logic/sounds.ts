import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/**
 * Tiny UI sounds (synthesized WAVs in assets/sounds). Respect the silent switch,
 * and never throw: a missing audio session must not break the scan reveal.
 * TODO(ios-logic): if you add voice clips later, reuse `player()` so there is one audio mode.
 */
let enabled = true;
/** Settings → Sounds. */
export function setSoundsEnabled(on: boolean) {
  enabled = on;
}

let players: { pop: AudioPlayer; tada: AudioPlayer } | null = null;
let initPromise: Promise<void> | null = null;

function init(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await setAudioModeAsync({ playsInSilentMode: false });
      const pop = createAudioPlayer(require('@/assets/sounds/pop.wav'));
      const tada = createAudioPlayer(require('@/assets/sounds/tada.wav'));
      pop.volume = 0.5;
      tada.volume = 0.5;
      players = { pop, tada };
    })().catch(() => {
      players = null;
    });
  }
  return initPromise;
}

async function play(name: 'pop' | 'tada') {
  if (!enabled) return;
  try {
    await init();
    const p = players?.[name];
    if (!p) return;
    p.seekTo(0);
    p.play();
  } catch {
    // sound is decoration; stay silent
  }
}

export const playPop = () => play('pop');
export const playTada = () => play('tada');
