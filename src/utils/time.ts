export function combineDateAndTime(date: Date, startTime: string): Date {
  const [hoursRaw, minutesRaw] = startTime.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

export function isWithinWindow(target: Date, windowMinutes: number, now = new Date()): boolean {
  const diffMs = now.getTime() - target.getTime();
  return diffMs >= 0 && diffMs <= windowMinutes * 60 * 1000;
}
