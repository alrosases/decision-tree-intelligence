import {
  DataRow,
  Dataset,
  PrepAction,
  PreparedDataset,
} from '../types/analytics';

function detectPotentialLeakage(
  dataset: Dataset,
  targetColumn: string,
  predictorColumn: string
): { isLeaky: boolean; purity: number; reason: string } {
  const suspiciousName =
    /(fecha_baja|motivo_cancel|motivo_abandono|resultado_final|post_|target|label|score_final|estado_cierre)/i.test(
      predictorColumn
    );

  // Compute conditional majority accuracy of predicting target solely from this predictor (binned if numeric)
  const pairs: { x: string; y: string }[] = [];
  for (const r of dataset.rows) {
    const xv = r[predictorColumn];
    const yv = r[targetColumn];
    if (xv === null || yv === null) continue;
    pairs.push({ x: String(xv), y: String(yv) });
  }
  if (pairs.length < 20) return { isLeaky: false, purity: 0, reason: '' };

  const varMeta = dataset.variables.find((v) => v.name === predictorColumn);
  const isNumeric = varMeta?.type.startsWith('numeric_');

  if (!isNumeric) {
    const groups = new Map<string, Map<string, number>>();
    for (const p of pairs) {
      if (!groups.has(p.x)) groups.set(p.x, new Map());
      const m = groups.get(p.x)!;
      m.set(p.y, (m.get(p.y) ?? 0) + 1);
    }
    let correct = 0;
    for (const m of groups.values()) {
      const maxCount = Math.max(...Array.from(m.values()));
      correct += maxCount;
    }
    const purity = correct / pairs.length;
    if (purity >= 0.97 && groups.size < pairs.length * 0.5) {
      return {
        isLeaky: true,
        purity,
        reason: `Asociación casi determinística (${(purity * 100).toFixed(1)}% de pureza directa con ${targetColumn}). Podría contener fuga de información posterior al evento.`,
      };
    }
  }

  if (suspiciousName) {
    return {
      isLeaky: true,
      purity: 0.95,
      reason: `El nombre "${predictorColumn}" sugiere información generada después del resultado objetivo (posible Data Leakage).`,
    };
  }

  return { isLeaky: false, purity: 0, reason: '' };
}

export function buildPreparationPlan(
  dataset: Dataset,
  targetColumn: string,
  selectedPredictors: string[]
): PrepAction[] {
  const actions: PrepAction[] = [];

  // 1. Duplicate rows
  if (dataset.quality.duplicateRows > 0) {
    actions.push({
      id: 'remove_duplicates',
      category: 'duplicates',
      title: `Eliminar ${dataset.quality.duplicateRows} registros duplicados exactos`,
      reason: 'Los registros duplicados sesgan las divisiones del árbol y pueden inflar artificialmente la precisión si aparecen tanto en entrenamiento como en prueba.',
      impactSummary: `Se depurarán ${dataset.quality.duplicateRows} filas repetidas.`,
      enabled: true,
      recommended: true,
      severity: 'warning',
    });
  }

  // 2. Identifiers or constant variables in selected predictors
  for (const col of selectedPredictors) {
    const meta = dataset.variables.find((v) => v.name === col);
    if (!meta) continue;

    if (meta.role === 'identifier') {
      actions.push({
        id: `drop_id_${col}`,
        category: 'irrelevant',
        column: col,
        title: `Excluir identificador "${col}"`,
        reason: `Posee ${meta.uniqueCount} valores únicos y actúa como identificador; incluirlo provoca memorización sin capacidad de generalización.`,
        impactSummary: `Se retirará "${col}" del conjunto de predictores.`,
        enabled: true,
        recommended: true,
        severity: 'warning',
      });
      continue;
    }

    if (meta.uniqueCount <= 1) {
      actions.push({
        id: `drop_const_${col}`,
        category: 'irrelevant',
        column: col,
        title: `Excluir variable constante "${col}"`,
        reason: 'Tiene un único valor en toda la base y no aporta información discriminante para el árbol.',
        impactSummary: `Se retirará "${col}" del análisis.`,
        enabled: true,
        recommended: true,
        severity: 'info',
      });
      continue;
    }

    // 3. Leakage check
    const leak = detectPotentialLeakage(dataset, targetColumn, col);
    if (leak.isLeaky) {
      actions.push({
        id: `drop_leak_${col}`,
        category: 'leakage',
        column: col,
        title: `Alerta de fuga de información (Data Leakage) en "${col}"`,
        reason: leak.reason,
        impactSummary: `Se recomienda excluir "${col}" para garantizar un modelo válido en producción.`,
        enabled: true,
        recommended: true,
        severity: 'critical',
      });
      continue;
    }

    // 4. Case / whitespace normalization
    const hasCaseIssue = dataset.quality.inconsistencies.some(
      (inc) => inc.column === col && inc.type === 'case_whitespace'
    );
    if (hasCaseIssue) {
      actions.push({
        id: `norm_${col}`,
        category: 'normalization',
        column: col,
        title: `Unificar formato de categorías en "${col}"`,
        reason: 'Se detectaron variantes de escritura por mayúsculas o espacios adicionales que fragmentan las ramas del árbol.',
        impactSummary: 'Estandarización automática de etiquetas equivalentes.',
        enabled: true,
        recommended: true,
        severity: 'info',
      });
    }

    // 5. Missing values imputation
    if (meta.missingCount > 0) {
      const strategy = meta.type.startsWith('numeric_')
        ? 'mediana de la variable'
        : 'moda (categoría más frecuente)';
      actions.push({
        id: `impute_${col}`,
        category: 'missing',
        column: col,
        title: `Imputar ${meta.missingCount} valores faltantes en "${col}"`,
        reason: `Representan el ${meta.missingPct.toFixed(1)}% del total; reemplazar con la ${strategy} preserva los registros sin distorsionar la distribución.`,
        impactSummary: `Completa ${meta.missingCount} celdas vacías usando ${strategy}.`,
        enabled: true,
        recommended: true,
        severity: meta.missingPct > 20 ? 'warning' : 'info',
      });
    }
  }

  // Target missing rows removal notice
  const targetMeta = dataset.variables.find((v) => v.name === targetColumn);
  if (targetMeta && targetMeta.missingCount > 0) {
    actions.push({
      id: `target_missing_${targetColumn}`,
      category: 'missing',
      column: targetColumn,
      title: `Excluir ${targetMeta.missingCount} registros sin valor en la variable objetivo "${targetColumn}"`,
      reason: 'Un modelo supervisado de clasificación no puede aprender ni evaluarse con registros que carecen de etiqueta objetivo.',
      impactSummary: `Se omitirán ${targetMeta.missingCount} filas sin etiqueta.`,
      enabled: true,
      recommended: true,
      severity: 'warning',
    });
  }

  // Encoding informational summary
  const catPredictors = selectedPredictors.filter((col) => {
    const m = dataset.variables.find((v) => v.name === col);
    return m && m.type.startsWith('categorical_');
  });
  if (catPredictors.length > 0) {
    actions.push({
      id: 'encode_categoricals',
      category: 'encoding',
      title: `Codificación estructural para ${catPredictors.length} variables categóricas`,
      reason: 'El motor del Árbol de Decisión evalúa particiones binarias óptimas por subconjuntos de categorías, preservando la interpretabilidad original de las etiquetas.',
      impactSummary: `Variables codificadas manteniendo nombres legibles para negocio: ${catPredictors.slice(0, 4).join(', ')}${catPredictors.length > 4 ? '...' : ''}.`,
      enabled: true,
      recommended: true,
      severity: 'info',
    });
  }

  return actions;
}

export function executePreparationPlan(
  dataset: Dataset,
  targetColumn: string,
  selectedPredictors: string[],
  actions: PrepAction[]
): PreparedDataset {
  let workingRows: DataRow[] = dataset.rows.map((r) => ({ ...r }));
  const removedCols: { name: string; reason: string }[] = [];
  const imputedColumns: string[] = [];
  const normalizedColumns: string[] = [];
  let removedDuplicates = 0;

  // 1. Filter out rows with missing target
  workingRows = workingRows.filter((r) => r[targetColumn] !== null && r[targetColumn] !== undefined);

  // 2. Remove duplicates if enabled
  const dupAction = actions.find((a) => a.id === 'remove_duplicates');
  if (dupAction?.enabled) {
    const seen = new Set<string>();
    const deduped: DataRow[] = [];
    for (const r of workingRows) {
      const sig = dataset.columns.map((c) => String(r[c] ?? '__NULL__')).join('||');
      if (seen.has(sig)) {
        removedDuplicates++;
      } else {
        seen.add(sig);
        deduped.push(r);
      }
    }
    workingRows = deduped;
  }

  // 3. Determine kept predictors
  const droppedSet = new Set<string>();
  for (const act of actions) {
    if (
      act.enabled &&
      act.column &&
      (act.category === 'irrelevant' || act.category === 'leakage')
    ) {
      droppedSet.add(act.column);
      removedCols.push({ name: act.column, reason: act.reason });
    }
  }

  const finalPredictors = selectedPredictors.filter((c) => !droppedSet.has(c) && c !== targetColumn);

  // 4. Normalize categorical text case/whitespace
  for (const col of [...finalPredictors, targetColumn]) {
    const normAct = actions.find((a) => a.id === `norm_${col}`);
    if (normAct?.enabled || col === targetColumn) {
      const canonicalByLower = new Map<string, string>();
      for (const r of workingRows) {
        const v = r[col];
        if (typeof v === 'string') {
          const clean = v.trim().replace(/\s+/g, ' ');
          const lower = clean.toLowerCase();
          if (!canonicalByLower.has(lower)) {
            canonicalByLower.set(lower, clean);
          }
          r[col] = canonicalByLower.get(lower)!;
        }
      }
      if (normAct?.enabled) normalizedColumns.push(col);
    }
  }

  // 5. Impute missing values
  for (const col of finalPredictors) {
    const impAct = actions.find((a) => a.id === `impute_${col}`);
    const meta = dataset.variables.find((v) => v.name === col);
    if (!meta) continue;

    const validVals = workingRows
      .map((r) => r[col])
      .filter((v): v is string | number => v !== null);

    if (validVals.length === 0) continue;

    if (impAct?.enabled) {
      if (meta.type.startsWith('numeric_')) {
        const nums = validVals
          .filter((v): v is number => typeof v === 'number')
          .sort((a, b) => a - b);
        const median = nums.length > 0 ? nums[Math.floor(nums.length / 2)] : 0;
        for (const r of workingRows) {
          if (r[col] === null) r[col] = median;
        }
      } else {
        const counts = new Map<string, number>();
        for (const v of validVals) {
          const s = String(v);
          counts.set(s, (counts.get(s) ?? 0) + 1);
        }
        let mode = String(validVals[0]);
        let best = -1;
        for (const [k, c] of counts.entries()) {
          if (c > best) {
            best = c;
            mode = k;
          }
        }
        for (const r of workingRows) {
          if (r[col] === null) r[col] = mode;
        }
      }
      imputedColumns.push(col);
    } else if (meta.missingCount > 0) {
      // If user explicitly disabled imputation for a column with nulls, fill fallback marker for safe tree processing
      for (const r of workingRows) {
        if (r[col] === null) {
          r[col] = meta.type.startsWith('numeric_') ? 0 : 'Sin Dato';
        }
      }
    }
  }

  // Ensure target values are clean strings
  const classesSet = new Set<string>();
  for (const r of workingRows) {
    const tStr = String(r[targetColumn]);
    r[targetColumn] = tStr;
    classesSet.add(tStr);
  }

  return {
    rows: workingRows,
    targetColumn,
    predictorColumns: finalPredictors,
    classes: Array.from(classesSet).sort(),
    removedDuplicates,
    imputedColumns,
    droppedColumns: removedCols,
    normalizedColumns,
    actionsApplied: actions.filter((a) => a.enabled),
  };
}
