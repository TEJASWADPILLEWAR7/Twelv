import { Challenge, Habit, HabitLog, HabitSchedule, Task } from "../src/types";
import {
  generateTwelveWeeks,
  getActiveWeekNumber,
  getChallengeEndDate,
} from "../src/utils/date";
import {
  buildCategoryScore,
  calculatePercentage,
  computeWeeklySummaries,
  isTargetMet,
} from "../src/utils/scoring";

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `Assertion failed (${label}): expected ${String(expected)}, got ${String(actual)}`,
    );
  }
}

function assertDeepEqual<T>(actual: T, expected: T, label: string): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(
      `Deep assertion failed (${label}): expected ${expectedJson}, got ${actualJson}`,
    );
  }
}

const stdWeeks = generateTwelveWeeks("2027-01-01");
assertEqual(stdWeeks.length, 12, "12 weeks generated");
assertEqual(stdWeeks[0].startDate, "2027-01-01", "week 1 start");
assertEqual(stdWeeks[0].endDate, "2027-01-07", "week 1 end");
assertEqual(stdWeeks[11].endDate, "2027-03-25", "week 12 end");
assertEqual(
  getChallengeEndDate("2027-01-01"),
  "2027-03-25",
  "challenge end date",
);

const leapWeeks = generateTwelveWeeks("2028-02-01");
assertEqual(leapWeeks[4].startDate, "2028-02-29", "leap day boundary");
assertEqual(leapWeeks[11].endDate, "2028-04-24", "leap cycle end");

const yearRollWeeks = generateTwelveWeeks("2026-12-15");
assertEqual(yearRollWeeks[2].startDate, "2026-12-29", "year rollover start");
assertEqual(yearRollWeeks[2].endDate, "2027-01-04", "year rollover end");

assertEqual(
  getActiveWeekNumber("2027-01-01", "2026-12-31"),
  null,
  "before start",
);
assertEqual(getActiveWeekNumber("2027-01-01", "2027-01-01"), 1, "day 1");
assertEqual(getActiveWeekNumber("2027-01-01", "2027-01-07"), 1, "day 7");
assertEqual(getActiveWeekNumber("2027-01-01", "2027-01-08"), 2, "day 8");
assertEqual(getActiveWeekNumber("2027-01-01", "2027-03-25"), 12, "day 84");
assertEqual(getActiveWeekNumber("2027-01-01", "2027-03-26"), null, "after end");

assertEqual(calculatePercentage(20, 28), 71.43, "20/28 percentage");
assertEqual(isTargetMet(20, 28), false, "20/28 below 85%");

assertEqual(calculatePercentage(24, 28), 85.71, "24/28 percentage");
assertEqual(isTargetMet(24, 28), true, "24/28 meets 85%");

assertEqual(calculatePercentage(17, 20), 85, "17/20 exact 85%");
assertEqual(isTargetMet(17, 20), true, "17/20 meets 85%");

assertEqual(calculatePercentage(0, 0), 0, "0/0 safe zero");
assertEqual(isTargetMet(0, 0), false, "0/0 target false");
assertDeepEqual(
  buildCategoryScore(35, 42),
  {
    completed: 35,
    total: 42,
    percentage: 83.33,
    targetMet: false,
  },
  "category score object",
);

const challenge: Challenge = {
  id: 1,
  name: "Test Cycle",
  startDate: "2027-01-04",
  endDate: "2027-03-28",
  createdAt: "2027-01-04T08:00:00",
};

const tasks: Task[] = [
  {
    id: 1,
    challengeId: 1,
    title: "Week 1 Completed Task",
    description: null,
    scheduledDate: "2027-01-05",
    scheduledTime: null,
    completed: true,
    completedAt: "2027-01-05T10:00:00",
    createdAt: "2027-01-04T08:00:00",
    updatedAt: "2027-01-05T10:00:00",
  },
  {
    id: 2,
    challengeId: 1,
    title: "Week 2 Elapsed Task",
    description: null,
    scheduledDate: "2027-01-11",
    scheduledTime: null,
    completed: true,
    completedAt: "2027-01-11T10:00:00",
    createdAt: "2027-01-11T08:00:00",
    updatedAt: "2027-01-11T10:00:00",
  },
  {
    id: 3,
    challengeId: 1,
    title: "Week 2 Future Task",
    description: null,
    scheduledDate: "2027-01-15",
    scheduledTime: null,
    completed: false,
    completedAt: null,
    createdAt: "2027-01-11T08:00:00",
    updatedAt: "2027-01-11T08:00:00",
  },
];

const habits: Habit[] = [
  {
    id: 1,
    challengeId: 1,
    title: "Study DSA",
    createdAt: "2027-01-04T08:00:00",
    endedOn: null,
  },
];

const schedules: HabitSchedule[] = [
  {
    id: 1,
    habitId: 1,
    daysOfWeek: [1, 2, 3, 4, 5, 6],
    effectiveFrom: "2027-01-04",
  },
  {
    id: 2,
    habitId: 1,
    daysOfWeek: [1, 2, 3, 4, 5],
    effectiveFrom: "2027-01-11",
  },
];

const logs: HabitLog[] = [
  {
    id: 1,
    habitId: 1,
    logDate: "2027-01-04",
    createdAt: "2027-01-04T20:00:00",
  },
  {
    id: 2,
    habitId: 1,
    logDate: "2027-01-05",
    createdAt: "2027-01-05T20:00:00",
  },
  {
    id: 3,
    habitId: 1,
    logDate: "2027-01-06",
    createdAt: "2027-01-06T20:00:00",
  },
  {
    id: 4,
    habitId: 1,
    logDate: "2027-01-07",
    createdAt: "2027-01-07T20:00:00",
  },
  {
    id: 5,
    habitId: 1,
    logDate: "2027-01-08",
    createdAt: "2027-01-08T20:00:00",
  },
  {
    id: 6,
    habitId: 1,
    logDate: "2027-01-09",
    createdAt: "2027-01-09T20:00:00",
  },
  {
    id: 7,
    habitId: 1,
    logDate: "2027-01-11",
    createdAt: "2027-01-11T20:00:00",
  },
];

const summaries = computeWeeklySummaries(
  challenge,
  tasks,
  habits,
  schedules,
  logs,
  "2027-01-12",
);

assertEqual(summaries[0].status, "completed", "week 1 completed");
assertEqual(summaries[0].tasks.completed, 1, "week 1 task completed");
assertEqual(summaries[0].tasks.total, 1, "week 1 task total");
assertEqual(summaries[0].tasks.percentage, 100, "week 1 task pct");
assertEqual(summaries[0].habits.completed, 6, "week 1 habit completed");
assertEqual(summaries[0].habits.total, 6, "week 1 habit total");
assertEqual(summaries[0].habits.percentage, 100, "week 1 habit pct");

assertEqual(summaries[1].status, "current", "week 2 current");
assertEqual(summaries[1].tasks.completed, 1, "week 2 elapsed task completed");
assertEqual(summaries[1].tasks.total, 1, "week 2 elapsed task total");
assertEqual(summaries[1].habits.completed, 1, "week 2 elapsed habit completed");
assertEqual(summaries[1].habits.total, 2, "week 2 elapsed habit total");
assertEqual(summaries[1].habits.percentage, 50, "week 2 elapsed habit pct");

assertEqual(summaries[2].status, "upcoming", "week 3 upcoming");
assertEqual(summaries[2].tasks.total, 0, "week 3 task total");
assertEqual(summaries[2].habits.total, 0, "week 3 habit total");

console.log("ALL_VERIFICATION_TESTS_PASSED");
