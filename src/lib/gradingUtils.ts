/**
 * Grading System Utilities
 * Marks-to-grade mapping, auto-assignment from scale
 */

export interface GradingScaleEntry {
  grade: string;
  minMarksPct: number;
  maxMarksPct: number;
  gradePoints: number;
  isPass: boolean;
  sortOrder: number;
}

export function marksToGrade(
  totalMarks: number,
  maxMarks: number,
  scale: GradingScaleEntry[]
): { grade: string; gradePoints: number } | null {
  if (maxMarks <= 0 || totalMarks < 0 || scale.length === 0) return null;
  const pct = (totalMarks / maxMarks) * 100;
  const sorted = [...scale].sort((a, b) => b.minMarksPct - a.minMarksPct);
  for (const entry of sorted) {
    if (pct >= entry.minMarksPct && pct <= entry.maxMarksPct) {
      return { grade: entry.grade, gradePoints: entry.gradePoints };
    }
  }
  return null;
}

export const DEFAULT_SCALE: GradingScaleEntry[] = [
  { grade: "O", minMarksPct: 90, maxMarksPct: 100, gradePoints: 10, isPass: true, sortOrder: 1 },
  { grade: "A+", minMarksPct: 80, maxMarksPct: 89.99, gradePoints: 9, isPass: true, sortOrder: 2 },
  { grade: "A", minMarksPct: 70, maxMarksPct: 79.99, gradePoints: 8, isPass: true, sortOrder: 3 },
  { grade: "B+", minMarksPct: 60, maxMarksPct: 69.99, gradePoints: 7, isPass: true, sortOrder: 4 },
  { grade: "B", minMarksPct: 50, maxMarksPct: 59.99, gradePoints: 6, isPass: true, sortOrder: 5 },
  { grade: "C", minMarksPct: 40, maxMarksPct: 49.99, gradePoints: 5, isPass: true, sortOrder: 6 },
  { grade: "D", minMarksPct: 30, maxMarksPct: 39.99, gradePoints: 4, isPass: true, sortOrder: 7 },
  { grade: "F", minMarksPct: 0, maxMarksPct: 29.99, gradePoints: 0, isPass: false, sortOrder: 8 },
];

export const SPECIAL_GRADES: Record<string, number> = { W: 0, I: 0 };

export function scaleToGradePointsMap(scale: GradingScaleEntry[]): Record<string, number> {
  const m: Record<string, number> = {};
  scale.forEach((s) => { m[s.grade] = s.gradePoints; });
  return m;
}
