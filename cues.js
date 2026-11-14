// Turns Whisper chunks ({timestamp:[start,end], text}) into short on-screen captions of a few words each.
// shortcut: word times are spread evenly inside each chunk, use a word-timestamp Whisper model if captions drift.
export function makeCues(chunks, duration, wordsPerCue = 4) {
  const cues = [];
  for (const { timestamp: [start, end], text } of chunks) {
    const stop = end ?? duration;
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (!words.length || !(stop > start)) continue;
    const perWord = (stop - start) / words.length;
    for (let i = 0; i < words.length; i += wordsPerCue) {
      const group = words.slice(i, i + wordsPerCue);
      cues.push({ start: start + i * perWord, end: start + (i + group.length) * perWord, text: group.join(' ') });
    }
  }
  return cues;
}

export const cueAt = (cues, t) => cues.find(c => t >= c.start && t < c.end)?.text ?? '';
