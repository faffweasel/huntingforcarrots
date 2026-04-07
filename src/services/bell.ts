export interface Bells {
  readonly single: HTMLAudioElement;
  readonly zazen: HTMLAudioElement;
}

/**
 * Creates and preloads both singing bowl Audio elements.
 * Call once on first user gesture, cache the returned object.
 */
export function loadBells(): Bells {
  const single = new Audio('/audio/bell-single.mp3');
  const zazen = new Audio('/audio/bell-zazen.mp3');
  single.preload = 'auto';
  zazen.preload = 'auto';
  single.load();
  zazen.load();
  return { single, zazen };
}

/**
 * Plays a bell and waits for it to finish. Always resolves (never rejects)
 * so a failed bell never blocks the timer from starting.
 */
export function strikeBellAndWait(audio: HTMLAudioElement): Promise<void> {
  return new Promise<void>((resolve) => {
    audio.currentTime = 0;
    audio.addEventListener('ended', () => resolve(), { once: true });
    audio.addEventListener('error', () => resolve(), { once: true });
    audio.play().catch(() => resolve());
  });
}

/**
 * Fire-and-forget bell strike. Errors are silently caught.
 */
export function strikeBell(audio: HTMLAudioElement): void {
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
