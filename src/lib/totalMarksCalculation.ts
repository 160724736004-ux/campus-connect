/**
 * Total Marks Calculation
 * Internal (30) + External (70) = 100
 * Pass validation: 40% external, 40% total
 * Grace marks, detained marking
 */

import { calculateInternalMarks, type ComponentDef, type ComponentMark } from "./internalMarksCalculation";

export const DEFAULT_INTERNAL_OUT_OF = 30;
export const DEFAULT_EXTERNAL_OUT_OF = 70;
export const DEFAULT_PASS_PCT_EXTERNAL = 40;
export const DEFAULT_PASS_PCT_TOTAL = 40;

export const EXTERNAL_COMPONENT_CODES = ["semester_end", "practical", "viva", "project"];

export interface TotalMarksConfig {
  internalOutOf?: number;
  externalOutOf?: number;
  passPctExternal?: number;
  passPctTotal?: number;
  graceMarks?: number;
  maxGraceMarks?: number;
}

export interface TotalMarksResult {
  internal: number;
  external: number;
  total: number;
  graceApplied: number;
  passExternal: boolean;
  passTotal: boolean;
  passed: boolean;
  detained: boolean;
  absent: boolean;
  internalBreakdown?: ReturnType<typeof calculateInternalMarks>["breakdown"];
}

/**
 * Compute external marks from component marks (theory, practical, viva, project)
 * Scale to externalOutOf (default 70)
 */
export function calculateExternalMarks(
  externalMarks: { marksObtained: number | null; maxMarks: number; isAbsent: boolean }[],
  options?: { externalOutOf?: number }
): { raw: number; scaled: number; maxRaw: number; absent: boolean } {
  const outOf = options?.externalOutOf ?? DEFAULT_EXTERNAL_OUT_OF;
  const absent = externalMarks.some((m) => m.isAbsent);
  if (absent || externalMarks.length === 0) {
    return { raw: 0, scaled: 0, maxRaw: 0, absent };
  }
  const maxRaw = externalMarks.reduce((s, m) => s + (m.maxMarks || 0), 0);
  const raw = externalMarks.reduce(
    (s, m) => s + (m.marksObtained != null && !m.isAbsent ? Number(m.marksObtained) : 0),
    0
  );
  const scaled = maxRaw > 0 ? (raw / maxRaw) * outOf : 0;
  return { raw, scaled: Math.round(scaled * 2) / 2, maxRaw, absent };
}

/**
 * Calculate total marks: Internal (30) + External (70)
 * Apply grace, validate pass criteria
 */
export function calculateTotalMarks(
  internalResult: { total: number; scaled: number | null; graceApplied: number },
  externalResult: { scaled: number; absent: boolean },
  config?: TotalMarksConfig
): TotalMarksResult {
  const internalOutOf = config?.internalOutOf ?? DEFAULT_INTERNAL_OUT_OF;
  const externalOutOf = config?.externalOutOf ?? DEFAULT_EXTERNAL_OUT_OF;
  const passPctExt = (config?.passPctExternal ?? DEFAULT_PASS_PCT_EXTERNAL) / 100;
  const passPctTot = (config?.passPctTotal ?? DEFAULT_PASS_PCT_TOTAL) / 100;

  let internal = internalResult.scaled != null ? internalResult.scaled : (internalResult.total / 100) * internalOutOf;
  let external = externalResult.scaled;
  let graceApplied = internalResult.graceApplied;

  // Grace applied in internal calc; optional extra grace to bridge pass gap

  const total = Math.round((internal + external) * 2) / 2;
  const minExternal = externalOutOf * passPctExt;
  const minTotal = (internalOutOf + externalOutOf) * passPctTot;
  const passExternal = externalResult.absent ? false : external >= minExternal;
  const passTotal = externalResult.absent ? false : total >= minTotal;
  const passed = passExternal && passTotal;
  const detained = !externalResult.absent && !passed;

  return {
    internal: Math.round(internal * 2) / 2,
    external: Math.round(external * 2) / 2,
    total,
    graceApplied,
    passExternal,
    passTotal,
    passed,
    detained,
    absent: externalResult.absent,
  };
}

/**
 * Full pipeline: internal components + external components -> total with pass/detained
 */
export function computeSubjectTotal(
  internalDefs: ComponentDef[],
  internalMarks: ComponentMark[],
  externalMarks: { marksObtained: number | null; maxMarks: number; isAbsent: boolean }[],
  options?: {
    totalInternalOutOf?: number;
    totalExternalOutOf?: number;
    graceMarks?: number;
    maxGraceMarks?: number;
    passPctExternal?: number;
    passPctTotal?: number;
  }
): TotalMarksResult & { internalCalc: ReturnType<typeof calculateInternalMarks> } {
  const internalCalc = calculateInternalMarks(internalDefs, internalMarks, {
    totalInternalOutOf: options?.totalInternalOutOf ?? DEFAULT_INTERNAL_OUT_OF,
    graceMarks: options?.graceMarks ?? 0,
    maxGraceMarks: options?.maxGraceMarks,
  });
  const extResult = calculateExternalMarks(externalMarks, {
    externalOutOf: options?.totalExternalOutOf ?? DEFAULT_EXTERNAL_OUT_OF,
  });
  const totalResult = calculateTotalMarks(
    { total: internalCalc.total, scaled: internalCalc.scaled, graceApplied: internalCalc.graceApplied },
    extResult,
    {
      internalOutOf: options?.totalInternalOutOf ?? DEFAULT_INTERNAL_OUT_OF,
      externalOutOf: options?.totalExternalOutOf ?? DEFAULT_EXTERNAL_OUT_OF,
      passPctExternal: options?.passPctExternal ?? DEFAULT_PASS_PCT_EXTERNAL,
      passPctTotal: options?.passPctTotal ?? DEFAULT_PASS_PCT_TOTAL,
    }
  );
  return {
    ...totalResult,
    internalCalc,
  };
}
