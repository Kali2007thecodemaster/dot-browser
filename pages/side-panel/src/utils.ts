export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function generateNewTaskId(): string {
  /**
   * Generate a new task id based on the current timestamp and a random number.
   */
  return `${Date.now()}-${Math.floor(Math.random() * (999999 - 100000 + 1) + 100000)}`;
}

export function getCurrentTimestampStr(): string {
  /**
   * Get the current timestamp as a string in the format yyyy-MM-dd HH:mm:ss
   * using local timezone.
   *
   * @returns Formatted datetime string in local time
   */
  return new Date()
    .toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replace(',', '');
}
