import React from 'react';
import {
  ArrowRight,
  Database,
  FileSpreadsheet,
  GitBranch,
  Lightbulb,
  Target,
} from 'lucide-react';
import {
  AppSectionId,
  BusinessDiagnostic,
  Dataset,
  ExecutiveSummary,
  ObjectiveConfig,
  TreeModelResult,
} from '../types/analytics';

interface DashboardHomeProps {
  dataset: Dataset | null;
  objective: ObjectiveConfig | null;
  model: TreeModelResult | null;
  diagnostic: BusinessDiagnostic | null;
  executiveSummary: ExecutiveSummary | null;
  onNavigate: (section: AppSectionId) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  dataset,
  objective,
  model,
  diagnostic,
  executiveSummary,
  onNavigate,
}) => {
  if (!dataset) {
    return (
      <div className="space-y-6">
        <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-8">
          <h2 className="text-2xl font-bold text-[#F3F7F4] mb-2">
            Bienvenido a Decision Tree Intelligence
          </h2>
          <p className="text-[15px] text-[#A1B2AA] max-w-2xl mb-6">
            Plataforma de analítica predictiva para transformar datos empresariales en reglas
            claras, perfiles de comportamiento y estrategias accionables sin requerir
            conocimientos técnicos de estadística o programación.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('upload')}
              className="px-5 py-2.5 rounded-md bg-[#10B981] text-[#101715] font-semibold text-sm hover:bg-[#2DD4BF] transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Cargar base de datos</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('synthetic')}
              className="px-5 py-2.5 rounded-md bg-[#18221F] border border-[#2B3B35] text-[#F3F7F4] font-medium text-sm hover:border-[#10B981] transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Database className="w-4 h-4 text-[#2DD4BF]" />
              <span>Generar datos sintéticos por sector</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const targetCount =
    model?.evaluation.classes.length ??
    dataset.variables.find((v) => v.name === objective?.targetColumn)?.uniqueCount ??
    0;

  const modelStatusLabel = !model
    ? 'Pendiente de entrenamiento'
    : model.evaluation.overfittingStatus === 'equilibrado'
    ? 'Equilibrado (listo para negocio)'
    : model.evaluation.overfittingStatus === 'leve_sobreajuste'
    ? 'Leve sobreajuste (revisar poda)'
    : model.evaluation.overfittingStatus === 'sobreajuste_severo'
    ? 'Sobreajuste detectado (podar)'
    : 'Capacidad limitada (revisar variables)';

  const kpis = [
    {
      label: 'Registros analizados',
      value: dataset.quality.rowCount.toLocaleString('es-ES'),
      sub: model
        ? `${model.trainCount} entreno · ${model.testCount} prueba`
        : `${dataset.quality.duplicateRows} duplicados detectados`,
    },
    {
      label: 'Variables disponibles',
      value: String(dataset.quality.columnCount),
      sub: `${objective?.predictorColumns.length ?? 0} predictoras activas`,
    },
    {
      label: 'Variable objetivo',
      value: objective?.targetColumn ?? 'Sin definir',
      sub: objective?.problemType === 'binary' ? 'Clasificación binaria' : 'Clasificación multiclase',
      isText: true,
    },
    {
      label: 'Número de categorías',
      value: String(targetCount),
      sub: model ? model.evaluation.classes.join(' / ') : 'Clases objetivo',
    },
    {
      label: 'Accuracy (Prueba)',
      value: model ? `${(model.evaluation.testAccuracy * 100).toFixed(1)}%` : '—',
      sub: model
        ? `Entrenamiento: ${(model.evaluation.trainAccuracy * 100).toFixed(1)}%`
        : 'Entrene el modelo',
      accent: 'text-[#10B981]',
    },
    {
      label: 'F1-score ponderado',
      value: model ? `${(model.evaluation.weightedF1 * 100).toFixed(1)}%` : '—',
      sub: model ? `Macro F1: ${(model.evaluation.macroF1 * 100).toFixed(1)}%` : 'Equilibrio precisión/cobertura',
      accent: 'text-[#2DD4BF]',
    },
    {
      label: 'Profundidad del árbol',
      value: model ? `${model.summary.depth} niveles` : '—',
      sub: model ? `${model.summary.nodeCount} nodos · ${model.summary.leafCount} hojas` : 'Complejidad estructural',
    },
    {
      label: 'Estado del modelo',
      value: modelStatusLabel,
      sub: model?.isOptimized ? 'Optimizado con validación cruzada' : 'Configuración actual',
      isText: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Context Banner */}
      <div className="bg-[#18221F] border border-[#2B3B35] rounded-lg px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[12px] text-[#A1B2AA]">
            {dataset.sector} · {dataset.sourceType === 'synthetic' ? 'Datos sintéticos de simulación (no reales)' : `Archivo cargado: ${dataset.fileName}`}
          </div>
          <h2 className="text-lg font-bold text-[#F3F7F4]">{dataset.businessContext}</h2>
          {objective?.businessGoal && (
            <p className="text-[13px] text-[#A1B2AA]">{objective.businessGoal}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('tree')}
            className="px-4 py-2 rounded-md bg-[#202C27] border border-[#2B3B35] hover:border-[#10B981] text-[13px] font-medium text-[#F3F7F4] transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <GitBranch className="w-4 h-4 text-[#10B981]" />
            <span>Explorar árbol</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('strategies')}
            className="px-4 py-2 rounded-md bg-[#10B981]/15 border border-[#10B981]/40 hover:bg-[#10B981]/25 text-[13px] font-semibold text-[#10B981] transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Lightbulb className="w-4 h-4" />
            <span>Ver estrategias</span>
          </button>
        </div>
      </div>

      {/* 8 Executive KPI Cards */}
      <section aria-label="Indicadores ejecutivos del modelo">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-5 flex flex-col justify-between gap-2"
            >
              <span className="text-[12px] font-medium text-[#A1B2AA]">{kpi.label}</span>
              <div
                className={`${
                  kpi.isText ? 'text-[16px] font-semibold' : 'text-[24px] font-bold font-mono tabular-nums'
                } ${kpi.accent ?? 'text-[#F3F7F4]'} leading-tight truncate`}
                title={kpi.value}
              >
                {kpi.value}
              </div>
              <span className="text-[12px] text-[#A1B2AA]/85 truncate" title={kpi.sub}>
                {kpi.sub}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Main Executive Findings & Top Opportunities */}
      {model && diagnostic && executiveSummary && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Diagnostic & Top Drivers */}
          <div className="lg:col-span-7 bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#2B3B35] pb-3">
              <h3 className="text-[16px] font-semibold text-[#F3F7F4]">
                Resumen de Hallazgos Ejecutivos
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('interpretation')}
                className="text-[13px] font-medium text-[#2DD4BF] hover:underline flex items-center gap-1 whitespace-nowrap"
              >
                <span>Diagnóstico completo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[14px] text-[#F3F7F4]/90 leading-relaxed">
              {diagnostic.whatIsHappening}
            </p>

            <div className="space-y-2.5">
              <h4 className="text-[13px] font-semibold text-[#10B981]">
                Variables de mayor relevancia predictiva
              </h4>
              <div className="space-y-2.5">
                {model.featureImportances.slice(0, 4).map((feat, idx) => (
                  <div key={feat.feature} className="space-y-1">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-medium text-[#F3F7F4]">
                        {idx + 1}. {feat.feature}
                      </span>
                      <span className="font-mono tabular-nums text-[#A3E635]">
                        {feat.importancePct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-[#101715] rounded overflow-hidden">
                      <div
                        className="h-full bg-[#10B981] rounded"
                        style={{ width: `${Math.max(2, feat.importancePct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-[#A1B2AA] pt-1">
                Nota: La importancia en el árbol mide capacidad predictiva sobre la muestra analizada, no causalidad directa.
              </p>
            </div>

            <div className="pt-2 border-t border-[#2B3B35] space-y-2">
              <h4 className="text-[13px] font-semibold text-[#2DD4BF]">
                Principales patrones detectados
              </h4>
              <ul className="space-y-1.5 text-[13px] text-[#A1B2AA]">
                {diagnostic.patternsIdentified.slice(0, 3).map((pat, i) => (
                  <li key={i} className="leading-relaxed">
                    • {pat}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: Top Opportunities & Priority Strategies */}
          <div className="lg:col-span-5 bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#2B3B35] pb-3">
                <h3 className="text-[16px] font-semibold text-[#F3F7F4]">
                  Oportunidades y Acciones Prioritarias
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigate('matrix')}
                  className="text-[13px] font-medium text-[#2DD4BF] hover:underline flex items-center gap-1 whitespace-nowrap"
                >
                  <span>Matriz 2×2</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {executiveSummary.mainOpportunities.map((opp, idx) => (
                  <p key={idx} className="text-[13px] text-[#F3F7F4]/90 leading-relaxed">
                    • {opp}
                  </p>
                ))}
              </div>

              <div className="pt-3 border-t border-[#2B3B35] space-y-3">
                <h4 className="text-[13px] font-semibold text-[#A3E635]">
                  Top 3 estrategias recomendadas
                </h4>
                <div className="divide-y divide-[#2B3B35]">
                  {executiveSummary.topThreeStrategies.map((st, idx) => (
                    <div key={st.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2 text-[12px] text-[#A1B2AA]">
                        <span>
                          0{idx + 1}. {st.line}
                        </span>
                        <span className="font-mono tabular-nums text-[#10B981]">
                          Impacto {st.impactScore}/10 · Esfuerzo {st.effortScore}/10
                        </span>
                      </div>
                      <div className="text-[13px] font-semibold text-[#F3F7F4] mt-0.5">
                        {st.name}
                      </div>
                      <div className="text-[12px] text-[#A1B2AA] mt-0.5">
                        KPI: {st.kpi}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#2B3B35] flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNavigate('objective')}
                className="px-3.5 py-2 rounded-md bg-[#18221F] border border-[#2B3B35] hover:border-[#2DD4BF] text-[12px] font-medium text-[#F3F7F4] transition-colors flex items-center gap-1.5"
              >
                <Target className="w-3.5 h-3.5 text-[#2DD4BF]" />
                <span>Cambiar objetivo</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('pruning')}
                className="px-3.5 py-2 rounded-md bg-[#18221F] border border-[#2B3B35] hover:border-[#10B981] text-[12px] font-medium text-[#F3F7F4] transition-colors"
              >
                Ajustar poda
              </button>
              <button
                type="button"
                onClick={() => onNavigate('export')}
                className="px-3.5 py-2 rounded-md bg-[#18221F] border border-[#2B3B35] hover:border-[#A3E635] text-[12px] font-medium text-[#F3F7F4] transition-colors"
              >
                Exportar resultados
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
