/**
 * SGPA & CGPA Calculation
 * Credit points = Credits × Grade Points
 * SGPA = Total Credit Points / Total Credits (per semester)
 * CGPA = Cumulative Credit Points / Cumulative Credits
 * Failed subjects: 0 grade points, included in credits
 */

export interface TranscriptItem {
  semester: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  letterGrade: string;
  gradePoints: number | null;
  status?: string;
}

export interface SubjectCreditPoints {
  semester: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  gradePoints: number;
  creditPoints: number;
  isFailed: boolean;
}

export interface SGPAResult {
  semester: string;
  totalCreditPoints: number;
  totalCredits: number;
  sgpa: number;
  subjectWise: SubjectCreditPoints[];
  failedCount: number;
}

export interface CGPAResult {
  cumulativeCreditPoints: number;
  cumulativeCredits: number;
  cgpa: number;
  sgpaBySemester: SGPAResult[];
  history: { semester: string; sgpa: number; credits: number; creditPoints: number }[];
}

const EXCLUDED_GRADES = ["W", "I", "—", ""];

function getGradePoints(item: TranscriptItem): number {
  if (EXCLUDED_GRADES.includes(item.letterGrade || "")) return 0;
  return item.gradePoints ?? 0;
}

/**
 * Calculate SGPA for a single semester
 * Failed subjects (F, 0 points) are included in total credits with 0 credit points
 */
export function calculateSGPA(items: TranscriptItem[]): SGPAResult {
  const subjectWise: SubjectCreditPoints[] = items.map((item) => {
    const gp = getGradePoints(item);
    const credits = item.credits || 0;
    const excluded = EXCLUDED_GRADES.includes(item.letterGrade || "");
    const creditPoints = excluded ? 0 : credits * gp;
    const isFailed = (item.letterGrade === "F" || (gp === 0 && item.letterGrade && !excluded));
    return {
      semester: item.semester,
      courseCode: item.courseCode,
      courseTitle: item.courseTitle,
      credits: excluded ? 0 : credits,
      gradePoints: gp,
      creditPoints,
      isFailed,
    };
  });

  const totalCreditPoints = subjectWise.reduce((s, x) => s + x.creditPoints, 0);
  const totalCredits = subjectWise.reduce((s, x) => s + x.credits, 0);
  const sgpa = totalCredits > 0 ? totalCreditPoints / totalCredits : 0;
  const failedCount = subjectWise.filter((x) => x.isFailed).length;

  return {
    semester: items[0]?.semester || "",
    totalCreditPoints,
    totalCredits,
    sgpa,
    subjectWise,
    failedCount,
  };
}

/**
 * Calculate CGPA across all semesters
 * Includes historical SGPA tracking
 */
export function calculateCGPA(transcript: TranscriptItem[]): CGPAResult {
  const semesters = [...new Set(transcript.map((t) => t.semester))].sort();
  const sgpaBySemester: SGPAResult[] = [];
  const history: { semester: string; sgpa: number; credits: number; creditPoints: number }[] = [];

  for (const sem of semesters) {
    const items = transcript.filter((t) => t.semester === sem);
    const sgpaResult = calculateSGPA(items);
    sgpaBySemester.push(sgpaResult);
    history.push({
      semester: sem,
      sgpa: sgpaResult.sgpa,
      credits: sgpaResult.totalCredits,
      creditPoints: sgpaResult.totalCreditPoints,
    });
  }

  const cumulativeCreditPoints = sgpaBySemester.reduce((s, x) => s + x.totalCreditPoints, 0);
  const cumulativeCredits = sgpaBySemester.reduce((s, x) => s + x.totalCredits, 0);
  const cgpa = cumulativeCredits > 0 ? cumulativeCreditPoints / cumulativeCredits : 0;

  return {
    cumulativeCreditPoints,
    cumulativeCredits,
    cgpa,
    sgpaBySemester,
    history,
  };
}

/**
 * CGPA after backlog clearance - include only passed/graded subjects
 * For backlog scenario: when student clears F, new grade adds to cumulative
 */
export function calculateCGPAAfterBacklogClearance(transcript: TranscriptItem[]): number {
  const result = calculateCGPA(transcript);
  return result.cgpa;
}
