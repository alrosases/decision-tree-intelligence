import React, { useState } from 'react';
import {
  ArrowRight,
  Download,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Info,
} from 'lucide-react';
import {
  AppSectionId,
  BusinessDiagnostic,
  CategoricalStats,
  Dataset,
  ExecutiveSummary,
  MatrixQuadrant,
  NumericStats,
  ObjectiveConfig,
  PreparedDataset,
  PruningComparisonRow,
  StrategicLine,
  StrategyItem,
  TreeModelResult,
} from '../types/analytics';
import {
  exportCanvasPNG,
  exportEvaluationExcel,
  exportExecutivePDF,
  exportPredictionsCSV,
  exportPredictionsExcel,
  exportPreparedDataCSV,
  exportPreparedDataExcel,
  renderConfusionMatrixCanvas,
  renderDecisionTreeCanvas,
  renderFeatureImportanceCanvas,
  renderImpactEffortCanvas,
} from '../engine/exporters';

const STRATEGIC_LINES: ('Todas' | StrategicLine)[] = [
  'Todas',
  'Marketing',
  'Comunicación',
  'Fidelización',
  'Innovación',
  'Gestión comercial',
  'Operaciones',
];

const QUADRANT_LABELS: Record<MatrixQuadrant, string> = {
  quick_wins: 'Alto impacto / Bajo esfuerzo (Quick Wins)',
  strategic_initiatives: 'Alto impacto / Alto esfuerzo (Iniciativas estratégicas)',
  complementary: 'Bajo impacto / Bajo esfuerzo (Mejoras complementarias)',
  low_priority: 'Bajo impacto / Alto esfuerzo (Baja prioridad)',
};

interface StrategiesModuleProps {
  strategies: StrategyItem[];
  executiveSummary: ExecutiveSummary;
  onNavigate: (sec: AppSectionId) => void;
}

export const BusinessStrategiesModule: React.FC<StrategiesModuleProps> = ({
  strategies,
  executiveSummary,
  onNavigate,
}) => {
  const [lineFilter, setLineFilter] = useState<'Todas' | StrategicLine>('Todas');

  const filtered =
    lineFilter === 'Todas'
      ? strategies
      : strategies.filter((s) => s.line === lineFilter);

  return (
    <div className="space-y-6">
      <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2B3B35] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#F3F7F4]">
              Aplicación Estratégica al Negocio
            </h2>
            <p className="text-[13px] text-[#A1B2AA] mt-1">
              Iniciativas diseñadas a partir del sector económico, los factores de mayor importancia en el árbol y las reglas reales descubiertas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('matrix')}
            className="px-4 py-2 rounded-md bg-[#10B981] text-[#101715] text-[13px] font-semibold hover:bg-[#2DD4BF] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <span>Priorizar en Matriz 2×2</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Interactive Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 bg-[#18221F] border border-[#2B3B35] p-1.5 rounded-md">
          {STRATEGIC_LINES.map((line) => (
            <button
              key={line}
              type="button"
              onClick={() => setLineFilter(line)}
              className={`px-3 py-1.5 rounded text-[12px] font-medium transition-colors whitespace-nowrap ${
                lineFilter === line
                  ? 'bg-[#10B981] text-[#101715] font-semibold'
                  : 'text-[#A1B2AA] hover:text-[#F3F7F4]'
              }`}
            >
              {line}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((st) => (
            <div
              key={st.id}
              className="bg-[#18221F] border border-[#2B3B35] rounded-md p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="font-semibold text-[#2DD4BF]">{st.line}</span>
                <span className="font-mono tabular-nums text-[#A1B2AA]">
                  Impacto {st.impactScore}/10 · Esfuerzo {st.effortScore}/10
                </span>
              </div>
              <h3 className="text-[15px] font-bold text-[#F3F7F4]">{st.name}</h3>
              <p className="text-[12px] text-[#F3F7F4]/90 leading-relaxed">
                <span className="font-semibold text-[#10B981]">Hallazgo que la justifica: </span>
                {st.findingJustification}
              </p>
              <p className="text-[12px] text-[#A1B2AA] leading-relaxed">
                <span className="font-semibold text-[#F3F7F4]">Objetivo: </span>
                {st.businessObjective}
              </p>
              <div className="pt-2 border-t border-[#2B3B35] grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#A1B2AA]">
                <div>
                  <span className="text-[#F3F7F4] font-medium">KPI:</span> {st.kpi}
                </div>
                <div>
                  <span className="text-[#F3F7F4] font-medium">Horizonte:</span> {st.horizon}
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[#F3F7F4] font-medium">Responsable sugerido:</span> {st.owner}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Final Executive Recommendation */}
      <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-4">
        <h3 className="text-[16px] font-bold text-[#F3F7F4]">
          Recomendación Estratégica Final
        </h3>
        <p className="text-[13px] text-[#F3F7F4]/90 leading-relaxed">
          {executiveSummary.expectedBusinessBenefit}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <h4 className="text-[13px] font-semibold text-[#10B981]">
              Indicadores clave de seguimiento
            </h4>
            <ul className="space-y-1.5 text-[12px] text-[#A1B2AA]">
              {executiveSummary.trackingIndicators.map((kpi, i) => (
                <li key={i}>• {kpi}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="text-[13px] font-semibold text-[#2DD4BF]">
              Hoja de ruta de implementación
            </h4>
            <ul className="space-y-1.5 text-[12px] text-[#A1B2AA]">
              {executiveSummary.implementationRoadmap.map((step, i) => (
                <li key={i}>• {step}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MatrixModuleProps {
  strategies: StrategyItem[];
  onUpdateStrategyScore: (id: string, impactScore: number, effortScore: number) => void;
  onNavigate: (sec: AppSectionId) => void;
}

export const ImpactEffortMatrixModule: React.FC<MatrixModuleProps> = ({
  strategies,
  onUpdateStrategyScore,
  onNavigate,
}) => {
  const [selectedId, setSelectedId] = useState<string>(strategies[0]?.id ?? '');
  const selected =
    strategies.find((s) => s.id === selectedId) ?? strategies[0];

  return (
    <div className="space-y-6">
      <div className="bg-[#18221F] border border-[#2DD4BF]/35 rounded-lg px-4 py-3 text-[12px] text-[#A1B2AA] flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#2DD4BF] shrink-0 mt-0.5" />
        <span>
          <strong className="text-[#F3F7F4]">Transparencia metodológica:</strong> Los puntajes de impacto y esfuerzo constituyen <strong className="text-[#F3F7F4]">hipótesis de planificación gerencial</strong> basadas en criterios explícitos de alcance operativo y complejidad de implementación; no son métricas medidas directamente por el Árbol de Decisión. Puede ajustar cada hipótesis seleccionando la iniciativa.
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Interactive 4-Quadrant Matrix */}
        <div className="xl:col-span-7 bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#F3F7F4]">
                Matriz Dinámica de Impacto vs. Esfuerzo
              </h2>
              <p className="text-[12px] text-[#A1B2AA]">
                Haga clic en cualquier iniciativa numerada para consultar o ajustar su ubicación.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('export')}
              className="px-4 py-2 rounded-md bg-[#10B981] text-[#101715] text-[12px] font-semibold hover:bg-[#2DD4BF] transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>Exportar informe</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-[#101715] border border-[#2B3B35] rounded-md p-3">
            <svg viewBox="0 0 600 420" className="w-full h-auto">
              {/* Quadrant backgrounds */}
              <rect x="60" y="30" width="250" height="170" fill="rgba(16, 185, 129, 0.12)" />
              <rect x="310" y="30" width="250" height="170" fill="rgba(45, 212, 191, 0.08)" />
              <rect x="60" y="200" width="250" height="170" fill="rgba(163, 230, 53, 0.06)" />
              <rect x="310" y="200" width="250" height="170" fill="rgba(161, 178, 170, 0.04)" />

              {/* Axes & Dividers */}
              <rect x="60" y="30" width="500" height="340" fill="none" stroke="#2B3B35" strokeWidth="1.5" />
              <line x1="310" y1="30" x2="310" y2="370" stroke="#3A4F47" strokeDasharray="4 4" />
              <line x1="60" y1="200" x2="560" y2="200" stroke="#3A4F47" strokeDasharray="4 4" />

              {/* Quadrant Labels */}
              <text x="72" y="50" fill="#10B981" fontSize="11" fontWeight="700" fontFamily="Manrope, sans-serif">
                1. QUICK WINS (Alto impacto / Bajo esfuerzo)
              </text>
              <text x="322" y="50" fill="#2DD4BF" fontSize="11" fontWeight="700" fontFamily="Manrope, sans-serif">
                2. INICIATIVAS ESTRATÉGICAS (Alto / Alto)
              </text>
              <text x="72" y="356" fill="#A3E635" fontSize="11" fontWeight="700" fontFamily="Manrope, sans-serif">
                3. MEJORAS COMPLEMENTARIAS (Bajo / Bajo)
              </text>
              <text x="322" y="356" fill="#A1B2AA" fontSize="11" fontWeight="700" fontFamily="Manrope, sans-serif">
                4. BAJA PRIORIDAD (Bajo / Alto)
              </text>

              {/* Axis Titles */}
              <text x="310" y="398" textAnchor="middle" fill="#A1B2AA" fontSize="11" fontFamily="Manrope, sans-serif">
                Esfuerzo requerido (1 = Mínimo → 10 = Máximo)
              </text>
              <text
                x="22"
                y="200"
                textAnchor="middle"
                transform="rotate(-90 22 200)"
                fill="#A1B2AA"
                fontSize="11"
                fontFamily="Manrope, sans-serif"
              >
                Impacto esperado (1 → 10)
              </text>

              {/* Strategy Points */}
              {strategies.map((st, idx) => {
                const cx = 60 + ((st.effortScore - 1) / 9) * 500;
                const cy = 370 - ((st.impactScore - 1) / 9) * 340;
                const isSel = st.id === selected?.id;
                const fill =
                  st.quadrant === 'quick_wins'
                    ? '#10B981'
                    : st.quadrant === 'strategic_initiatives'
                    ? '#2DD4BF'
                    : st.quadrant === 'complementary'
                    ? '#A3E635'
                    : '#A1B2AA';
                return (
                  <g
                    key={st.id}
                    onClick={() => setSelectedId(st.id)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSel ? 15 : 12}
                      fill={fill}
                      stroke={isSel ? '#F3F7F4' : '#101715'}
                      strokeWidth={isSel ? 2.5 : 1.5}
                    />
                    <text
                      x={cx}
                      y={cy + 4}
                      textAnchor="middle"
                      fill="#101715"
                      fontSize="11"
                      fontWeight="700"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {idx + 1}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
            {strategies.map((st, idx) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedId(st.id)}
                className={`text-left px-3 py-2 rounded border transition-colors flex items-center justify-between gap-2 ${
                  st.id === selected?.id
                    ? 'bg-[#18221F] border-[#10B981] text-[#F3F7F4]'
                    : 'bg-[#18221F]/60 border-[#2B3B35] text-[#A1B2AA] hover:text-[#F3F7F4]'
                }`}
              >
                <span className="truncate">
                  <strong className="font-mono text-[#10B981]">{idx + 1}.</strong> {st.name}
                </span>
                <span className="font-mono text-[11px] shrink-0">
                  I:{st.impactScore} / E:{st.effortScore}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Initiative Detail & Hypothesis Editor */}
        {selected && (
          <div className="xl:col-span-5 bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-4">
            <div className="border-b border-[#2B3B35] pb-3">
              <div className="text-[12px] font-semibold text-[#2DD4BF]">
                {selected.line} · {QUADRANT_LABELS[selected.quadrant]}
              </div>
              <h3 className="text-[16px] font-bold text-[#F3F7F4] mt-1">
                {selected.name}
              </h3>
            </div>

            <div className="space-y-3 bg-[#18221F] border border-[#2B3B35] rounded-md p-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[12px]">
                  <label htmlFor="hyp-impact" className="text-[#A1B2AA]">
                    Hipótesis de Impacto esperado
                  </label>
                  <span className="font-mono font-bold text-[#10B981]">
                    {selected.impactScore.toFixed(1)} / 10 ({selected.impactLevel})
                  </span>
                </div>
                <input
                  id="hyp-impact"
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={selected.impactScore}
                  onChange={(e) =>
                    onUpdateStrategyScore(
                      selected.id,
                      Number(e.target.value),
                      selected.effortScore
                    )
                  }
                  className="w-full accent-[#10B981]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[12px]">
                  <label htmlFor="hyp-effort" className="text-[#A1B2AA]">
                    Hipótesis de Esfuerzo requerido
                  </label>
                  <span className="font-mono font-bold text-[#2DD4BF]">
                    {selected.effortScore.toFixed(1)} / 10 ({selected.effortLevel})
                  </span>
                </div>
                <input
                  id="hyp-effort"
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={selected.effortScore}
                  onChange={(e) =>
                    onUpdateStrategyScore(
                      selected.id,
                      selected.impactScore,
                      Number(e.target.value)
                    )
                  }
                  className="w-full accent-[#2DD4BF]"
                />
              </div>
            </div>

            <div className="space-y-2.5 text-[12px]">
              <div>
                <span className="font-semibold text-[#10B981]">Hallazgo que la respalda: </span>
                <span className="text-[#F3F7F4]/90">{selected.findingJustification}</span>
              </div>
              <div>
                <span className="font-semibold text-[#2DD4BF]">Justificación de ubicación: </span>
                <span className="text-[#F3F7F4]/90">{selected.matrixRationale}</span>
              </div>
              <div>
                <span className="font-semibold text-[#F3F7F4]">Objetivo empresarial: </span>
                <span className="text-[#A1B2AA]">{selected.businessObjective}</span>
              </div>
              <div>
                <span className="font-semibold text-[#F3F7F4]">Beneficio esperado: </span>
                <span className="text-[#A1B2AA]">{selected.expectedBenefit}</span>
              </div>
              <div className="pt-2 border-t border-[#2B3B35] grid grid-cols-1 gap-1.5 text-[#A1B2AA]">
                <div>
                  <strong className="text-[#F3F7F4]">Indicador KPI:</strong> {selected.kpi}
                </div>
                <div>
                  <strong className="text-[#F3F7F4]">Horizonte:</strong> {selected.horizon}
                </div>
                <div>
                  <strong className="text-[#F3F7F4]">Responsable sugerido:</strong> {selected.owner}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface ExportModuleProps {
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
}

export const ExportReportModule: React.FC<ExportModuleProps> = ({
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
}) => {
  const baseName = dataset.sector.toLowerCase().replace(/\s+/g, '_');

  const handleExportPDF = () => {
    exportExecutivePDF({
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
    });
  };

  return (
    <div className="space-y-6">
      {/* Executive PDF Banner */}
      <div className="bg-[#202C27] border border-[#10B981]/40 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="text-[12px] font-semibold text-[#10B981]">
            Documento Integral de Dirección
          </div>
          <h2 className="text-xl font-bold text-[#F3F7F4]">
            Informe Ejecutivo Completo en PDF (22 Secciones)
          </h2>
          <p className="text-[13px] text-[#A1B2AA] leading-relaxed">
            Genera un reporte corporativo listo para comité directivo con portada, contexto del sector, calidad de datos, primeras 5 filas, clasificación de variables, estadísticos descriptivos, división 70/30, diagrama del Árbol de Decisión, comparativa de poda, matriz de confusión, métricas, importancia de variables, diagnóstico ejecutivo, estrategias y matriz Impacto vs. Esfuerzo.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportPDF}
          className="px-6 py-3 rounded-md bg-[#10B981] text-[#101715] font-bold text-[14px] hover:bg-[#2DD4BF] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <FileText className="w-4 h-4" />
          <span>Descargar Informe PDF</span>
        </button>
      </div>

      {/* Granular Data & Visual Exports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[#F3F7F4]">
            <FileSpreadsheet className="w-4 h-4 text-[#10B981]" />
            <span>Base de Datos Procesada</span>
          </div>
          <p className="text-[12px] text-[#A1B2AA]">
            Incluye los {prepared.rows.length} registros depurados, imputados y estandarizados listos para reutilización.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => exportPreparedDataExcel(prepared, baseName)}
              className="flex-1 py-2 rounded bg-[#18221F] border border-[#2B3B35] hover:border-[#10B981] text-[12px] font-medium text-[#F3F7F4] flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => exportPreparedDataCSV(prepared, baseName)}
              className="flex-1 py-2 rounded bg-[#18221F] border border-[#2B3B35] hover:border-[#10B981] text-[12px] font-medium text-[#F3F7F4] flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV (.csv)</span>
            </button>
          </div>
        </div>

        <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[#F3F7F4]">
            <FileSpreadsheet className="w-4 h-4 text-[#2DD4BF]" />
            <span>Predicciones en Prueba</span>
          </div>
          <p className="text-[12px] text-[#A1B2AA]">
            Detalle fila por fila de los {model.testCount} casos de prueba con valor real, predicción, confianza y acierto.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => exportPredictionsExcel(model, baseName)}
              className="flex-1 py-2 rounded bg-[#18221F] border border-[#2B3B35] hover:border-[#2DD4BF] text-[12px] font-medium text-[#F3F7F4] flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => exportPredictionsCSV(model, baseName)}
              className="flex-1 py-2 rounded bg-[#18221F] border border-[#2B3B35] hover:border-[#2DD4BF] text-[12px] font-medium text-[#F3F7F4] flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV (.csv)</span>
            </button>
          </div>
        </div>

        <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[#F3F7F4]">
            <FileSpreadsheet className="w-4 h-4 text-[#A3E635]" />
            <span>Resultados de Evaluación</span>
          </div>
          <p className="text-[12px] text-[#A1B2AA]">
            Libro Excel multipestaña con métricas globales, desempeño por clase, importancia de variables y comparativa de poda.
          </p>
          <button
            type="button"
            onClick={() => exportEvaluationExcel(model, pruningRows, baseName)}
            className="w-full py-2 rounded bg-[#18221F] border border-[#2B3B35] hover:border-[#A3E635] text-[12px] font-medium text-[#F3F7F4] flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Evaluación (.xlsx)</span>
          </button>
        </div>

        <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-5 space-y-4 md:col-span-2 lg:col-span-3">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[#F3F7F4]">
            <ImageIcon className="w-4 h-4 text-[#10B981]" />
            <span>Gráficos y Diagramas en Alta Resolución (PNG)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() =>
                exportCanvasPNG(
                  renderDecisionTreeCanvas(model.root),
                  `${baseName}_arbol_decision.png`
                )
              }
              className="py-2.5 px-3 rounded bg-[#18221F] border border-[#2B3B35] hover:border-[#10B981] text-[12px] font-medium text-[#F3F7F4] flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Árbol de Decisión (PNG)</span>
            </button>
            <button
              type="button"
              onClick={() =>
                exportCanvasPNG(
                  renderConfusionMatrixCanvas(model),
                  `${baseName}_matriz_confusion.png`
                )
              }
              className="py-2.5 px-3 rounded bg-[#18221F] border border-[#2B3B35] hover:border-[#2DD4BF] text-[12px] font-medium text-[#F3F7F4] flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5 text-[#2DD4BF]" />
              <span>Matriz de Confusión (PNG)</span>
            </button>
            <button
              type="button"
              onClick={() =>
                exportCanvasPNG(
                  renderFeatureImportanceCanvas(model),
                  `${baseName}_importancia_variables.png`
                )
              }
              className="py-2.5 px-3 rounded bg-[#18221F] border border-[#2B3B35] hover:border-[#A3E635] text-[12px] font-medium text-[#F3F7F4] flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5 text-[#A3E635]" />
              <span>Importancia Variables (PNG)</span>
            </button>
            <button
              type="button"
              onClick={() =>
                exportCanvasPNG(
                  renderImpactEffortCanvas(strategies),
                  `${baseName}_matriz_impacto_esfuerzo.png`
                )
              }
              className="py-2.5 px-3 rounded bg-[#18221F] border border-[#2B3B35] hover:border-[#10B981] text-[12px] font-medium text-[#F3F7F4] flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Matriz Impacto vs. Esfuerzo (PNG)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
