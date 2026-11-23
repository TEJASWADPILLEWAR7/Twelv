import { Task } from "../types";

export function formatTime12h(time24: string | null | undefined): string | null {
  if (!time24) {
    return null;
  }
  const match = /^(\d{2}):(\d{2})$/.exec(time24.trim());
  if (!match) {
    return null;
  }
  const hours24 = Number(match[1]);
  const minutes = match[2];
  if (hours24 < 0 || hours24 > 23) {
    return null;
  }
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return hours12 + ":" + minutes + " " + period;
}

export function to24Hour(hour12: number, minute: number, period: "AM" | "PM"): string {
  let h = hour12 % 12;
  if (period === "PM") {
    h += 12;
  }
  return String(h).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
}

export function from24Hour(time24: string | null | undefined): {
  hour12: number;
  minute: number;
  period: "AM" | "PM";
} {
  if (!time24) {
    return { hour12: 9, minute: 0, period: "AM" };
  }
  const match = /^(\d{2}):(\d{2})$/.exec(time24.trim());
  if (!match) {
    return { hour12: 9, minute: 0, period: "AM" };
  }
  const h24 = Number(match[1]);
  const m = Number(match[2]);
  const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour12, minute: m, period };
}

export function compareTasksByTimeOnDay(a: Task, b: Task): number {
  const timeA = a.scheduledTime;
  const timeB = b.scheduledTime;
  if (timeA && timeB) {
    const cmp = timeA.localeCompare(timeB);
    if (cmp !== 0) {
      return cmp;
    }
  } else if (timeA && !timeB) {
    return -1;
  } else if (!timeA && timeB) {
    return 1;
  }
  return b.id - a.id;
}
