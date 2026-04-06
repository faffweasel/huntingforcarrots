export interface Bells {
  readonly begin: HTMLAudioElement;
  readonly complete: HTMLAudioElement;
}

/**
 * Creates and preloads both singing bowl Audio elements.
 * Call once on first user gesture, cache the returned object.
 */
export function loadBells(): Bells {
  const begin = new Audio('/audio/bell-begin.mp3');
  const complete = new Audio('/audio/bell-complete.mp3');
  begin.load();
  complete.load();
  return { begin, complete };
}

/**
 * Plays a singing bowl sample from the start.
 * Safe to call while already playing (rewinds first).
 */
export function strikeBell(audio: HTMLAudioElement): void {
  audio.currentTime = 0;
  audio.play();
}
