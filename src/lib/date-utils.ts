/**
 * Utility functions for date and duration formatting
 */

export function formatDurationSeconds(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 0) return "0s";
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0 && minutes === 0) {
    return `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function formatDigitalTimer(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatDateFull(dateInput: string | Date | undefined): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatTimeOnly(dateInput: string | Date | undefined): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function formatTimeRange(
  startInput: string | Date | undefined,
  endInput?: string | Date | null
): string {
  if (!startInput) return "";
  const startTime = formatTimeOnly(startInput);
  if (!endInput) return `Started at ${startTime} (In progress)`;
  const endTime = formatTimeOnly(endInput);
  return `${startTime} – ${endTime}`;
}

export function getInitials(name?: string): string {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
