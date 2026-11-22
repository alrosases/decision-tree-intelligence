import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  AppSectionId,
  BusinessDiagnostic,
  TreeModelResult,
} from '../types/analytics';

interface EvaluationModuleProps {
  model: TreeModelResult;
  onNavigate: (sec: AppSectionId) => void;
}

export const ModelEvaluationModule: React.FC<EvaluationModuleProps> = ({
  model,
  onNavigate,
}) => {
  const { evaluation } = model;
  const [selectedClass, setSelectedClass] = useState<string>(
    evaluation.classes[0] ?? ''
  );
  const [selectedCell, setSelectedCell] = useState<{
    actualIdx: number;
    predIdx: number;
  } | null>(null);

  const focusMetrics =
    evaluation.classMetrics.find((m) => m.className === selectedClass) ??
    evaluation.classMetrics[0];

  const maxMatrixVal = Math.max(1, ...evaluation.confusionMatrix.flat());

  const cellPredictions = selectedCell
    ? evaluation.testPredictions.filter(
        (p) =>
          p.actual === evaluation.classes[selectedCell.actualIdx] &&
          p.predicted === evaluation.classes[selectedCell.predIdx]
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Alerts: Class Imbalance & Overfitting */}
      {evaluation.imbalanceWarning && (
        <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/40 rounded-lg p-4 flex items-start gap-3 text-[13px] text-[#FDE68A]">
          <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-[#F3F7F4]">Alerta de desbalance de clases</div>
            <p className="mt-0.5">{evaluation.imbalanceWarning}</p>
          </div>
        </div>
      )}

      <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2B3B35] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#F3F7F4]">
              Evaluación Exclusiva en Conjunto de Prueba ({model.testCount} registros)
            </h2>
            <p className="text-[13px] text-[#A1B2AA] mt-1">
              Métricas calculadas únicamente sobre el 30% de prueba no utilizado en el entrenamiento, acompañadas de su interpretación directa para la gestión empresarial.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <select
              aria-label="Categoría focalizada para interpretar métricas"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-[#18221F] border border-[#2B3B35] rounded-md px-3 py-2 text-[13px] text-[#F3F7F4]"
            >
              {evaluation.classes.map((cls) => (
                <option key={cls} value={cls}>
                  Foco: {cls}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onNavigate('interpretation')}
              className="px-4 py-2 rounded-md bg-[#10B981] text-[#101715] text-[13px] font-semibold hover:bg-[#2DD4BF] transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>Interpretar resultados</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Metrics with Mandatory Business Interpretation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#18221F] border border-[#2B3B35] rounded-md p-4 space-y-2">
            <div className="text-[12px] text-[#A1B2AA]">Accuracy global</div>
            <div className="text-[26px] font-bold font-mono tabular-nums text-[#10B981]">
              {(evaluation.testAccuracy * 100).toFixed(1)}%
            </div>
            <p className="text-[12px] text-[#F3F7F4]/85 leading-relaxed">
              El modelo clasificó correctamente el {(evaluation.testAccuracy * 100).toFixed(1)}% de los casos evaluados ({Math.round(evaluation.testAccuracy * 100)} de cada 100 registros).
            </p>
          </div>

          <div className="bg-[#18221F] border border-[#2B3B35] rounded-md p-4 space-y-2">
            <div className="text-[12px] text-[#A1B2AA]">Precision ({focusMetrics.className})</div>
            <div className="text-[26px] font-bold font-mono tabular-nums text-[#2DD4BF]">
              {(focusMetrics.precision * 100).toFixed(1)}%
            </div>
            <p className="text-[12px] text-[#F3F7F4]/85 leading-relaxed">
              De todos los casos que el modelo alertó como "{focusMetrics.className}", el {(focusMetrics.precision * 100).toFixed(1)}% pertenece realmente a esa categoría.
            </p>
          </div>

          <div className="bg-[#18221F] border border-[#2B3B35] rounded-md p-4 space-y-2">
            <div className="text-[12px] text-[#A1B2AA]">Recall / Sensibilidad ({focusMetrics.className})</div>
            <div className="text-[26px] font-bold font-mono tabular-nums text-[#A3E635]">
              {(focusMetrics.recall * 100).toFixed(1)}%
            </div>
            <p className="text-[12px] text-[#F3F7F4]/85 leading-relaxed">
              De los casos reales de "{focusMetrics.className}", el modelo detectó el {(focusMetrics.recall * 100).toFixed(1)}%. El {(100 - focusMetrics.recall * 100).toFixed(1)}% restante no fue alertado a tiempo.
            </p>
          </div>

          <div className="bg-[#18221F] border border-[#2B3B35] rounded-md p-4 space-y-2">
            <div className="text-[12px] text-[#A1B2AA]">F1-score & Especificidad</div>
            <div className="text-[26px] font-bold font-mono tabular-nums text-[#F3F7F4]">
              {(focusMetrics.f1 * 100).toFixed(1)}%
            </div>
            <p className="text-[12px] text-[#F3F7F4]/85 leading-relaxed">
              Equilibrio entre precisión de alertas y cobertura real. Especificidad de {(focusMetrics.specificity * 100).toFixed(1)}% al descartar casos negativos.
            </p>
          </div>
        </div>

        {/* TP / FP / TN / FN Explicit Row for Focus Class */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
          <div className="bg-[#18221F] border border-[#10B981]/30 rounded p-3 flex justify-between items-center">
            <span className="text-[#A1B2AA]">Verdaderos Positivos (VP)</span>
            <span className="font-mono font-bold text-[#10B981] text-[15px]">{focusMetrics.tp}</span>
          </div>
          <div className="bg-[#18221F] border border-[#F59E0B]/30 rounded p-3 flex justify-between items-center">
            <span className="text-[#A1B2AA]">Falsos Positivos (FP)</span>
            <span className="font-mono font-bold text-[#F59E0B] text-[15px]">{focusMetrics.fp}</span>
          </div>
          <div className="bg-[#18221F] border border-[#2DD4BF]/30 rounded p-3 flex justify-between items-center">
            <span className="text-[#A1B2AA]">Verdaderos Negativos (VN)</span>
            <span className="font-mono font-bold text-[#2DD4BF] text-[15px]">{focusMetrics.tn}</span>
          </div>
          <div className="bg-[#18221F] border border-[#EF4444]/30 rounded p-3 flex justify-between items-center">
            <span className="text-[#A1B2AA]">Falsos Negativos (FN)</span>
            <span className="font-mono font-bold text-[#EF4444] text-[15px]">{focusMetrics.fn}</span>
          </div>
        </div>
      </div>

      {/* Interactive Confusion Matrix + Overfitting Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-[15px] font-semibold text-[#F3F7F4]">
              Matriz de Confusión Interactiva (clic en una celda para inspeccionar casos)
            </h3>
            <p className="text-[12px] text-[#A1B2AA]">
              Filas: categoría real en prueba · Columnas: categoría predicha por el árbol.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr>
                  <th className="p-2 text-left text-[#A1B2AA]">Real \ Predicho</th>
                  {evaluation.classes.map((predCls) => (
                    <th key={predCls} className="p-2 text-center font-semibold text-[#F3F7F4]">
                      {predCls}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evaluation.classes.map((actualCls, rIdx) => (
                  <tr key={actualCls}>
                    <td className="p-2 font-semibold text-[#F3F7F4] whitespace-nowrap">
                      {actualCls}
                    </td>
                    {evaluation.classes.map((predCls, cIdx) => {
                      const val = evaluation.confusionMatrix[rIdx][cIdx];
                      const isDiag = rIdx === cIdx;
                      const intensity = val / maxMatrixVal;
                      const isSel =
                        selectedCell?.actualIdx === rIdx &&
                        selectedCell?.predIdx === cIdx;
                      return (
                        <td key={predCls} className="p-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedCell({ actualIdx: rIdx, predIdx: cIdx })}
                            style={{
                              backgroundColor: isDiag
                                ? `rgba(16, 185, 129, ${0.15 + intensity * 0.5})`
                                : `rgba(245, 158, 11, ${val > 0 ? 0.12 + intensity * 0.35 : 0.04})`,
                            }}
                            className={`w-full py-4 px-3 rounded border text-center transition-all ${
                              isSel
                                ? 'border-[#A3E635] ring-1 ring-[#A3E635]'
                                : isDiag
                                ? 'border-[#10B981]/50'
                                : 'border-[#2B3B35]'
                            }`}
                          >
                            <div className="text-[20px] font-bold font-mono tabular-nums text-[#F3F7F4]">
                              {val}
                            </div>
                            <div className="text-[10px] text-[#A1B2AA]">
                              {isDiag ? 'Acierto' : 'Confusión'}
                            </div>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedCell && (
            <div className="bg-[#18221F] border border-[#2B3B35] rounded-md p-3.5 text-[12px] space-y-1.5">
              <div className="font-semibold text-[#F3F7F4]">
                Celda seleccionada: Real "{evaluation.classes[selectedCell.actualIdx]}" → Predicho "{evaluation.classes[selectedCell.predIdx]}" ({cellPredictions.length} registros)
              </div>
              {cellPredictions.slice(0, 3).map((p) => (
                <div key={p.rowIndex} className="text-[#A1B2AA] font-mono truncate">
                  Fila #{p.rowIndex} · Confianza {p.confidence.toFixed(1)}% ·{' '}
                  {Object.entries(p.features)
                    .slice(0, 3)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(', ')}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overfitting & Generalization + Multiclass Summary */}
        <div className="lg:col-span-5 bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-5">
          <div className="space-y-2">
            <h3 className="text-[15px] font-semibold text-[#F3F7F4]">
              Generalización y Control de Sobreajuste
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#18221F] border border-[#2B3B35] rounded p-3">
                <div className="text-[11px] text-[#A1B2AA]">Accuracy Entrenamiento</div>
                <div className="text-[20px] font-bold font-mono tabular-nums text-[#F3F7F4]">
                  {(evaluation.trainAccuracy * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-[#18221F] border border-[#2B3B35] rounded p-3">
                <div className="text-[11px] text-[#A1B2AA]">Accuracy Prueba</div>
                <div className="text-[20px] font-bold font-mono tabular-nums text-[#10B981]">
                  {(evaluation.testAccuracy * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="bg-[#18221F] border border-[#2B3B35] rounded-md p-3.5 text-[13px] text-[#F3F7F4]/90 flex items-start gap-2.5">
              {evaluation.overfittingStatus === 'equilibrado' ? (
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
              )}
              <span>{evaluation.overfittingMessage}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#2B3B35]">
            <h4 className="text-[13px] font-semibold text-[#F3F7F4]">
              Promedios Globales y Desglose por Categoría
            </h4>
            <div className="text-[12px] text-[#A1B2AA] space-y-1 font-mono tabular-nums">
              <div className="flex justify-between">
                <span>Micro Average (Accuracy global):</span>
                <span className="text-[#F3F7F4]">{(evaluation.testAccuracy * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Macro Average (Precision / Recall / F1):</span>
                <span className="text-[#2DD4BF]">
                  {(evaluation.macroPrecision * 100).toFixed(1)}% / {(evaluation.macroRecall * 100).toFixed(1)}% / {(evaluation.macroF1 * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Weighted Average (Precision / Recall / F1):</span>
                <span className="text-[#10B981]">
                  {(evaluation.weightedPrecision * 100).toFixed(1)}% / {(evaluation.weightedRecall * 100).toFixed(1)}% / {(evaluation.weightedF1 * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="overflow-x-auto border border-[#2B3B35] rounded mt-2">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#18221F] border-b border-[#2B3B35] text-[#A1B2AA]">
                    <th className="px-2.5 py-2">Categoría</th>
                    <th className="px-2.5 py-2 text-right">Casos</th>
                    <th className="px-2.5 py-2 text-right">Prec.</th>
                    <th className="px-2.5 py-2 text-right">Recall</th>
                    <th className="px-2.5 py-2 text-right">F1</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2B3B35] font-mono tabular-nums">
                  {evaluation.classMetrics.map((m) => (
                    <tr key={m.className}>
                      <td className="px-2.5 py-2 font-sans font-medium text-[#F3F7F4]">{m.className}</td>
                      <td className="px-2.5 py-2 text-right">{m.support}</td>
                      <td className="px-2.5 py-2 text-right">{(m.precision * 100).toFixed(1)}%</td>
                      <td className="px-2.5 py-2 text-right">{(m.recall * 100).toFixed(1)}%</td>
                      <td className="px-2.5 py-2 text-right text-[#10B981]">{(m.f1 * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface InterpretationModuleProps {
  model: TreeModelResult;
  diagnostic: BusinessDiagnostic;
  onNavigate: (sec: AppSectionId) => void;
}

export const InterpretationModule: React.FC<InterpretationModuleProps> = ({
  model,
  diagnostic,
  onNavigate,
}) => {
  const diagnosticQuestions = [
    { q: '1. ¿Qué está ocurriendo en los datos?', a: diagnostic.whatIsHappening },
    { q: '2. ¿Qué patrones se identificaron?', a: diagnostic.patternsIdentified.join(' ') },
    { q: '3. ¿Qué variables son más relevantes?', a: diagnostic.topVariablesExplanation },
    {
      q: '4. ¿Qué perfiles o grupos se distinguen?',
      a: diagnostic.distinguishedProfiles
        .map(
          (p) =>
            `${p.title} (${p.confidencePct.toFixed(1)}% concentración, ${p.sharePct.toFixed(1)}% de la base): ${p.characteristics}.`
        )
        .join(' '),
    },
    {
      q: '5. ¿Qué características comparten las categorías?',
      a: diagnostic.categoryCharacteristics
        .map((c) => `${c.className} (${c.pct.toFixed(1)}%): ${c.summary}`)
        .join(' '),
    },
    { q: '6. ¿Qué tan confiable es el modelo?', a: diagnostic.modelReliability },
    { q: '7. ¿Qué errores está cometiendo?', a: diagnostic.modelErrors },
    {
      q: '8. ¿Qué oportunidades de negocio se identificaron?',
      a: diagnostic.businessOpportunities.join(' '),
    },
    {
      q: '9. ¿Qué decisiones podría tomar la organización?',
      a: diagnostic.recommendedDecisions.join(' '),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Feature Importance + Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#F3F7F4]">
              Importancia de Variables y Hallazgos
            </h2>
            <p className="text-[12px] text-[#A1B2AA] mt-1">
              Contribución porcentual de cada variable en la reducción de impureza del árbol.
            </p>
          </div>

          <div className="space-y-3">
            {model.featureImportances.map((f, idx) => (
              <div key={f.feature} className="space-y-1">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-[#F3F7F4]">
                    #{idx + 1} {f.feature}
                  </span>
                  <span className="font-mono tabular-nums text-[#10B981]">
                    {f.importancePct.toFixed(1)}% ({f.splitCount} cortes)
                  </span>
                </div>
                <div className="h-2.5 bg-[#101715] rounded overflow-hidden">
                  <div
                    className={`h-full rounded ${
                      idx === 0 ? 'bg-[#10B981]' : idx === 1 ? 'bg-[#2DD4BF]' : 'bg-[#A3E635]'
                    }`}
                    style={{ width: `${Math.max(1.5, f.importancePct)}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#A1B2AA]">{f.businessRole}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#18221F] border border-[#F59E0B]/40 rounded-md p-3.5 text-[12px] text-[#FDE68A]">
            <strong className="text-[#F3F7F4]">Importancia predictiva vs. causalidad:</strong> El hecho de que una variable aparezca en las primeras divisiones del árbol indica que ayuda a predecir el resultado observado, pero no demuestra automáticamente una relación causa-efecto sin validación experimental o de negocio.
          </div>
        </div>

        <div className="lg:col-span-6 bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-semibold text-[#F3F7F4]">
                Perfiles y Reglas de Decisión Más Relevantes
              </h3>
              <p className="text-[12px] text-[#A1B2AA]">
                Segmentos terminales ordenados por volumen de registros y claridad de separación.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('strategies')}
              className="px-3.5 py-2 rounded-md bg-[#10B981] text-[#101715] text-[12px] font-semibold hover:bg-[#2DD4BF] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <span>Formular estrategias</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {model.rules.slice(0, 6).map((rule) => (
              <div
                key={rule.id}
                className="bg-[#18221F] border border-[#2B3B35] rounded-md p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-[#2DD4BF]">
                    {rule.id} · Predicción: {rule.predictedClass}
                  </span>
                  <span className="font-mono tabular-nums text-[#A3E635]">
                    {rule.samples} reg. ({rule.confidencePct.toFixed(1)}% pureza)
                  </span>
                </div>
                <p className="text-[12px] text-[#F3F7F4]/90 leading-relaxed">
                  {rule.businessSummary}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 9-Question Automated Business Diagnostic Engine */}
      <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-4">
        <div>
          <h3 className="text-[16px] font-bold text-[#F3F7F4]">
            Diagnóstico Ejecutivo Automatizado (9 Preguntas Clave de Negocio)
          </h3>
          <p className="text-[12px] text-[#A1B2AA] mt-0.5">
            Síntesis generada directamente a partir de los resultados estadísticos, particiones del árbol y métricas reales de prueba.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {diagnosticQuestions.map((item) => (
            <div
              key={item.q}
              className="bg-[#18221F] border border-[#2B3B35] rounded-md p-4 space-y-2"
            >
              <h4 className="text-[13px] font-semibold text-[#10B981]">{item.q}</h4>
              <p className="text-[12px] text-[#F3F7F4]/90 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
