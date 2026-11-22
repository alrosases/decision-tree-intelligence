import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Search } from 'lucide-react';
import {
  AppSectionId,
  CategoricalStats,
  Dataset,
  NumericStats,
  VariableRole,
  VariableType,
} from '../types/analytics';
import { computeCrossComparison } from '../engine/statistics';

const TYPE_LABELS: Record<VariableType, string> = {
  numeric_continuous: 'Numérica continua',
  numeric_discrete: 'Numérica discreta',
  numeric_integer: 'Numérica entera',
  categorical_nominal: 'Categórica nominal',
  categorical_ordinal: 'Categórica ordinal',
  categorical_binary: 'Categórica binaria',
};

const ROLE_LABELS: Record<VariableRole, string> = {
  target_candidate: 'Candidata a objetivo',
  predictor: 'Variable predictora',
  identifier: 'Identificador (excluir)',
  ignored: 'Ignorar en el modelo',
};

interface ExploreVariablesModuleProps {
  dataset: Dataset;
  onUpdateVariable: (
    colName: string,
    patch: { type?: VariableType; role?: VariableRole }
  ) => void;
  onNavigate: (sec: AppSectionId) => void;
}

export const ExploreVariablesModule: React.FC<ExploreVariablesModuleProps> = ({
  dataset,
  onUpdateVariable,
  onNavigate,
}) => {
  const [search, setSearch] = useState('');

  const filteredVars = dataset.variables.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#F3F7F4]">
              Identificación y Clasificación de Variables
            </h2>
            <p className="text-[13px] text-[#A1B2AA] mt-1">
              Revise la clasificación automática de variables numéricas y categóricas. Si una variable codificada con números representa categorías (ej. códigos 1, 2, 3), puede corregir su tipo manualmente aquí.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#A1B2AA] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar variable..."
                className="bg-[#18221F] border border-[#2B3B35] rounded-md pl-8 pr-3 py-1.5 text-[13px] text-[#F3F7F4] focus:outline-none focus:border-[#10B981]"
              />
            </div>
            <button
              type="button"
              onClick={() => onNavigate('descriptive')}
              className="px-4 py-2 rounded-md bg-[#10B981] text-[#101715] text-[13px] font-semibold hover:bg-[#2DD4BF] transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>Ver análisis descriptivo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-[#2B3B35] rounded-md">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#18221F] border-b border-[#2B3B35] text-[#A1B2AA] text-[12px]">
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Tipo de variable (editable)</th>
                <th className="px-4 py-3 font-semibold text-right">Únicos</th>
                <th className="px-4 py-3 font-semibold text-right">Faltantes</th>
                <th className="px-4 py-3 font-semibold">Ejemplos de valores</th>
                <th className="px-4 py-3 font-semibold">Función en el análisis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B3B35]">
              {filteredVars.map((v) => (
                <tr key={v.name} className="hover:bg-[#18221F]/50">
                  <td className="px-4 py-3 font-semibold text-[#F3F7F4]">
                    <div>{v.name}</div>
                    {v.isNumericEncodedCategorical && (
                      <div className="text-[11px] font-normal text-[#2DD4BF] mt-0.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>Codificada numéricamente como categoría</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Tipo de variable ${v.name}`}
                      value={v.type}
                      onChange={(e) =>
                        onUpdateVariable(v.name, {
                          type: e.target.value as VariableType,
                        })
                      }
                      className="bg-[#18221F] border border-[#2B3B35] rounded px-2.5 py-1.5 text-[12px] text-[#F3F7F4] focus:outline-none focus:border-[#10B981]"
                    >
                      {Object.entries(TYPE_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[#F3F7F4]">
                    {v.uniqueCount}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    <span className={v.missingCount > 0 ? 'text-[#F59E0B]' : 'text-[#A1B2AA]'}>
                      {v.missingCount} ({v.missingPct.toFixed(1)}%)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#A1B2AA] max-w-[240px] truncate">
                    {v.examples.join(' · ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Función de ${v.name}`}
                      value={v.role}
                      onChange={(e) =>
                        onUpdateVariable(v.name, {
                          role: e.target.value as VariableRole,
                        })
                      }
                      className="bg-[#18221F] border border-[#2B3B35] rounded px-2.5 py-1.5 text-[12px] text-[#F3F7F4] focus:outline-none focus:border-[#10B981]"
                    >
                      {Object.entries(ROLE_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface DescriptiveModuleProps {
  dataset: Dataset;
  numericStats: NumericStats[];
  categoricalStats: CategoricalStats[];
  targetColumn: string;
  onNavigate: (sec: AppSectionId) => void;
}

export const DescriptiveAnalysisModule: React.FC<DescriptiveModuleProps> = ({
  dataset,
  numericStats,
  categoricalStats,
  targetColumn,
  onNavigate,
}) => {
  const [selectedNum, setSelectedNum] = useState<string>(
    numericStats[0]?.column ?? ''
  );
  const [selectedCat, setSelectedCat] = useState<string>(
    categoricalStats[0]?.column ?? ''
  );
  const [crossFeature, setCrossFeature] = useState<string>(
    categoricalStats.find((c) => c.column !== targetColumn)?.column ??
      categoricalStats[0]?.column ??
      ''
  );

  const activeNumStat =
    numericStats.find((n) => n.column === selectedNum) ?? numericStats[0];
  const activeCatStat =
    categoricalStats.find((c) => c.column === selectedCat) ?? categoricalStats[0];

  const crossData = useMemo(() => {
    if (!crossFeature || !targetColumn || crossFeature === targetColumn) return null;
    return computeCrossComparison(dataset, crossFeature, targetColumn);
  }, [dataset, crossFeature, targetColumn]);

  const maxBinCount = activeNumStat
    ? Math.max(1, ...activeNumStat.bins.map((b) => b.count))
    : 1;

  return (
    <div className="space-y-6">
      {/* Numeric Summary Table */}
      <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#F3F7F4]">
              Estadísticos Descriptivos — Variables Numéricas
            </h2>
            <p className="text-[13px] text-[#A1B2AA]">
              Medidas de tendencia central, dispersión, cuartiles y detección de valores atípicos calculados sobre los registros cargados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('objective')}
            className="px-4 py-2 rounded-md bg-[#10B981] text-[#101715] text-[13px] font-semibold hover:bg-[#2DD4BF] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <span>Definir objetivo del análisis</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {numericStats.length === 0 ? (
          <p className="text-[13px] text-[#A1B2AA]">
            No hay variables clasificadas como numéricas en la base actual.
          </p>
        ) : (
          <div className="overflow-x-auto border border-[#2B3B35] rounded-md">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#18221F] border-b border-[#2B3B35] text-[#A1B2AA]">
                  <th className="px-3 py-2.5 font-semibold">Variable</th>
                  <th className="px-3 py-2.5 font-semibold text-right">N</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Faltantes</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Media</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Mediana</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Desv. Est.</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Mín</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Q1</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Q3</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Máx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B3B35]">
                {numericStats.map((n) => (
                  <tr key={n.column} className="hover:bg-[#18221F]/50">
                    <td className="px-3 py-2.5 font-semibold text-[#F3F7F4]">{n.column}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{n.count}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[#F59E0B]">{n.missing}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{n.mean.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[#10B981]">{n.median.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{n.std.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{n.min.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{n.q1.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{n.q3.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{n.max.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Numeric Visualizations: Histogram + Box Plot */}
      {activeNumStat && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[15px] font-semibold text-[#F3F7F4]">
                Histograma de Distribución
              </h3>
              <select
                aria-label="Variable numérica para histograma"
                value={activeNumStat.column}
                onChange={(e) => setSelectedNum(e.target.value)}
                className="bg-[#18221F] border border-[#2B3B35] rounded-md px-3 py-1.5 text-[12px] text-[#F3F7F4] focus:outline-none focus:border-[#10B981]"
              >
                {numericStats.map((n) => (
                  <option key={n.column} value={n.column}>
                    {n.column}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-[220px] flex items-end gap-2 pt-6 pb-2 border-b border-[#2B3B35]">
              {activeNumStat.bins.map((bin, idx) => {
                const hPct = (bin.count / maxBinCount) * 100;
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center justify-end h-full group"
                  >
                    <span className="text-[10px] font-mono tabular-nums text-[#A1B2AA] mb-1">
                      {bin.count}
                    </span>
                    <div
                      className="w-full bg-[#10B981]/80 hover:bg-[#2DD4BF] transition-colors rounded-t"
                      style={{ height: `${Math.max(4, hPct)}%` }}
                      title={`${bin.label}: ${bin.count} registros`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 text-[10px] font-mono text-[#A1B2AA] overflow-x-auto">
              {activeNumStat.bins.map((bin, idx) => (
                <div key={idx} className="flex-1 text-center truncate" title={bin.label}>
                  {bin.label}
                </div>
              ))}
            </div>

            <p className="text-[13px] text-[#F3F7F4]/90 bg-[#18221F] border border-[#2B3B35] rounded-md p-3.5 leading-relaxed">
              <span className="font-semibold text-[#10B981]">Interpretación empresarial: </span>
              {activeNumStat.interpretation}
            </p>
          </div>

          {/* Box Plot Card */}
          <div className="lg:col-span-5 bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-[15px] font-semibold text-[#F3F7F4]">
                Diagrama de Caja (Valores Atípicos y Cuartiles)
              </h3>

              {/* SVG Box Plot */}
              <div className="bg-[#18221F] border border-[#2B3B35] rounded-md p-4">
                {(() => {
                  const span = Math.max(1e-6, activeNumStat.max - activeNumStat.min);
                  const pos = (v: number) => ((v - activeNumStat.min) / span) * 260 + 20;
                  const xMin = pos(activeNumStat.min);
                  const xQ1 = pos(activeNumStat.q1);
                  const xMed = pos(activeNumStat.median);
                  const xQ3 = pos(activeNumStat.q3);
                  const xMax = pos(activeNumStat.max);
                  return (
                    <svg viewBox="0 0 300 100" className="w-full h-28">
                      <line x1={xMin} y1="50" x2={xQ1} y2="50" stroke="#A1B2AA" strokeWidth="2" />
                      <line x1={xQ3} y1="50" x2={xMax} y2="50" stroke="#A1B2AA" strokeWidth="2" />
                      <line x1={xMin} y1="36" x2={xMin} y2="64" stroke="#A1B2AA" strokeWidth="2" />
                      <line x1={xMax} y1="36" x2={xMax} y2="64" stroke="#A1B2AA" strokeWidth="2" />
                      <rect
                        x={xQ1}
                        y="26"
                        width={Math.max(4, xQ3 - xQ1)}
                        height="48"
                        fill="rgba(16, 185, 129, 0.25)"
                        stroke="#10B981"
                        strokeWidth="2"
                        rx="3"
                      />
                      <line x1={xMed} y1="26" x2={xMed} y2="74" stroke="#A3E635" strokeWidth="3" />
                    </svg>
                  );
                })()}
                <div className="grid grid-cols-5 text-center text-[11px] font-mono tabular-nums text-[#A1B2AA] mt-2">
                  <div>
                    <div>Mín</div>
                    <div className="text-[#F3F7F4]">{activeNumStat.min.toFixed(1)}</div>
                  </div>
                  <div>
                    <div>Q1</div>
                    <div className="text-[#F3F7F4]">{activeNumStat.q1.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-[#A3E635]">Mediana</div>
                    <div className="text-[#A3E635] font-semibold">{activeNumStat.median.toFixed(1)}</div>
                  </div>
                  <div>
                    <div>Q3</div>
                    <div className="text-[#F3F7F4]">{activeNumStat.q3.toFixed(1)}</div>
                  </div>
                  <div>
                    <div>Máx</div>
                    <div className="text-[#F3F7F4]">{activeNumStat.max.toFixed(1)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[13px] text-[#A1B2AA] bg-[#18221F] border border-[#2B3B35] rounded-md p-3.5">
              El 50% central de los casos de <span className="text-[#F3F7F4] font-semibold">{activeNumStat.column}</span> se ubica entre{' '}
              <span className="font-mono text-[#F3F7F4]">{activeNumStat.q1.toFixed(2)}</span> y{' '}
              <span className="font-mono text-[#F3F7F4]">{activeNumStat.q3.toFixed(2)}</span> (IQR:{' '}
              <span className="font-mono text-[#2DD4BF]">{activeNumStat.iqr.toFixed(2)}</span>). Se detectaron{' '}
              <span className="font-mono text-[#F59E0B]">{activeNumStat.outlierCount}</span> valores atípicos.
            </div>
          </div>
        </div>
      )}

      {/* Categorical Distributions + Cross Comparison */}
      {activeCatStat && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[15px] font-semibold text-[#F3F7F4]">
                Frecuencias y Participación — Variables Categóricas
              </h3>
              <select
                aria-label="Variable categórica"
                value={activeCatStat.column}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="bg-[#18221F] border border-[#2B3B35] rounded-md px-3 py-1.5 text-[12px] text-[#F3F7F4] focus:outline-none focus:border-[#10B981]"
              >
                {categoricalStats.map((c) => (
                  <option key={c.column} value={c.column}>
                    {c.column} ({c.uniqueCount})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {activeCatStat.frequencies.slice(0, 8).map((freq, idx) => (
                <div key={freq.value} className="space-y-1">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium text-[#F3F7F4] truncate max-w-[220px]">
                      {freq.value}
                    </span>
                    <span className="font-mono tabular-nums text-[#A1B2AA]">
                      {freq.count} ({freq.pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-[#101715] rounded overflow-hidden">
                    <div
                      className={`h-full rounded ${
                        idx === 0 ? 'bg-[#10B981]' : idx === 1 ? 'bg-[#2DD4BF]' : 'bg-[#A3E635]/80'
                      }`}
                      style={{ width: `${Math.max(2, freq.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[13px] text-[#F3F7F4]/90 bg-[#18221F] border border-[#2B3B35] rounded-md p-3.5 leading-relaxed">
              <span className="font-semibold text-[#2DD4BF]">Lectura de negocio: </span>
              {activeCatStat.interpretation}
            </p>
          </div>

          <div className="lg:col-span-6 bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[15px] font-semibold text-[#F3F7F4]">
                Comparación Cruzada vs. {targetColumn}
              </h3>
              <select
                aria-label="Variable predictora para comparar"
                value={crossFeature}
                onChange={(e) => setCrossFeature(e.target.value)}
                className="bg-[#18221F] border border-[#2B3B35] rounded-md px-3 py-1.5 text-[12px] text-[#F3F7F4] focus:outline-none focus:border-[#10B981]"
              >
                {categoricalStats
                  .filter((c) => c.column !== targetColumn)
                  .map((c) => (
                    <option key={c.column} value={c.column}>
                      {c.column}
                    </option>
                  ))}
              </select>
            </div>

            {crossData ? (
              <>
                <div className="space-y-3">
                  {crossData.items.slice(0, 6).map((item) => (
                    <div key={item.category} className="space-y-1">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-medium text-[#F3F7F4]">{item.category}</span>
                        <span className="font-mono tabular-nums text-[#A1B2AA]">
                          n={item.total}
                        </span>
                      </div>
                      <div className="h-5 bg-[#101715] rounded overflow-hidden flex">
                        {item.targetBreakdown.map((tb, bIdx) => {
                          const colors = ['bg-[#10B981]', 'bg-[#2DD4BF]', 'bg-[#A3E635]', 'bg-[#F59E0B]'];
                          return (
                            <div
                              key={tb.targetValue}
                              className={`${colors[bIdx % colors.length]} h-full flex items-center justify-center text-[10px] font-mono font-bold text-[#101715]`}
                              style={{ width: `${tb.pct}%` }}
                              title={`${tb.targetValue}: ${tb.count} (${tb.pct.toFixed(1)}%)`}
                            >
                              {tb.pct >= 14 ? `${tb.pct.toFixed(0)}%` : ''}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4 text-[11px] text-[#A1B2AA]">
                  {crossData.targetValues.map((tv, idx) => {
                    const dotColors = ['bg-[#10B981]', 'bg-[#2DD4BF]', 'bg-[#A3E635]', 'bg-[#F59E0B]'];
                    return (
                      <div key={tv} className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-sm ${dotColors[idx % dotColors.length]}`} />
                        <span>{tv}</span>
                      </div>
                    );
                  })}
                </div>

                <p className="text-[13px] text-[#F3F7F4]/90 bg-[#18221F] border border-[#2B3B35] rounded-md p-3.5 leading-relaxed">
                  <span className="font-semibold text-[#A3E635]">Hallazgo comparativo: </span>
                  {crossData.interpretation}
                </p>
              </>
            ) : (
              <p className="text-[13px] text-[#A1B2AA]">
                Seleccione una variable categórica distinta de la variable objetivo para visualizar la comparación cruzada.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
