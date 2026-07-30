/**
 * Extract 11-character YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.length === 11 && !trimmed.includes('/')) {
    return trimmed;
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  return (match && match[2].length === 11) ? match[2] : trimmed;
}

/**
 * Parse time string HH:MM:SS or MM:SS to total seconds
 * Examples:
 *  "01:15:30" -> 4530
 *  "15:30" -> 930
 *  "45" -> 45
 */
export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  const parts = clean.split(':').map(p => parseInt(p, 10) || 0);
  
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }
  return 0;
}

/**
 * Convert total seconds to HH:MM:SS or MM:SS format
 * Examples:
 *  4530 -> "01:15:30"
 *  930 -> "15:30"
 */
export function formatSecondsToTime(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

export function formatSecondsToHHMMSS(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Format timestamp display with offset badge if any
 */
export function formatOffsetDisplay(seconds: number): string {
  if (seconds === 0) return '0s';
  const sign = seconds > 0 ? '+' : '';
  return `${sign}${seconds}s`;
}
