import * as XLSX from 'xlsx';
import {
  DataInconsistency,
  DataQualityReport,
  DataRow,
  DataValue,
  Dataset,
  EconomicSector,
  VariableMeta,
  VariableRole,
  VariableType,
} from '../types/analytics';

function normalizeCell(val: unknown): DataValue {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  if (typeof val === 'boolean') {
    return val ? 'Sí' : 'No';
  }
  const str = String(val).trim();
  if (
    str === '' ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'nan' ||
    str.toLowerCase() === 'n/a' ||
    str.toLowerCase() === 'na' ||
    str === '-'
  ) {
    return null;
  }
  // Check numeric string (handle comma decimal only if unambiguous, standard dot decimal)
  const numericCandidate = str.replace(/\s+/g, '');
  if (/^-?\d+(\.\d+)?$/.test(numericCandidate)) {
    const parsed = Number(numericCandidate);
    if (Number.isFinite(parsed)) return parsed;
  }
  return str;
}

function detectDelimiter(text: string): string {
  const firstLines = text.split(/\r?\n/).slice(0, 10).filter((l) => l.trim().length > 0);
  const candidates = [',', ';', '\t', '|'];
  let bestDelim = ',';
  let bestScore = -1;
  for (const delim of candidates) {
    const counts = firstLines.map((line) => line.split(delim).length);
    const avg = counts.reduce((a, b) => a + b, 0) / Math.max(1, counts.length);
    const variance =
      counts.reduce((acc, c) => acc + Math.pow(c - avg, 2), 0) / Math.max(1, counts.length);
    if (avg > 1 && variance < 0.5) {
      const score = avg - variance;
      if (score > bestScore) {
        bestScore = score;
        bestDelim = delim;
      }
    }
  }
  return bestDelim;
}

function parseDelimitedText(text: string): DataRow[] {
  const cleanText = text.replace(/^\uFEFF/, '').trim();
  if (!cleanText) return [];
  const delimiter = detectDelimiter(cleanText);

  const lines: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    if (ch === '"') {
      if (inQuotes && cleanText[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && cleanText[i + 1] === '\n') i++;
      if (current.trim().length > 0) lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim().length > 0) lines.push(current);
  if (lines.length < 2) return [];

  const splitRow = (line: string): string[] => {
    const cells: string[] = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = !quoted;
        }
      } else if (ch === delimiter && !quoted) {
        cells.push(cell.trim());
        cell = '';
      } else {
        cell += ch;
      }
    }
    cells.push(cell.trim());
    return cells;
  };

  const rawHeaders = splitRow(lines[0]).map((h, idx) => h || `Columna_${idx + 1}`);
  const headers = deduplicateHeaders(rawHeaders);

  const rows: DataRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const vals = splitRow(lines[r]);
    if (vals.every((v) => v === '')) continue;
    const row: DataRow = {};
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]] = normalizeCell(vals[c] ?? null);
    }
    rows.push(row);
  }
  return rows;
}

function deduplicateHeaders(raw: string[]): string[] {
  const seen: Record<string, number> = {};
  return raw.map((h) => {
    const clean = h.trim() || 'Columna';
    if (!seen[clean]) {
      seen[clean] = 1;
      return clean;
    }
    seen[clean] += 1;
    return `${clean}_${seen[clean]}`;
  });
}

const ORDINAL_HINTS = [
  ['bajo', 'medio', 'alto'],
  ['muy bajo', 'bajo', 'medio', 'alto', 'muy alto'],
  ['basico', 'estandar', 'premium'],
  ['básico', 'estándar', 'premium'],
  ['bronce', 'plata', 'oro', 'platino'],
  ['pequeño', 'mediano', 'grande'],
  ['malo', 'regular', 'bueno', 'excelente'],
  ['nunca', 'rara vez', 'a veces', 'frecuentemente', 'siempre'],
  ['inicial', 'intermedio', 'avanzado'],
  ['junior', 'semi-senior', 'senior'],
];

const ID_COLUMN_REGEX = /(^id$|_id$|^id_|codigo|código|folio|documento|cedula|cédula|rut|dni|uuid|email|correo|telefono|teléfono|nombre_completo)/i;
const CATEGORICAL_CODE_REGEX = /(codigo|código|categoria|categoría|segmento|nivel|grado|estrato|tipo|clase|grupo|sucursal|zona|region|región|canal|plan)/i;
const TARGET_NAME_HINTS = /(churn|abandono|desercion|deserción|incumplimiento|default|compra|recompra|respuesta|conversion|conversión|riesgo|aprobado|estado|target|objetivo|fraude|resultado|cancelacion|cancelación|retencion|retención)/i;

export function analyzeDataset(
  rawRows: DataRow[],
  fileName: string,
  sourceType: 'uploaded' | 'synthetic',
  sector: EconomicSector,
  businessContext: string,
  scenarioDescription?: string
): Dataset {
  if (rawRows.length === 0) {
    throw new Error('El archivo no contiene registros válidos para analizar.');
  }

  const columns = Object.keys(rawRows[0]);
  const rows: DataRow[] = rawRows.map((r) => {
    const clean: DataRow = {};
    for (const col of columns) {
      clean[col] = normalizeCell(r[col]);
    }
    return clean;
  });

  const inconsistencies: DataInconsistency[] = [];
  const variables: VariableMeta[] = [];
  let totalMissingCells = 0;

  for (const col of columns) {
    const values = rows.map((r) => r[col]);
    const nonNull = values.filter((v): v is string | number => v !== null);
    const missingCount = values.length - nonNull.length;
    totalMissingCells += missingCount;
    const missingPct = (missingCount / values.length) * 100;

    const numericValues = nonNull.filter((v): v is number => typeof v === 'number');
    const stringValues = nonNull.filter((v): v is string => typeof v === 'string');

    // Detect mixed types
    if (numericValues.length > 0 && stringValues.length > 0) {
      inconsistencies.push({
        column: col,
        type: 'mixed_type',
        description: `Contiene mezcla de valores numéricos (${numericValues.length}) y texto (${stringValues.length}).`,
        affectedCount: Math.min(numericValues.length, stringValues.length),
      });
    }

    // Detect case/whitespace inconsistencies on strings
    if (stringValues.length > 0) {
      const canonicalMap = new Map<string, Set<string>>();
      for (const s of stringValues) {
        const key = s.trim().toLowerCase();
        if (!canonicalMap.has(key)) canonicalMap.set(key, new Set());
        canonicalMap.get(key)!.add(s);
      }
      let variantCount = 0;
      for (const set of canonicalMap.values()) {
        if (set.size > 1) variantCount += set.size;
      }
      if (variantCount > 0) {
        inconsistencies.push({
          column: col,
          type: 'case_whitespace',
          description: `Existen categorías equivalentes escritas con variaciones de mayúsculas o espacios.`,
          affectedCount: variantCount,
        });
      }
    }

    const uniqueSet = new Set(nonNull.map((v) => String(v)));
    const uniqueCount = uniqueSet.size;
    const examples = Array.from(uniqueSet).slice(0, 4);

    if (uniqueCount <= 1 && nonNull.length > 0) {
      inconsistencies.push({
        column: col,
        type: 'constant',
        description: `La columna tiene un único valor constante y no aporta capacidad predictiva.`,
        affectedCount: rows.length,
      });
    }

    if (missingPct > 30) {
      inconsistencies.push({
        column: col,
        type: 'high_missing',
        description: `Presenta ${missingPct.toFixed(1)}% de datos faltantes, lo cual puede debilitar la calidad del modelo.`,
        affectedCount: missingCount,
      });
    }

    // Determine VariableType smartly
    const mostlyNumeric = numericValues.length >= nonNull.length * 0.85 && numericValues.length > 0;
    let detectedType: VariableType = 'categorical_nominal';
    let isNumericEncodedCategorical = false;
    let ordinalOrder: string[] | undefined;

    if (mostlyNumeric) {
      const allIntegers = numericValues.every((n) => Number.isInteger(n));
      const isBinary01 =
        uniqueCount === 2 &&
        numericValues.every((n) => n === 0 || n === 1);
      const smallSequentialCodes =
        allIntegers &&
        uniqueCount <= 8 &&
        (CATEGORICAL_CODE_REGEX.test(col) ||
          (Math.min(...numericValues) >= 1 && Math.max(...numericValues) <= 7 && uniqueCount <= 5 && !/edad|mes|año|cantidad|numero|número|hijos|visitas|reclamos|dias|días|score|calificacion|calificación/i.test(col)));

      if (isBinary01) {
        detectedType = 'categorical_binary';
        isNumericEncodedCategorical = true;
      } else if (smallSequentialCodes) {
        detectedType = 'categorical_nominal';
        isNumericEncodedCategorical = true;
      } else if (!allIntegers) {
        detectedType = 'numeric_continuous';
      } else if (uniqueCount <= 15) {
        detectedType = 'numeric_discrete';
      } else {
        detectedType = 'numeric_integer';
      }

      // Check IQR outliers for truly numeric columns
      if (detectedType.startsWith('numeric_') && numericValues.length >= 10) {
        const sorted = [...numericValues].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        if (iqr > 0) {
          const lower = q1 - 3 * iqr;
          const upper = q3 + 3 * iqr;
          const extremeCount = numericValues.filter((v) => v < lower || v > upper).length;
          if (extremeCount > 0) {
            inconsistencies.push({
              column: col,
              type: 'outlier_extreme',
              description: `Se detectaron ${extremeCount} valores atípicos extremos (fuera de 3 × IQR).`,
              affectedCount: extremeCount,
            });
          }
        }
      }
    } else {
      if (uniqueCount === 2) {
        detectedType = 'categorical_binary';
      } else {
        const lowerVals = Array.from(uniqueSet).map((v) => v.toLowerCase());
        const matchedOrdinal = ORDINAL_HINTS.find((pattern) =>
          lowerVals.every((lv) => pattern.includes(lv))
        );
        if (matchedOrdinal) {
          detectedType = 'categorical_ordinal';
          ordinalOrder = matchedOrdinal.filter((p) => lowerVals.includes(p));
        } else {
          detectedType = 'categorical_nominal';
        }
      }
    }

    // Determine initial role
    let role: VariableRole = 'predictor';
    let notes = '';

    const uniquenessRatio = uniqueCount / Math.max(1, nonNull.length);
    if (
      ID_COLUMN_REGEX.test(col) ||
      (uniqueCount > 30 && uniquenessRatio > 0.85 && !detectedType.startsWith('numeric_continuous'))
    ) {
      role = 'identifier';
      notes = 'Posible identificador único; se recomienda excluir del entrenamiento.';
    } else if (uniqueCount <= 1) {
      role = 'ignored';
      notes = 'Variable constante sin variabilidad.';
    } else if (
      TARGET_NAME_HINTS.test(col) &&
      detectedType.startsWith('categorical_') &&
      uniqueCount >= 2 &&
      uniqueCount <= 10
    ) {
      role = 'target_candidate';
      notes = 'Candidata natural a variable objetivo de clasificación.';
    } else if (isNumericEncodedCategorical) {
      notes = 'Codificada con números, pero representa categorías discretas.';
    }

    variables.push({
      name: col,
      detectedType,
      type: detectedType,
      uniqueCount,
      missingCount,
      missingPct,
      examples,
      role,
      isNumericEncodedCategorical,
      ordinalOrder,
      notes,
    });
  }

  // Detect duplicate rows
  const rowHashes = new Set<string>();
  let duplicateRows = 0;
  for (const r of rows) {
    const sig = columns.map((c) => String(r[c] ?? '__NULL__')).join('||');
    if (rowHashes.has(sig)) {
      duplicateRows++;
    } else {
      rowHashes.add(sig);
    }
  }

  const quality: DataQualityReport = {
    rowCount: rows.length,
    columnCount: columns.length,
    totalMissingCells,
    missingPct: (totalMissingCells / Math.max(1, rows.length * columns.length)) * 100,
    duplicateRows,
    inconsistencies,
  };

  return {
    id: `ds_${Date.now()}`,
    fileName,
    sourceType,
    sector,
    businessContext,
    scenarioDescription,
    columns,
    rows,
    variables,
    quality,
    loadedAt: new Date().toISOString(),
  };
}

export async function parseUploadedFile(
  file: File,
  sector: EconomicSector,
  businessContext: string
): Promise<Dataset> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  let rawRows: DataRow[] = [];

  if (ext === 'xlsx' || ext === 'xls' || ext === 'ods') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('El libro de Excel no contiene hojas visibles.');
    }
    const sheet = workbook.Sheets[firstSheetName];
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
      raw: true,
    });
    if (jsonRows.length === 0) {
      throw new Error('La primera hoja del archivo Excel está vacía.');
    }
    rawRows = jsonRows.map((row) => {
      const clean: DataRow = {};
      for (const k of Object.keys(row)) {
        clean[k.trim() || 'Columna'] = normalizeCell(row[k]);
      }
      return clean;
    });
  } else if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
    const text = await file.text();
    rawRows = parseDelimitedText(text);
    if (rawRows.length === 0) {
      throw new Error('No se pudieron extraer filas tabulares válidas del archivo de texto.');
    }
  } else if (ext === 'json') {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('El archivo JSON debe contener un arreglo de objetos.');
    }
    rawRows = parsed.map((obj) => {
      const clean: DataRow = {};
      for (const k of Object.keys(obj)) {
        clean[k] = normalizeCell(obj[k]);
      }
      return clean;
    });
  } else {
    throw new Error(`Formato .${ext} no soportado. Utilice Excel (.xlsx, .xls), CSV (.csv), TXT (.txt) o JSON.`);
  }

  return analyzeDataset(rawRows, file.name, 'uploaded', sector, businessContext);
}
