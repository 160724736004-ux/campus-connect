/**
 * Internal Marks Calculation Engine
 * - Auto-sum components, apply weightage, formulas (best of N, average), round-off
 * - Grace marks application
 * - Scaling to final internal marks
 */

export type RoundOffRule = "none" | "ceiling" | "floor" | "nearest" | "nearest_half";
export type CalcFormula = "sum" | "average" | "best_of_n" | "weighted_average";

export interface ComponentDef {
  id: string;
  name: string;
  maxMarks: number;
  weightagePercent: number;
  calculationFormula?: CalcFormula | null;
  bestOfNCount?: number | null;
  roundOffRule?: RoundOffRule | null;
}

export interface ComponentMark {
  componentDefId: string;
  marksObtained: number | null;
  isAbsent: boolean;
  maxMarks: number;
}

function applyRoundOff(value: number, rule?: RoundOffRule | null): number {
  if (!rule || rule === "none") return value;
  switch (rule) {
    case "ceiling":
      return Math.ceil(value);
    case "floor":
      return Math.floor(value);
    case "nearest":
      return Math.round(value);
    case "nearest_half":
      return Math.round(value * 2) / 2;
    default:
      return value;
  }
}

function applyFormula(
  values: number[],
  formula?: CalcFormula | null,
  bestOfN?: number | null
): number {
  const valid = values.filter((v) => v >= 0 && !Number.isNaN(v));
  if (valid.length === 0) return 0;

  switch (formula || "sum") {
    case "average":
      return valid.reduce((a, b) => a + b, 0) / valid.length;
    case "best_of_n":
      if (bestOfN && bestOfN > 0) {
        const sorted = [...valid].sort((a, b) => b - a);
        const top = sorted.slice(0, bestOfN);
        return top.reduce((a, b) => a + b, 0) / top.length;
      }
      return valid.reduce((a, b) => a + b, 0) / valid.length;
    case "weighted_average":
      return valid.reduce((a, b) => a + b, 0) / valid.length;
    case "sum":
    default:
      return valid.reduce((a, b) => a + b, 0);
  }
}

/**
 * Calculate internal marks for a single course from component marks
 */
export function calculateInternalMarks(
  components: ComponentDef[],
  marks: ComponentMark[],
  options?: {
    totalInternalOutOf?: number; // e.g. 40 - scale final to this
    graceMarks?: number;
    maxGraceMarks?: number;
  }
): {
  total: number;
  weightedContribution: number;
  graceApplied: number;
  scaled: number | null;
  breakdown: { component: string; raw: number; weighted: number; rounded: number }[];
} {
  let totalWeighted = 0;
  const totalWeight = components.reduce((s, c) => s + (c.weightagePercent || 0), 0) || 100;
  const breakdown: { component: string; raw: number; weighted: number; rounded: number }[] = [];

  for (const comp of components) {
    const compMarks = marks.filter((m) => m.componentDefId === comp.id);
    const values = compMarks
      .filter((m) => !m.isAbsent && m.marksObtained != null)
      .map((m) => Number(m.marksObtained));
    const raw = applyFormula(
      values,
      comp.calculationFormula,
      comp.bestOfNCount
    );
    const rounded = applyRoundOff(raw, comp.roundOffRule);
    const weight = (comp.weightagePercent || 0) / 100;
    const weighted = totalWeight > 0 ? (rounded / comp.maxMarks) * weight * 100 : 0;
    totalWeighted += weighted;
    breakdown.push({
      component: comp.name,
      raw,
      weighted,
      rounded,
    });
  }

  let scaled: number | null = null;
  if (options?.totalInternalOutOf && options.totalInternalOutOf > 0) {
    scaled = (totalWeighted / 100) * options.totalInternalOutOf;
  }

  let graceApplied = 0;
  if (options?.graceMarks && options.graceMarks > 0) {
    const maxGrace = options.maxGraceMarks ?? options.graceMarks;
    graceApplied = Math.min(options.graceMarks, maxGrace);
  }

  const total = totalWeighted + graceApplied;

  return {
    total: applyRoundOff(total, "nearest_half"),
    weightedContribution: totalWeighted,
    graceApplied,
    scaled: scaled != null ? applyRoundOff(scaled, "nearest_half") : null,
    breakdown,
  };
}

/**
 * Real-time calculation for what-if scenarios
 * Override marks with hypothetical values
 */
export function calculateWhatIf(
  components: ComponentDef[],
  marks: ComponentMark[],
  overrides: Record<string, number>, // componentDefId -> hypothetical marks
  options?: { totalInternalOutOf?: number; graceMarks?: number }
): ReturnType<typeof calculateInternalMarks> {
  const adjustedMarks: ComponentMark[] = marks.map((m) => {
    const override = overrides[m.componentDefId];
    if (override !== undefined) {
      return {
        ...m,
        marksObtained: override,
        isAbsent: false,
      };
    }
    return m;
  });
  return calculateInternalMarks(components, adjustedMarks, options);
}
