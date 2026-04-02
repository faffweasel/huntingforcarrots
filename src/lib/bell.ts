export interface BellBuffers {
  readonly begin: AudioBuffer;
  readonly complete: AudioBuffer;
}

async function fetchAndDecode(audioContext: AudioContext, url: string): Promise<AudioBuffer> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return audioContext.decodeAudioData(arrayBuffer);
}

/**
 * Fetches and decodes both singing bowl samples.
 * Call once on first user gesture, cache the returned buffers.
 */
export async function loadBells(audioContext: AudioContext): Promise<BellBuffers> {
  const [begin, complete] = await Promise.all([
    fetchAndDecode(audioContext, '/audio/bell-begin.mp3'),
    fetchAndDecode(audioContext, '/audio/bell-complete.mp3'),
  ]);
  return { begin, complete };
}

/**
 * Plays a singing bowl sample. The source node is fire-and-forget —
 * it disconnects and is garbage-collected after playback ends.
 */
export function strikeBell(audioContext: AudioContext, buffer: AudioBuffer): void {
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start();
}
