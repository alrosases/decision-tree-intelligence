import {
  CategoricalFreqItem,
  CategoricalStats,
  CrossComparisonItem,
  Dataset,
  NumericStats,
  VariableMeta,
} from '../types/analytics';

function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] * (1 - (idx - lo)) + sorted[hi] * (idx - lo);
}

export function computeNumericStats(dataset: Dataset, variable: VariableMeta): NumericStats {
  const raw = dataset.rows.map((r) => r[variable.name]);
  const nums = raw
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => a - b);

  const count = nums.length;
  const missing = raw.length - count;

  if (count === 0) {
    return {
      column: variable.name,
      count: 0,
      missing,
      mean: 0,
      median: 0,
      std: 0,
      min: 0,
      max: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      outlierCount: 0,
      bins: [],
      interpretation: `La variable ${variable.name} no posee valores numéricos válidos para análisis descriptivo.`,
    };
  }

  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  const median = quantile(nums, 0.5);
  const q1 = quantile(nums, 0.25);
  const q3 = quantile(nums, 0.75);
  const iqr = q3 - q1;
  const min = nums[0];
  const max = nums[count - 1];

  const variance =
    count > 1
      ? nums.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (count - 1)
      : 0;
  const std = Math.sqrt(variance);

  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outlierCount =
    iqr > 0 ? nums.filter((v) => v < lowerFence || v > upperFence).length : 0;

  const binCount = Math.min(10, Math.max(5, Math.ceil(Math.sqrt(count) / 1.5)));
  const span = max - min;
  const bins: { label: string; min: number; max: number; count: number }[] = [];

  if (span === 0) {
    bins.push({
      label: `${min.toFixed(1)}`,
      min,
      max,
      count,
    });
  } else {
    const step = span / binCount;
    for (let b = 0; b < binCount; b++) {
      const bMin = min + b * step;
      const bMax = b === binCount - 1 ? max : min + (b + 1) * step;
      const inBin = nums.filter((v) =>
        b === binCount - 1 ? v >= bMin && v <= bMax : v >= bMin && v < bMax
      ).length;
      bins.push({
        label: `${bMin.toFixed(Math.abs(step) < 10 ? 1 : 0)}–${bMax.toFixed(Math.abs(step) < 10 ? 1 : 0)}`,
        min: bMin,
        max: bMax,
        count: inBin,
      });
    }
  }

  // Real data-driven business interpretation
  const cv = mean !== 0 ? (std / Math.abs(mean)) * 100 : 0;
  const skewText =
    mean > median * 1.12
      ? 'presenta asimetría positiva (algunos registros alcanzan valores muy altos que elevan el promedio)'
      : mean < median * 0.88
      ? 'presenta asimetría negativa (existen registros bajos que arrastran la media)'
      : 'muestra una distribución relativamente equilibrada entre su promedio y mediana';

  const dispersionText =
    cv > 55
      ? 'alta dispersión entre segmentos'
      : cv > 25
      ? 'variabilidad moderada'
      : 'comportamiento homogéneo';

  const outlierText =
    outlierCount > 0
      ? ` Se identifican ${outlierCount} valores atípicos (${((outlierCount / count) * 100).toFixed(1)}%), lo que sugiere revisar casos extremos o nichos especiales.`
      : ' No se observan valores atípicos relevantes según el rango intercuartílico.';

  const interpretation = `${variable.name} registra una mediana de ${median.toFixed(2)} (rango de ${min.toFixed(2)} a ${max.toFixed(2)}) y ${skewText}, con ${dispersionText}.${outlierText}`;

  return {
    column: variable.name,
    count,
    missing,
    mean,
    median,
    std,
    min,
    max,
    q1,
    q3,
    iqr,
    outlierCount,
    bins,
    interpretation,
  };
}

export function computeCategoricalStats(
  dataset: Dataset,
  variable: VariableMeta
): CategoricalStats {
  const raw = dataset.rows.map((r) => r[variable.name]);
  const valid = raw
    .filter((v): v is string | number => v !== null)
    .map((v) => String(v));

  const count = valid.length;
  const missing = raw.length - count;

  const counts = new Map<string, number>();
  for (const val of valid) {
    counts.set(val, (counts.get(val) ?? 0) + 1);
  }

  const frequencies: CategoricalFreqItem[] = Array.from(counts.entries())
    .map(([value, c]) => ({
      value,
      count: c,
      pct: count > 0 ? (c / count) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const top = frequencies[0] ?? { value: 'N/D', count: 0, pct: 0 };
  const second = frequencies[1];

  let interpretation = '';
  if (frequencies.length === 0) {
    interpretation = `La variable ${variable.name} no contiene categorías válidas.`;
  } else if (top.pct >= 60) {
    interpretation = `El ${top.pct.toFixed(1)}% de los registros pertenece a la categoría "${top.value}" (${top.count} casos). Esta alta concentración permite diseñar estrategias focalizadas en este segmento predominante.`;
  } else if (second) {
    interpretation = `Las dos categorías principales son "${top.value}" (${top.pct.toFixed(1)}%) y "${second.value}" (${second.pct.toFixed(1)}%), concentrando juntas el ${(top.pct + second.pct).toFixed(1)}% de la base analizada.`;
  } else {
    interpretation = `La totalidad de los registros válidos (${count}) se agrupa en "${top.value}".`;
  }

  return {
    column: variable.name,
    count,
    missing,
    uniqueCount: frequencies.length,
    topCategory: top.value,
    topCategoryPct: top.pct,
    frequencies,
    interpretation,
  };
}

export function computeCrossComparison(
  dataset: Dataset,
  featureCol: string,
  targetCol: string
): { items: CrossComparisonItem[]; targetValues: string[]; interpretation: string } {
  const targetValuesSet = new Set<string>();
  const groups = new Map<string, Map<string, number>>();

  for (const row of dataset.rows) {
    const fVal = row[featureCol];
    const tVal = row[targetCol];
    if (fVal === null || tVal === null) continue;
    const fKey = String(fVal);
    const tKey = String(tVal);
    targetValuesSet.add(tKey);
    if (!groups.has(fKey)) groups.set(fKey, new Map());
    const tMap = groups.get(fKey)!;
    tMap.set(tKey, (tMap.get(tKey) ?? 0) + 1);
  }

  const targetValues = Array.from(targetValuesSet).sort();
  const items: CrossComparisonItem[] = Array.from(groups.entries())
    .map(([category, tMap]) => {
      const total = Array.from(tMap.values()).reduce((a, b) => a + b, 0);
      return {
        category,
        total,
        targetBreakdown: targetValues.map((tv) => {
          const count = tMap.get(tv) ?? 0;
          return {
            targetValue: tv,
            count,
            pct: total > 0 ? (count / total) * 100 : 0,
          };
        }),
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  let interpretation = `Comparación de ${featureCol} frente a ${targetCol}.`;
  if (items.length >= 2 && targetValues.length >= 2) {
    const focusTarget = targetValues[0];
    const sortedByFocus = [...items].sort((a, b) => {
      const aPct = a.targetBreakdown.find((x) => x.targetValue === focusTarget)?.pct ?? 0;
      const bPct = b.targetBreakdown.find((x) => x.targetValue === focusTarget)?.pct ?? 0;
      return bPct - aPct;
    });
    const highest = sortedByFocus[0];
    const lowest = sortedByFocus[sortedByFocus.length - 1];
    const hPct = highest.targetBreakdown.find((x) => x.targetValue === focusTarget)?.pct ?? 0;
    const lPct = lowest.targetBreakdown.find((x) => x.targetValue === focusTarget)?.pct ?? 0;
    interpretation = `En la categoría "${highest.category}", el resultado "${focusTarget}" alcanza ${hPct.toFixed(1)}% (${highest.total} registros), frente a ${lPct.toFixed(1)}% en "${lowest.category}". Esta diferencia de ${(hPct - lPct).toFixed(1)} puntos porcentuales evidencia un patrón relevante para segmentación.`;
  }

  return { items, targetValues, interpretation };
}
