export function timeAgoShort(date: Date) {
  const now = Date.now();
  const diffMs = now - new Date(date).getTime(); // assuming date is ISO string or timestamp
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 45) return "now"; // or "just now"
  if (seconds < 90) return "1m ago";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}
