const DAY_MS = 86_400_000;

const timeOf = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

// "Today, 2:45 PM", "Yesterday, 4:20 PM", or "Nov 18, 9:05 AM".
export function formatWhen(timestamp: number, now = Date.now()): string {
  const d = new Date(timestamp);
  const days = Math.round((startOfDay(new Date(now)) - startOfDay(d)) / DAY_MS);
  if (days === 0) return `Today, ${timeOf(d)}`;
  if (days === 1) return `Yesterday, ${timeOf(d)}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeOf(d)}`;
}
