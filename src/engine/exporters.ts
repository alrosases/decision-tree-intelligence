import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BusinessDiagnostic,
  CategoricalStats,
  Dataset,
  ExecutiveSummary,
  NumericStats,
  ObjectiveConfig,
  PreparedDataset,
  PruningComparisonRow,
  StrategyItem,
  TreeModelResult,
  TreeNode,
} from '../types/analytics';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportPreparedDataExcel(prepared: PreparedDataset, baseName: string) {
  const ws = XLSX.utils.json_to_sheet(prepared.rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Datos_Preparados');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  triggerDownload(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${baseName}_preparada.xlsx`
  );
}

export function exportPreparedDataCSV(prepared: PreparedDataset, baseName: string) {
  const ws = XLSX.utils.json_to_sheet(prepared.rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  triggerDownload(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }), `${baseName}_preparada.csv`);
}

export function exportPredictionsExcel(model: TreeModelResult, baseName: string) {
  const rows = model.evaluation.testPredictions.map((p) => ({
    Registro_Original: p.rowIndex,
    Valor_Real: p.actual,
    Prediccion_Modelo: p.predicted,
    Confianza_Pct: Number(p.confidence.toFixed(1)),
    Acierto: p.correct ? 'Correcto' : 'Error',
    ...p.features,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Predicciones_Prueba');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  triggerDownload(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${baseName}_predicciones.xlsx`
  );
}

export function exportPredictionsCSV(model: TreeModelResult, baseName: string) {
  const rows = model.evaluation.testPredictions.map((p) => ({
    Registro_Original: p.rowIndex,
    Valor_Real: p.actual,
    Prediccion_Modelo: p.predicted,
    Confianza_Pct: Number(p.confidence.toFixed(1)),
    Acierto: p.correct ? 'Correcto' : 'Error',
    ...p.features,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  triggerDownload(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }), `${baseName}_predicciones.csv`);
}

export function exportEvaluationExcel(
  model: TreeModelResult,
  pruningRows: PruningComparisonRow[],
  baseName: string
) {
  const wb = XLSX.utils.book_new();

  const summaryRows = [
    { Metrica: 'Accuracy Entrenamiento', Valor: `${(model.evaluation.trainAccuracy * 100).toFixed(2)}%` },
    { Metrica: 'Accuracy Prueba', Valor: `${(model.evaluation.testAccuracy * 100).toFixed(2)}%` },
    { Metrica: 'Precision Ponderada', Valor: `${(model.evaluation.weightedPrecision * 100).toFixed(2)}%` },
    { Metrica: 'Recall Ponderado', Valor: `${(model.evaluation.weightedRecall * 100).toFixed(2)}%` },
    { Metrica: 'F1-score Ponderado', Valor: `${(model.evaluation.weightedF1 * 100).toFixed(2)}%` },
    { Metrica: 'F1-score Macro', Valor: `${(model.evaluation.macroF1 * 100).toFixed(2)}%` },
    { Metrica: 'Especificidad Promedio', Valor: `${(model.evaluation.avgSpecificity * 100).toFixed(2)}%` },
    { Metrica: 'Profundidad del Árbol', Valor: model.summary.depth },
    { Metrica: 'Cantidad de Nodos', Valor: model.summary.nodeCount },
    { Metrica: 'Cantidad de Hojas', Valor: model.summary.leafCount },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Resumen_Evaluacion');

  const classRows = model.evaluation.classMetrics.map((m) => ({
    Categoria: m.className,
    Soporte_Prueba: m.support,
    Verdaderos_Positivos: m.tp,
    Falsos_Positivos: m.fp,
    Verdaderos_Negativos: m.tn,
    Falsos_Negativos: m.fn,
    Precision_Pct: Number((m.precision * 100).toFixed(2)),
    Recall_Pct: Number((m.recall * 100).toFixed(2)),
    F1_Score_Pct: Number((m.f1 * 100).toFixed(2)),
    Especificidad_Pct: Number((m.specificity * 100).toFixed(2)),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(classRows), 'Metricas_Por_Clase');

  const impRows = model.featureImportances.map((f, i) => ({
    Ranking: i + 1,
    Variable: f.feature,
    Importancia_Pct: Number(f.importancePct.toFixed(2)),
    Divisiones: f.splitCount,
    Rol_Empresarial: f.businessRole,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(impRows), 'Importancia_Variables');

  if (pruningRows.length > 0) {
    const pruneSheet = pruningRows.map((p) => ({
      Alternativa: p.label,
      Metodo: p.method,
      Nodos: p.summary.nodeCount,
      Hojas: p.summary.leafCount,
      Profundidad: p.summary.depth,
      Accuracy_Train_Pct: Number((p.summary.trainAccuracy * 100).toFixed(2)),
      Accuracy_Test_Pct: Number((p.summary.testAccuracy * 100).toFixed(2)),
      F1_Test_Pct: Number((p.summary.testF1 * 100).toFixed(2)),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pruneSheet), 'Comparacion_Poda');
  }

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  triggerDownload(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${baseName}_evaluacion.xlsx`
  );
}

// High-resolution Canvas renderers for PNG exports and PDF embedding
export function renderConfusionMatrixCanvas(model: TreeModelResult): HTMLCanvasElement {
  const { classes, confusionMatrix } = model.evaluation;
  const k = classes.length;
  const cellSize = k <= 3 ? 96 : 74;
  const labelPadLeft = 140;
  const labelPadTop = 100;
  const width = labelPadLeft + k * cellSize + 40;
  const height = labelPadTop + k * cellSize + 50;

  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  ctx.fillStyle = '#18221F';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#F3F7F4';
  ctx.font = 'bold 14px Manrope, sans-serif';
  ctx.fillText('Matriz de Confusión (Conjunto de Prueba)', 20, 28);

  ctx.fillStyle = '#A1B2AA';
  ctx.font = '11px Manrope, sans-serif';
  ctx.fillText('Predicción del Modelo →', labelPadLeft, 58);

  ctx.save();
  ctx.translate(22, labelPadTop + (k * cellSize) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('Valor Real ↓', 0, 0);
  ctx.restore();

  const maxVal = Math.max(1, ...confusionMatrix.flat());

  for (let c = 0; c < k; c++) {
    ctx.fillStyle = '#F3F7F4';
    ctx.font = '600 11px Manrope, sans-serif';
    ctx.textAlign = 'center';
    const label = classes[c].length > 14 ? classes[c].slice(0, 12) + '…' : classes[c];
    ctx.fillText(label, labelPadLeft + c * cellSize + cellSize / 2, labelPadTop - 12);
  }

  for (let r = 0; r < k; r++) {
    ctx.fillStyle = '#F3F7F4';
    ctx.font = '600 11px Manrope, sans-serif';
    ctx.textAlign = 'right';
    const label = classes[r].length > 15 ? classes[r].slice(0, 13) + '…' : classes[r];
    ctx.fillText(label, labelPadLeft - 12, labelPadTop + r * cellSize + cellSize / 2 + 4);

    for (let c = 0; c < k; c++) {
      const val = confusionMatrix[r][c];
      const intensity = val / maxVal;
      const isDiag = r === c;
      ctx.fillStyle = isDiag
        ? `rgba(16, 185, 129, ${0.18 + intensity * 0.62})`
        : `rgba(245, 158, 11, ${val > 0 ? 0.14 + intensity * 0.45 : 0.04})`;
      const x = labelPadLeft + c * cellSize + 3;
      const y = labelPadTop + r * cellSize + 3;
      ctx.fillRect(x, y, cellSize - 6, cellSize - 6);
      ctx.strokeStyle = isDiag ? '#10B981' : '#2C3B35';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellSize - 6, cellSize - 6);

      ctx.fillStyle = '#F3F7F4';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(val), x + (cellSize - 6) / 2, y + (cellSize - 6) / 2 + 6);
    }
  }

  return canvas;
}

export function renderFeatureImportanceCanvas(model: TreeModelResult): HTMLCanvasElement {
  const items = model.featureImportances.slice(0, 8);
  const width = 620;
  const rowH = 38;
  const height = 70 + items.length * rowH;

  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  ctx.fillStyle = '#18221F';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#F3F7F4';
  ctx.font = 'bold 14px Manrope, sans-serif';
  ctx.fillText('Importancia de Variables en el Árbol de Decisión (%)', 20, 30);

  const labelW = 190;
  const barMaxW = 330;

  items.forEach((item, idx) => {
    const y = 55 + idx * rowH;
    ctx.fillStyle = '#F3F7F4';
    ctx.font = '500 11px Manrope, sans-serif';
    ctx.textAlign = 'left';
    const name = item.feature.length > 24 ? item.feature.slice(0, 22) + '…' : item.feature;
    ctx.fillText(name, 20, y + 18);

    ctx.fillStyle = '#202C27';
    ctx.fillRect(labelW, y + 5, barMaxW, 18);

    const w = (item.importancePct / 100) * barMaxW;
    ctx.fillStyle = idx === 0 ? '#10B981' : idx === 1 ? '#2DD4BF' : '#A3E635';
    ctx.fillRect(labelW, y + 5, Math.max(2, w), 18);

    ctx.fillStyle = '#F3F7F4';
    ctx.font = '600 11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${item.importancePct.toFixed(1)}%`, width - 20, y + 18);
  });

  return canvas;
}

export function renderImpactEffortCanvas(strategies: StrategyItem[]): HTMLCanvasElement {
  const width = 660;
  const height = 440;
  const pad = 55;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  ctx.fillStyle = '#18221F';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#F3F7F4';
  ctx.font = 'bold 14px Manrope, sans-serif';
  ctx.fillText('Matriz de Impacto vs. Esfuerzo (Hipótesis de Planificación)', 20, 28);

  // Quadrants
  const midX = pad + plotW / 2;
  const midY = pad + plotH / 2;

  // Quick wins (top-left: high impact, low effort)
  ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
  ctx.fillRect(pad, pad, plotW / 2, plotH / 2);
  // Strategic initiatives (top-right: high impact, high effort)
  ctx.fillStyle = 'rgba(45, 212, 191, 0.10)';
  ctx.fillRect(midX, pad, plotW / 2, plotH / 2);
  // Complementary (bottom-left)
  ctx.fillStyle = 'rgba(163, 230, 53, 0.06)';
  ctx.fillRect(pad, midY, plotW / 2, plotH / 2);
  // Low priority (bottom-right)
  ctx.fillStyle = 'rgba(161, 178, 170, 0.05)';
  ctx.fillRect(midX, midY, plotW / 2, plotH / 2);

  ctx.strokeStyle = '#2C3B35';
  ctx.lineWidth = 1;
  ctx.strokeRect(pad, pad, plotW, plotH);
  ctx.beginPath();
  ctx.moveTo(midX, pad);
  ctx.lineTo(midX, pad + plotH);
  ctx.moveTo(pad, midY);
  ctx.lineTo(pad + plotW, midY);
  ctx.stroke();

  ctx.font = '600 10px Manrope, sans-serif';
  ctx.fillStyle = '#10B981';
  ctx.fillText('QUICK WINS (Alto Impacto / Bajo Esfuerzo)', pad + 8, pad + 16);
  ctx.fillStyle = '#2DD4BF';
  ctx.fillText('INICIATIVAS ESTRATÉGICAS (Alto / Alto)', midX + 8, pad + 16);
  ctx.fillStyle = '#A3E635';
  ctx.fillText('MEJORAS COMPLEMENTARIAS (Bajo / Bajo)', pad + 8, pad + plotH - 8);
  ctx.fillStyle = '#A1B2AA';
  ctx.fillText('BAJA PRIORIDAD (Bajo / Alto)', midX + 8, pad + plotH - 8);

  strategies.forEach((s, idx) => {
    const x = pad + ((s.effortScore - 1) / 9) * plotW;
    const y = pad + plotH - ((s.impactScore - 1) / 9) * plotH;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle =
      s.quadrant === 'quick_wins'
        ? '#10B981'
        : s.quadrant === 'strategic_initiatives'
        ? '#2DD4BF'
        : s.quadrant === 'complementary'
        ? '#A3E635'
        : '#A1B2AA';
    ctx.fill();
    ctx.fillStyle = '#101715';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(idx + 1), x, y + 3);
  });

  ctx.fillStyle = '#A1B2AA';
  ctx.font = '11px Manrope, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Esfuerzo Requerido (1 = Bajo → 10 = Alto)', pad + plotW / 2, height - 16);

  return canvas;
}

export function renderDecisionTreeCanvas(root: TreeNode): HTMLCanvasElement {
  // Compute tree layout recursively
  interface LayoutItem {
    node: TreeNode;
    x: number;
    y: number;
    parentX?: number;
    parentY?: number;
    branchLabel?: string;
  }

  const leafCount = (n: TreeNode): number =>
    n.isLeaf || !n.left || !n.right ? 1 : leafCount(n.left) + leafCount(n.right);

  const totalLeaves = Math.max(1, leafCount(root));
  const maxD = (() => {
    const d = (n: TreeNode): number =>
      n.isLeaf || !n.left || !n.right ? 0 : 1 + Math.max(d(n.left), d(n.right));
    return d(root);
  })();

  const nodeW = 165;
  const nodeH = 66;
  const hGap = 24;
  const vGap = 95;
  const width = Math.max(760, totalLeaves * (nodeW + hGap) + 60);
  const height = Math.max(360, (maxD + 1) * (nodeH + vGap) + 60);

  const items: LayoutItem[] = [];
  let cursorLeaf = 0;

  const layout = (
    node: TreeNode,
    depth: number,
    parentX?: number,
    parentY?: number,
    branchLabel?: string
  ): number => {
    const y = 50 + depth * (nodeH + vGap);
    if (node.isLeaf || !node.left || !node.right) {
      const x = 40 + cursorLeaf * (nodeW + hGap) + nodeW / 2;
      cursorLeaf++;
      items.push({ node, x, y, parentX, parentY, branchLabel });
      return x;
    }
    const lx = layout(node.left, depth + 1);
    const rx = layout(node.right, depth + 1);
    const x = (lx + rx) / 2;
    // Patch parent coordinates for children
    const leftChild = items.find((i) => i.node.id === node.left!.id);
    const rightChild = items.find((i) => i.node.id === node.right!.id);
    if (leftChild) {
      leftChild.parentX = x;
      leftChild.parentY = y;
      leftChild.branchLabel = 'Sí / Izq';
    }
    if (rightChild) {
      rightChild.parentX = x;
      rightChild.parentY = y;
      rightChild.branchLabel = 'No / Der';
    }
    items.push({ node, x, y, parentX, parentY, branchLabel });
    return x;
  };

  layout(root, 0);

  const canvas = document.createElement('canvas');
  canvas.width = width * 1.5;
  canvas.height = height * 1.5;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(1.5, 1.5);

  ctx.fillStyle = '#101715';
  ctx.fillRect(0, 0, width, height);

  // Edges
  for (const item of items) {
    if (item.parentX !== undefined && item.parentY !== undefined) {
      ctx.strokeStyle = '#3A4F47';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(item.parentX, item.parentY + nodeH);
      ctx.lineTo(item.x, item.y);
      ctx.stroke();
    }
  }

  // Nodes
  for (const { node, x, y } of items) {
    const left = x - nodeW / 2;
    ctx.fillStyle = node.isLeaf ? '#182A24' : '#202C27';
    ctx.strokeStyle = node.isLeaf ? '#10B981' : '#2DD4BF';
    ctx.lineWidth = 1.4;
    ctx.fillRect(left, y, nodeW, nodeH);
    ctx.strokeRect(left, y, nodeW, nodeH);

    ctx.fillStyle = '#F3F7F4';
    ctx.font = 'bold 10px Manrope, sans-serif';
    ctx.textAlign = 'center';
    const title = node.isLeaf
      ? `Clase: ${node.predictedClass}`
      : (node.conditionLabel ?? '').slice(0, 24);
    ctx.fillText(title, x, y + 20);

    ctx.fillStyle = '#A1B2AA';
    ctx.font = '10px monospace';
    ctx.fillText(`n=${node.samples} · ${node.confidencePct.toFixed(1)}%`, x, y + 38);

    ctx.fillStyle = node.isLeaf ? '#A3E635' : '#2DD4BF';
    ctx.font = '9px Manrope, sans-serif';
    ctx.fillText(
      node.isLeaf ? 'Hoja final' : `Predomina: ${node.predictedClass}`,
      x,
      y + 54
    );
  }

  return canvas;
}

export function exportCanvasPNG(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (blob) triggerDownload(blob, filename);
  }, 'image/png');
}

export function exportExecutivePDF(params: {
  dataset: Dataset;
  objective: ObjectiveConfig;
  prepared: PreparedDataset;
  numericStats: NumericStats[];
  categoricalStats: CategoricalStats[];
  model: TreeModelResult;
  pruningRows: PruningComparisonRow[];
  diagnostic: BusinessDiagnostic;
  strategies: StrategyItem[];
  executiveSummary: ExecutiveSummary;
}) {
  const {
    dataset,
    objective,
    prepared,
    numericStats,
    categoricalStats,
    model,
    pruningRows,
    diagnostic,
    strategies,
    executiveSummary,
  } = params;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageW - margin * 2;

  const addSectionHeader = (num: string, title: string, yPos: number): number => {
    if (yPos > pageH - 40) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFillColor(16, 185, 129);
    doc.rect(margin, yPos, 3, 6, 'F');
    doc.setTextColor(16, 23, 21);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`${num}. ${title}`, margin + 6, yPos + 4.8);
    return yPos + 10;
  };

  const addParagraph = (text: string, yPos: number, fontSize = 9.5): number => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(45, 55, 50);
    const lines = doc.splitTextToSize(text, contentW);
    if (yPos + lines.length * 4.5 > pageH - 18) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(lines, margin, yPos);
    return yPos + lines.length * 4.5 + 3;
  };

  // 1. Portada
  doc.setFillColor(16, 23, 21);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setFillColor(16, 185, 129);
  doc.rect(margin, 42, 24, 2, 'F');

  doc.setTextColor(243, 247, 244);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('Decision Tree Intelligence', margin, 60);

  doc.setFontSize(15);
  doc.setTextColor(45, 212, 191);
  doc.text('Informe Ejecutivo de Analítica Predictiva y Estrategia', margin, 72);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(161, 178, 170);
  const coverDesc = doc.splitTextToSize(
    `Sector: ${dataset.sector}\nContexto empresarial: ${dataset.businessContext}\nArchivo base: ${dataset.fileName} (${dataset.sourceType === 'synthetic' ? 'Datos sintéticos de simulación' : 'Base cargada por el usuario'})\nVariable objetivo: ${objective.targetColumn}\nFecha de emisión: ${new Date().toLocaleDateString('es-ES')}`,
    contentW
  );
  doc.text(coverDesc, margin, 95);

  // KPI highlight box on cover
  doc.setFillColor(24, 34, 31);
  doc.roundedRect(margin, 150, contentW, 38, 3, 3, 'F');
  doc.setTextColor(16, 185, 129);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('RESUMEN DE DESEMPEÑO DEL MODELO', margin + 8, 161);
  doc.setTextColor(243, 247, 244);
  doc.setFontSize(11);
  doc.text(
    `Accuracy Prueba: ${(model.evaluation.testAccuracy * 100).toFixed(1)}%   |   F1-score: ${(model.evaluation.weightedF1 * 100).toFixed(1)}%   |   Profundidad: ${model.summary.depth}   |   Hojas: ${model.summary.leafCount}`,
    margin + 8,
    174
  );

  doc.addPage();
  let y = 20;

  // 2 & 3 & 4. Sector, Descripción y Calidad
  y = addSectionHeader('2', 'Sector Económico y Contexto Empresarial', y);
  y = addParagraph(
    `Sector: ${dataset.sector}. Escenario analizado: ${dataset.businessContext}. ${dataset.scenarioDescription ?? ''}`,
    y
  );

  y = addSectionHeader('3', 'Descripción de la Base de Datos y Calidad', y);
  y = addParagraph(
    `Registros originales: ${dataset.quality.rowCount} | Columnas: ${dataset.quality.columnCount} | Celdas faltantes: ${dataset.quality.totalMissingCells} (${dataset.quality.missingPct.toFixed(2)}%) | Registros duplicados detectados: ${dataset.quality.duplicateRows}.`,
    y
  );

  // 5. Primeras 5 filas
  y = addSectionHeader('4', 'Muestra Inicial (Primeras 5 Filas)', y);
  const sampleCols = dataset.columns.slice(0, 6);
  autoTable(doc, {
    startY: y,
    head: [sampleCols],
    body: dataset.rows.slice(0, 5).map((r) => sampleCols.map((c) => String(r[c] ?? 'N/D'))),
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [24, 34, 31], textColor: [243, 247, 244] },
    margin: { left: margin, right: margin },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // 6. Clasificación de variables
  y = addSectionHeader('5', 'Clasificación Automática de Variables', y);
  autoTable(doc, {
    startY: y,
    head: [['Variable', 'Tipo Clasificado', 'Únicos', 'Faltantes', 'Función']],
    body: dataset.variables.map((v) => [
      v.name,
      v.type,
      String(v.uniqueCount),
      String(v.missingCount),
      v.role,
    ]),
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [24, 34, 31], textColor: [243, 247, 244] },
    margin: { left: margin, right: margin },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // 7 & 8. Análisis Descriptivo
  y = addSectionHeader('6', 'Análisis Descriptivo (Numéricas y Categóricas)', y);
  if (numericStats.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Variable Numérica', 'Media', 'Mediana', 'Desv. Est.', 'Mín', 'Máx', 'Atípicos']],
      body: numericStats.map((n) => [
        n.column,
        n.mean.toFixed(2),
        n.median.toFixed(2),
        n.std.toFixed(2),
        n.min.toFixed(2),
        n.max.toFixed(2),
        String(n.outlierCount),
      ]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [24, 34, 31], textColor: [243, 247, 244] },
      margin: { left: margin, right: margin },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  if (categoricalStats.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Variable Categórica', 'Categorías', 'Predominante', 'Participación %', 'Interpretación']],
      body: categoricalStats.slice(0, 6).map((c) => [
        c.column,
        String(c.uniqueCount),
        c.topCategory,
        `${c.topCategoryPct.toFixed(1)}%`,
        c.interpretation,
      ]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [24, 34, 31], textColor: [243, 247, 244] },
      margin: { left: margin, right: margin },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // 9, 10, 11, 12. Objetivo, Preparación y División 70/30
  y = addSectionHeader('7', 'Objetivo, Preparación y División 70/30', y);
  y = addParagraph(
    `Objetivo del negocio: ${objective.businessGoal || dataset.businessContext}. Variable objetivo (Y): ${objective.targetColumn} (${objective.problemType === 'binary' ? 'Clasificación binaria' : 'Clasificación multiclase'}). Variables predictoras (X): ${prepared.predictorColumns.join(', ')}.`,
    y
  );
  y = addParagraph(
    `Preparación ejecutada: ${prepared.removedDuplicates} duplicados depurados, ${prepared.imputedColumns.length} columnas imputadas, ${prepared.droppedColumns.length} columnas excluidas. División estratificada: ${model.trainCount} registros en entrenamiento (70%) y ${model.testCount} en prueba (30%).`,
    y
  );

  // 13 & 14. Árbol de Decisión
  doc.addPage();
  y = 20;
  y = addSectionHeader('8', 'Árbol de Decisión Construido y Configuración', y);
  y = addParagraph(
    `Criterio: ${model.params.criterion.toUpperCase()} | Profundidad máxima: ${model.params.maxDepth} (real: ${model.summary.depth}) | Min. hojas: ${model.params.minSamplesLeaf} | ccp_alpha: ${model.params.ccpAlpha} | Total nodos: ${model.summary.nodeCount} | Hojas: ${model.summary.leafCount}.`,
    y
  );
  const treeCanvas = renderDecisionTreeCanvas(model.root);
  const treeImg = treeCanvas.toDataURL('image/png');
  const treeAspect = treeCanvas.height / treeCanvas.width;
  const treeH = Math.min(95, contentW * treeAspect);
  doc.addImage(treeImg, 'PNG', margin, y, contentW, treeH);
  y += treeH + 8;

  // 15. Comparación de Poda
  y = addSectionHeader('9', 'Comparación de Alternativas de Poda', y);
  autoTable(doc, {
    startY: y,
    head: [['Alternativa', 'Nodos', 'Hojas', 'Prof.', 'Acc. Train', 'Acc. Test', 'F1 Test']],
    body: pruningRows.map((p) => [
      p.label,
      String(p.summary.nodeCount),
      String(p.summary.leafCount),
      String(p.summary.depth),
      `${(p.summary.trainAccuracy * 100).toFixed(1)}%`,
      `${(p.summary.testAccuracy * 100).toFixed(1)}%`,
      `${(p.summary.testF1 * 100).toFixed(1)}%`,
    ]),
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [24, 34, 31], textColor: [243, 247, 244] },
    margin: { left: margin, right: margin },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // 16 & 17. Matriz de Confusión y Métricas
  doc.addPage();
  y = 20;
  y = addSectionHeader('10', 'Evaluación del Modelo y Matriz de Confusión (Conjunto de Prueba)', y);
  const cmCanvas = renderConfusionMatrixCanvas(model);
  const cmImg = cmCanvas.toDataURL('image/png');
  const cmW = Math.min(125, contentW);
  const cmH = cmW * (cmCanvas.height / cmCanvas.width);
  doc.addImage(cmImg, 'PNG', margin, y, cmW, cmH);
  y += cmH + 6;

  autoTable(doc, {
    startY: y,
    head: [['Categoría', 'Soporte', 'Precision', 'Recall', 'F1-score', 'Especificidad']],
    body: model.evaluation.classMetrics.map((m) => [
      m.className,
      String(m.support),
      `${(m.precision * 100).toFixed(1)}%`,
      `${(m.recall * 100).toFixed(1)}%`,
      `${(m.f1 * 100).toFixed(1)}%`,
      `${(m.specificity * 100).toFixed(1)}%`,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [24, 34, 31], textColor: [243, 247, 244] },
    margin: { left: margin, right: margin },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // 18. Importancia de variables
  y = addSectionHeader('11', 'Importancia de Variables', y);
  const impCanvas = renderFeatureImportanceCanvas(model);
  const impImg = impCanvas.toDataURL('image/png');
  const impH = Math.min(72, contentW * (impCanvas.height / impCanvas.width));
  if (y + impH > pageH - 20) {
    doc.addPage();
    y = 20;
  }
  doc.addImage(impImg, 'PNG', margin, y, contentW, impH);
  y += impH + 8;

  // 19. Interpretación ejecutiva
  doc.addPage();
  y = 20;
  y = addSectionHeader('12', 'Interpretación Ejecutiva de Hallazgos', y);
  y = addParagraph(`Diagnóstico general: ${diagnostic.whatIsHappening}`, y);
  y = addParagraph(`Variables determinantes: ${diagnostic.topVariablesExplanation}`, y);
  y = addParagraph(`Confiabilidad y errores: ${diagnostic.modelReliability} ${diagnostic.modelErrors}`, y);
  y = addParagraph(
    `Patrones principales: ${diagnostic.patternsIdentified.slice(0, 3).join(' | ')}`,
    y
  );

  // 20 & 21. Estrategias y Matriz Impacto vs Esfuerzo
  y = addSectionHeader('13', 'Estrategias Empresariales y Matriz Impacto vs. Esfuerzo', y);
  autoTable(doc, {
    startY: y,
    head: [['Línea', 'Iniciativa', 'Impacto*', 'Esfuerzo*', 'KPI', 'Horizonte']],
    body: strategies.map((s) => [
      s.line,
      s.name,
      `${s.impactLevel} (${s.impactScore})`,
      `${s.effortLevel} (${s.effortScore})`,
      s.kpi,
      s.horizon,
    ]),
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [24, 34, 31], textColor: [243, 247, 244] },
    margin: { left: margin, right: margin },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  y = addParagraph(
    '*Nota metodológica: Los puntajes de impacto y esfuerzo constituyen hipótesis de planificación gerencial y no métricas medidas directamente por el modelo estadístico.',
    y,
    8
  );

  const matCanvas = renderImpactEffortCanvas(strategies);
  const matImg = matCanvas.toDataURL('image/png');
  const matH = Math.min(95, contentW * (matCanvas.height / matCanvas.width));
  if (y + matH > pageH - 20) {
    doc.addPage();
    y = 20;
  }
  doc.addImage(matImg, 'PNG', margin, y, contentW, matH);
  y += matH + 8;

  // 22. Conclusiones y recomendaciones
  y = addSectionHeader('14', 'Conclusiones y Recomendaciones Finales', y);
  y = addParagraph(executiveSummary.expectedBusinessBenefit, y);
  executiveSummary.implementationRoadmap.forEach((step) => {
    y = addParagraph(`• ${step}`, y);
  });

  doc.save(`Decision_Tree_Intelligence_${dataset.sector.replace(/\s+/g, '_')}.pdf`);
}
