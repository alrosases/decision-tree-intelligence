import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Upload,
} from 'lucide-react';
import { AppSectionId, Dataset, EconomicSector } from '../types/analytics';
import { parseUploadedFile } from '../engine/dataParser';
import {
  ECONOMIC_SECTORS,
  SECTOR_SCENARIOS,
  generateSyntheticDataset,
} from '../engine/syntheticGenerator';

interface UploadModuleProps {
  dataset: Dataset | null;
  onDatasetLoaded: (ds: Dataset, nextSection?: AppSectionId) => void;
}

export const UploadDataModule: React.FC<UploadModuleProps> = ({
  dataset,
  onDatasetLoaded,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sector, setSector] = useState<EconomicSector>(
    dataset?.sector ?? 'Comercio y retail'
  );
  const [contextDesc, setContextDesc] = useState<string>(
    'Análisis predictivo de clientes y resultados comerciales'
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const ds = await parseUploadedFile(file, sector, contextDesc.trim() || sector);
      onDatasetLoaded(ds);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al procesar el archivo. Verifique que tenga formato tabular válido.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-[#F3F7F4]">
            Cargar Base de Datos Propia
          </h2>
          <p className="text-[13px] text-[#A1B2AA] mt-1">
            Soporta archivos Excel (.xlsx, .xls), CSV (.csv), texto delimitado (.txt, .tsv) y JSON tabular. El sistema identificará automáticamente columnas, tipos de variables, faltantes y duplicados.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="upload-sector" className="block text-[12px] font-medium text-[#A1B2AA]">
              Sector económico de la empresa
            </label>
            <select
              id="upload-sector"
              value={sector}
              onChange={(e) => setSector(e.target.value as EconomicSector)}
              className="w-full bg-[#18221F] border border-[#2B3B35] rounded-md px-3 py-2 text-[13px] text-[#F3F7F4] focus:outline-none focus:border-[#10B981]"
            >
              {ECONOMIC_SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="upload-context" className="block text-[12px] font-medium text-[#A1B2AA]">
              Contexto del análisis
            </label>
            <input
              id="upload-context"
              type="text"
              value={contextDesc}
              onChange={(e) => setContextDesc(e.target.value)}
              placeholder="Ej. Predicción de abandono o aprobación crediticia"
              className="w-full bg-[#18221F] border border-[#2B3B35] rounded-md px-3 py-2 text-[13px] text-[#F3F7F4] focus:outline-none focus:border-[#10B981]"
            />
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? 'border-[#10B981] bg-[#10B981]/10'
              : 'border-[#2B3B35] bg-[#18221F]/60 hover:border-[#2DD4BF]/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.txt,.tsv,.json,.ods"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Upload className="w-8 h-8 text-[#10B981] mx-auto mb-3" />
          <div className="text-[14px] font-semibold text-[#F3F7F4] mb-1">
            {loading ? 'Procesando archivo y perfilando variables...' : 'Arrastre su archivo aquí o selecciónelo desde su equipo'}
          </div>
          <p className="text-[12px] text-[#A1B2AA] mb-4">
            Formatos compatibles: .xlsx · .xls · .csv · .txt · .tsv · .json
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-md bg-[#10B981] text-[#101715] font-semibold text-[13px] hover:bg-[#2DD4BF] transition-colors disabled:opacity-50"
          >
            Seleccionar archivo
          </button>
        </div>

        {errorMsg && (
          <div className="bg-[#EF4444]/10 border border-[#EF4444]/40 rounded-md px-4 py-3 text-[13px] text-[#FCA5A5] flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#EF4444]" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {dataset && (
        <DatasetLoadedOverview
          dataset={dataset}
          onContinue={() => onDatasetLoaded(dataset, 'explore')}
        />
      )}
    </div>
  );
};

interface SyntheticModuleProps {
  dataset: Dataset | null;
  onDatasetLoaded: (ds: Dataset, nextSection?: AppSectionId) => void;
}

export const SyntheticDataModule: React.FC<SyntheticModuleProps> = ({
  dataset,
  onDatasetLoaded,
}) => {
  const [sector, setSector] = useState<EconomicSector>(
    dataset?.sector ?? 'Telecomunicaciones'
  );
  const scenarios = SECTOR_SCENARIOS[sector];
  const [scenarioId, setScenarioId] = useState<string>(scenarios[0].id);
  const [rowCount, setRowCount] = useState<number>(800);

  const activeScenario =
    scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];

  const handleSectorChange = (newSector: EconomicSector) => {
    setSector(newSector);
    const list = SECTOR_SCENARIOS[newSector];
    setScenarioId(list[0].id);
  };

  const handleGenerate = () => {
    const ds = generateSyntheticDataset(sector, activeScenario.id, rowCount);
    onDatasetLoaded(ds);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2B3B35] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#F3F7F4]">
              Generador de Datos Sintéticos Empresariales
            </h2>
            <p className="text-[13px] text-[#A1B2AA] mt-1">
              Simule bases estadísticas coherentes con variables numéricas, categóricas y relaciones lógicas reales según su sector y escenario de negocio.
            </p>
          </div>
          <span className="text-[12px] font-medium text-[#F59E0B] whitespace-nowrap">
            Aviso: Los datos generados son sintéticos (simulación), no registros reales.
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Criteria A: Sector */}
          <div className="lg:col-span-5 space-y-2">
            <label className="block text-[13px] font-semibold text-[#F3F7F4]">
              A. Sector económico
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5 max-h-[340px] overflow-y-auto pr-1">
              {ECONOMIC_SECTORS.map((sec) => {
                const selected = sec === sector;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => handleSectorChange(sec)}
                    className={`px-3.5 py-2.5 rounded-md text-left text-[13px] font-medium border transition-colors ${
                      selected
                        ? 'bg-[#10B981]/15 border-[#10B981] text-[#10B981]'
                        : 'bg-[#18221F] border-[#2B3B35] text-[#A1B2AA] hover:text-[#F3F7F4]'
                    }`}
                  >
                    {sec}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Criteria B: Context & Volume */}
          <div className="lg:col-span-7 space-y-5">
            <div className="space-y-2">
              <label className="block text-[13px] font-semibold text-[#F3F7F4]">
                B. Contexto empresarial ({sector})
              </label>
              <div className="space-y-2">
                {scenarios.map((sc) => {
                  const selected = sc.id === activeScenario.id;
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setScenarioId(sc.id)}
                      className={`w-full p-3.5 rounded-md text-left border transition-colors ${
                        selected
                          ? 'bg-[#10B981]/12 border-[#10B981]'
                          : 'bg-[#18221F] border-[#2B3B35] hover:border-[#2DD4BF]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-[#F3F7F4]">
                          {sc.title}
                        </span>
                        <span className="text-[12px] font-mono text-[#2DD4BF] shrink-0">
                          Objetivo: {sc.targetColumn}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#A1B2AA] mt-1 leading-relaxed">
                        {sc.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#18221F] border border-[#2B3B35] rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between text-[13px]">
                <label htmlFor="synthetic-rows" className="font-medium text-[#F3F7F4]">
                  Cantidad de registros a generar
                </label>
                <span className="font-mono tabular-nums font-semibold text-[#10B981]">
                  {rowCount.toLocaleString('es-ES')} registros
                </span>
              </div>
              <input
                id="synthetic-rows"
                type="range"
                min={200}
                max={3000}
                step={100}
                value={rowCount}
                onChange={(e) => setRowCount(Number(e.target.value))}
                className="w-full accent-[#10B981]"
              />
              <div className="flex justify-between text-[11px] text-[#A1B2AA] font-mono tabular-nums">
                <span>200</span>
                <span>1,000</span>
                <span>2,000</span>
                <span>3,000</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={handleGenerate}
                className="px-5 py-2.5 rounded-md bg-[#10B981] text-[#101715] font-semibold text-[13px] hover:bg-[#2DD4BF] transition-colors flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                <span>Generar base sintética y entrenar flujo inicial</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {dataset && (
        <DatasetLoadedOverview
          dataset={dataset}
          onContinue={() => onDatasetLoaded(dataset, 'explore')}
        />
      )}
    </div>
  );
};

const DatasetLoadedOverview: React.FC<{
  dataset: Dataset;
  onContinue: () => void;
}> = ({ dataset, onContinue }) => {
  const previewCols = dataset.columns;
  const previewRows = dataset.rows.slice(0, 5);

  return (
    <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2B3B35] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[#10B981]">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              Base activa: {dataset.fileName} (
              {dataset.sourceType === 'synthetic' ? 'Datos sintéticos' : 'Archivo cargado'})
            </span>
          </div>
          {dataset.scenarioDescription && (
            <p className="text-[12px] text-[#A1B2AA]">{dataset.scenarioDescription}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onContinue}
          className="px-4 py-2 rounded-md bg-[#18221F] border border-[#10B981]/50 text-[#10B981] text-[13px] font-semibold hover:bg-[#10B981]/15 transition-colors whitespace-nowrap shrink-0"
        >
          Ir a Exploración de Variables
        </button>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#18221F] border border-[#2B3B35] rounded-md p-3.5">
          <div className="text-[12px] text-[#A1B2AA]">Registros</div>
          <div className="text-[20px] font-bold font-mono tabular-nums text-[#F3F7F4] mt-0.5">
            {dataset.quality.rowCount.toLocaleString('es-ES')}
          </div>
        </div>
        <div className="bg-[#18221F] border border-[#2B3B35] rounded-md p-3.5">
          <div className="text-[12px] text-[#A1B2AA]">Variables</div>
          <div className="text-[20px] font-bold font-mono tabular-nums text-[#F3F7F4] mt-0.5">
            {dataset.quality.columnCount}
          </div>
        </div>
        <div className="bg-[#18221F] border border-[#2B3B35] rounded-md p-3.5">
          <div className="text-[12px] text-[#A1B2AA]">Valores faltantes</div>
          <div className="text-[20px] font-bold font-mono tabular-nums text-[#F59E0B] mt-0.5">
            {dataset.quality.totalMissingCells}{' '}
            <span className="text-[12px] font-normal">
              ({dataset.quality.missingPct.toFixed(1)}%)
            </span>
          </div>
        </div>
        <div className="bg-[#18221F] border border-[#2B3B35] rounded-md p-3.5">
          <div className="text-[12px] text-[#A1B2AA]">Registros duplicados</div>
          <div className="text-[20px] font-bold font-mono tabular-nums text-[#2DD4BF] mt-0.5">
            {dataset.quality.duplicateRows}
          </div>
        </div>
      </div>

      {/* First 5 rows table */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[#F3F7F4]">
          <FileSpreadsheet className="w-4 h-4 text-[#2DD4BF]" />
          <span>Primeras 5 filas de la base</span>
        </div>
        <div className="overflow-x-auto border border-[#2B3B35] rounded-md">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#18221F] border-b border-[#2B3B35] text-[#A1B2AA]">
                {previewCols.map((col) => (
                  <th key={col} className="px-3 py-2.5 font-semibold whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B3B35]">
              {previewRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#18221F]/60">
                  {previewCols.map((col) => {
                    const val = row[col];
                    return (
                      <td
                        key={col}
                        className={`px-3 py-2 whitespace-nowrap ${
                          typeof val === 'number'
                            ? 'font-mono tabular-nums text-right text-[#F3F7F4]'
                            : val === null
                            ? 'text-[#F59E0B] italic'
                            : 'text-[#F3F7F4]'
                        }`}
                      >
                        {val === null ? 'Faltante' : String(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inconsistencies */}
      {dataset.quality.inconsistencies.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[13px] font-semibold text-[#F59E0B]">
            Posibles inconsistencias detectadas ({dataset.quality.inconsistencies.length})
          </h4>
          <ul className="space-y-1.5 text-[12px] text-[#A1B2AA] bg-[#18221F] border border-[#2B3B35] rounded-md p-3.5">
            {dataset.quality.inconsistencies.map((inc, idx) => (
              <li key={idx}>
                <span className="font-semibold text-[#F3F7F4]">{inc.column}:</span>{' '}
                {inc.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
