import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
  Target,
  Wand2,
} from 'lucide-react';
import {
  AppSectionId,
  Dataset,
  ObjectiveConfig,
  ObjectiveRecommendation,
  PrepAction,
  PreparedDataset,
} from '../types/analytics';
import { recommendObjective } from '../engine/businessEngine';

interface ObjectiveModuleProps {
  dataset: Dataset;
  objective: ObjectiveConfig;
  onSaveObjective: (cfg: ObjectiveConfig, nextSection?: AppSectionId) => void;
}

const EXAMPLE_GOALS = [
  'Identificar qué clientes tienen mayor probabilidad de abandonar el servicio en los próximos meses.',
  'Conocer qué clientes presentan mayor propensión a comprar o aceptar una oferta comercial.',
  'Predecir qué casos tienen mayor riesgo de incumplimiento o incidencia operativa.',
  'Identificar qué estudiantes presentan mayor riesgo de deserción académica.',
];

export const ObjectiveConfigModule: React.FC<ObjectiveModuleProps> = ({
  dataset,
  objective,
  onSaveObjective,
}) => {
  const [businessGoal, setBusinessGoal] = useState(objective.businessGoal);
  const [targetColumn, setTargetColumn] = useState(objective.targetColumn);
  const [predictors, setPredictors] = useState<string[]>(objective.predictorColumns);
  const [recommendation, setRecommendation] = useState<ObjectiveRecommendation | null>(
    objective.recommendation ?? null
  );

  const selectedTargetMeta = dataset.variables.find((v) => v.name === targetColumn);
  const isContinuousTarget =
    selectedTargetMeta?.type === 'numeric_continuous' ||
    (selectedTargetMeta?.type.startsWith('numeric_') &&
      selectedTargetMeta.uniqueCount > 12);

  const targetUniqueValues = Array.from(
    new Set(
      dataset.rows
        .map((r) => r[targetColumn])
        .filter((v) => v !== null)
        .map((v) => String(v))
    )
  ).sort();

  const inferredProblemType =
    targetUniqueValues.length <= 2 ? 'binary' : 'multiclass';

  const handleAnalyzeGoal = () => {
    const rec = recommendObjective(dataset, businessGoal);
    setRecommendation(rec);
  };

  const handleAcceptRecommendation = () => {
    if (!recommendation?.suggestedTarget) return;
    setTargetColumn(recommendation.suggestedTarget);
    setPredictors(recommendation.suggestedPredictors);
  };

  const togglePredictor = (col: string) => {
    if (col === targetColumn) return;
    setPredictors((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleSaveAndContinue = () => {
    if (isContinuousTarget || predictors.length === 0) return;
    onSaveObjective(
      {
        businessGoal,
        targetColumn,
        predictorColumns: predictors,
        problemType: inferredProblemType,
        positiveClass: targetUniqueValues[0],
        recommendation: recommendation ?? undefined,
      },
      'preparation'
    );
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Business Goal Prompt */}
      <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#F3F7F4]">
            Definición del Objetivo Empresarial del Análisis
          </h2>
          <p className="text-[13px] text-[#A1B2AA] mt-1">
            Describa brevemente qué decisión necesita apoyar o qué comportamiento desea predecir. El sistema analizará sus variables y le sugerirá la configuración óptima.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="business-goal-input" className="block text-[12px] font-medium text-[#A1B2AA]">
            Objetivo del negocio
          </label>
          <textarea
            id="business-goal-input"
            rows={2}
            value={businessGoal}
            onChange={(e) => setBusinessGoal(e.target.value)}
            placeholder="Ej. Quiero identificar qué clientes podrían abandonar mi empresa para diseñar campañas de retención..."
            className="w-full bg-[#18221F] border border-[#2B3B35] rounded-md px-3.5 py-2.5 text-[13px] text-[#F3F7F4] focus:outline-none focus:border-[#10B981]"
          />
          <div className="flex flex-wrap gap-2 pt-1">
            {EXAMPLE_GOALS.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setBusinessGoal(ex)}
                className="text-[11px] text-[#A1B2AA] hover:text-[#10B981] bg-[#18221F] border border-[#2B3B35] rounded px-2.5 py-1 text-left transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAnalyzeGoal}
            className="px-4 py-2 rounded-md bg-[#2DD4BF]/15 border border-[#2DD4BF]/50 text-[#2DD4BF] text-[13px] font-semibold hover:bg-[#2DD4BF]/25 transition-colors flex items-center gap-2"
          >
            <Wand2 className="w-4 h-4" />
            <span>Analizar objetivo y sugerir variable</span>
          </button>
        </div>

        {recommendation && (
          <div className="bg-[#18221F] border border-[#10B981]/40 rounded-md p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#10B981]">
                <Target className="w-4 h-4" />
                <span>
                  Recomendación del sistema:{' '}
                  {recommendation.suggestedTarget ?? 'Sin candidata categórica clara'}
                </span>
              </div>
              {recommendation.suggestedTarget && (
                <button
                  type="button"
                  onClick={handleAcceptRecommendation}
                  className="px-3.5 py-1.5 rounded bg-[#10B981] text-[#101715] text-[12px] font-semibold hover:bg-[#2DD4BF] transition-colors whitespace-nowrap"
                >
                  Aceptar recomendación
                </button>
              )}
            </div>
            <p className="text-[13px] text-[#F3F7F4]/90">{recommendation.reason}</p>
            {recommendation.warning && (
              <p className="text-[12px] text-[#F59E0B]">{recommendation.warning}</p>
            )}
            <div className="text-[12px] text-[#A1B2AA]">
              Predictoras sugeridas ({recommendation.suggestedPredictors.length}):{' '}
              <span className="text-[#F3F7F4]">
                {recommendation.suggestedPredictors.join(', ')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Target Y & Predictors X Manual Control */}
      <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="target-select" className="block text-[13px] font-semibold text-[#F3F7F4]">
              Variable objetivo (Y — qué predecir)
            </label>
            <select
              id="target-select"
              value={targetColumn}
              onChange={(e) => {
                const nextY = e.target.value;
                setTargetColumn(nextY);
                setPredictors((prev) => prev.filter((p) => p !== nextY));
              }}
              className="w-full bg-[#18221F] border border-[#2B3B35] rounded-md px-3 py-2 text-[13px] text-[#F3F7F4] focus:outline-none focus:border-[#10B981]"
            >
              {dataset.variables.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.uniqueCount} valores · {v.type.startsWith('categorical_') ? 'Categórica' : 'Numérica'})
                </option>
              ))}
            </select>

            <div className="text-[12px] text-[#A1B2AA] pt-1">
              Tipo de problema detectado:{' '}
              <span className="font-semibold text-[#2DD4BF]">
                {inferredProblemType === 'binary'
                  ? 'Clasificación binaria (2 categorías)'
                  : `Clasificación multiclase (${targetUniqueValues.length} categorías)`}
              </span>
            </div>

            {targetUniqueValues.length <= 10 && (
              <div className="text-[12px] text-[#A1B2AA]">
                Categorías:{' '}
                <span className="text-[#F3F7F4]">{targetUniqueValues.join(' · ')}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-[13px] font-semibold text-[#F3F7F4]">
              Variables independientes / predictoras (X)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
              {dataset.variables
                .filter((v) => v.name !== targetColumn)
                .map((v) => {
                  const checked = predictors.includes(v.name);
                  return (
                    <label
                      key={v.name}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded border text-[12px] cursor-pointer ${
                        checked
                          ? 'bg-[#10B981]/12 border-[#10B981]/50 text-[#F3F7F4]'
                          : 'bg-[#18221F] border-[#2B3B35] text-[#A1B2AA]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePredictor(v.name)}
                          className="accent-[#10B981]"
                        />
                        <span className="truncate">{v.name}</span>
                      </div>
                      <span className="text-[10px] text-[#A1B2AA] shrink-0">
                        {v.role === 'identifier' ? 'ID' : v.type.startsWith('numeric_') ? 'Num' : 'Cat'}
                      </span>
                    </label>
                  );
                })}
            </div>
          </div>
        </div>

        {isContinuousTarget && (
          <div className="bg-[#EF4444]/10 border border-[#EF4444]/40 rounded-md p-4 text-[13px] text-[#FCA5A5] flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[#F3F7F4]">
                Variable numérica continua seleccionada como objetivo
              </div>
              <p className="mt-1">
                La variable "{targetColumn}" es numérica continua ({selectedTargetMeta?.uniqueCount} valores distintos). Predecir un monto o magnitud continua requiere un Árbol de Decisión de Regresión, que es un enfoque distinto. Esta plataforma está orientada a clasificación (binaria o multiclase). Seleccione una variable categórica o reclasifique la variable si representa categorías.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[#2B3B35]">
          <div className="text-[12px] text-[#A1B2AA]">
            Predictoras activas:{' '}
            <span className="font-mono font-semibold text-[#F3F7F4]">{predictors.length}</span>
          </div>
          <button
            type="button"
            disabled={isContinuousTarget || predictors.length === 0}
            onClick={handleSaveAndContinue}
            className="px-5 py-2.5 rounded-md bg-[#10B981] text-[#101715] text-[13px] font-semibold hover:bg-[#2DD4BF] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <span>Guardar objetivo y preparar datos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface PreparationModuleProps {
  actions: PrepAction[];
  prepared: PreparedDataset | null;
  onToggleAction: (id: string) => void;
  onExecutePrep: () => void;
  onNavigate: (sec: AppSectionId) => void;
}

export const DataPreparationModule: React.FC<PreparationModuleProps> = ({
  actions,
  prepared,
  onToggleAction,
  onExecutePrep,
  onNavigate,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2B3B35] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#F3F7F4]">
              Preparación Controlada de Datos y Prevención de Fugas
            </h2>
            <p className="text-[13px] text-[#A1B2AA] mt-1">
              Revise y apruebe cada transformación propuesta antes de entrenar el Árbol de Decisión. Ninguna columna o fila es eliminada sin su visibilidad y confirmación.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onExecutePrep();
              onNavigate('tree');
            }}
            className="px-5 py-2.5 rounded-md bg-[#10B981] text-[#101715] text-[13px] font-semibold hover:bg-[#2DD4BF] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <span>Aprobar preparación y construir árbol</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {actions.length === 0 ? (
          <div className="bg-[#18221F] border border-[#2B3B35] rounded-md p-4 text-[13px] text-[#10B981] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>La base de datos está limpia y lista para entrenamiento directo sin transformaciones adicionales.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((act) => (
              <div
                key={act.id}
                className={`bg-[#18221F] border rounded-md p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                  act.severity === 'critical'
                    ? 'border-[#EF4444]/50'
                    : act.severity === 'warning'
                    ? 'border-[#F59E0B]/40'
                    : 'border-[#2B3B35]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {act.severity === 'critical' && (
                      <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0" />
                    )}
                    {act.severity === 'warning' && (
                      <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />
                    )}
                    <span className="text-[14px] font-semibold text-[#F3F7F4]">
                      {act.title}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#A1B2AA] leading-relaxed">
                    <span className="text-[#F3F7F4]/80 font-medium">Por qué:</span> {act.reason}
                  </p>
                  <p className="text-[12px] text-[#2DD4BF]">{act.impactSummary}</p>
                </div>

                <label className="flex items-center gap-2 text-[12px] font-medium text-[#F3F7F4] shrink-0 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={act.enabled}
                    onChange={() => onToggleAction(act.id)}
                    className="w-4 h-4 accent-[#10B981]"
                  />
                  <span>{act.enabled ? 'Aprobada' : 'Omitida'}</span>
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {prepared && (
        <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-4">
          <h3 className="text-[15px] font-semibold text-[#F3F7F4]">
            Resumen del Conjunto Preparado Activo
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#18221F] border border-[#2B3B35] rounded-md p-3.5">
              <div className="text-[12px] text-[#A1B2AA]">Registros válidos</div>
              <div className="text-[20px] font-bold font-mono tabular-nums text-[#10B981]">
                {prepared.rows.length}
              </div>
            </div>
            <div className="bg-[#18221F] border border-[#2B3B35] rounded-md p-3.5">
              <div className="text-[12px] text-[#A1B2AA]">Predictoras activas</div>
              <div className="text-[20px] font-bold font-mono tabular-nums text-[#F3F7F4]">
                {prepared.predictorColumns.length}
              </div>
            </div>
            <div className="bg-[#18221F] border border-[#2B3B35] rounded-md p-3.5">
              <div className="text-[12px] text-[#A1B2AA]">Columnas imputadas</div>
              <div className="text-[20px] font-bold font-mono tabular-nums text-[#2DD4BF]">
                {prepared.imputedColumns.length}
              </div>
            </div>
            <div className="bg-[#18221F] border border-[#2B3B35] rounded-md p-3.5">
              <div className="text-[12px] text-[#A1B2AA]">Duplicados retirados</div>
              <div className="text-[20px] font-bold font-mono tabular-nums text-[#A3E635]">
                {prepared.removedDuplicates}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
