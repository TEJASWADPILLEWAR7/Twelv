export type DateString = string;

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Challenge {
  id: number;
  name: string;
  startDate: DateString;
  endDate: DateString;
  createdAt: string;
}

export interface Task {
  id: number;
  challengeId: number;
  title: string;
  description: string | null;
  scheduledDate: DateString;
  scheduledTime: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Habit {
  id: number;
  challengeId: number;
  title: string;
  createdAt: string;
  endedOn: DateString | null;
}

export interface HabitSchedule {
  id: number;
  habitId: number;
  daysOfWeek: Weekday[];
  effectiveFrom: DateString;
}

export interface HabitLog {
  id: number;
  habitId: number;
  logDate: DateString;
  createdAt: string;
}

export interface WeekBoundary {
  weekNumber: number;
  startDate: DateString;
  endDate: DateString;
}

export interface CategoryScore {
  completed: number;
  total: number;
  percentage: number;
  targetMet: boolean;
}

export type WeekStatus = "completed" | "current" | "upcoming";

export interface WeeklySummary {
  weekNumber: number;
  startDate: DateString;
  endDate: DateString;
  status: WeekStatus;
  tasks: CategoryScore;
  habits: CategoryScore;
}

export interface NewTaskInput {
  title: string;
  description?: string;
  scheduledDate: DateString;
  scheduledTime?: string | null;
}

export interface UpdateTaskInput {
  title: string;
  description?: string;
  scheduledDate: DateString;
  scheduledTime?: string | null;
}

export interface NewHabitInput {
  title: string;
  daysOfWeek: Weekday[];
}
