import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  CheckSquare,
  Compass,
  Database,
  Download,
  FileSpreadsheet,
  GitBranch,
  Grid,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Scissors,
  Sliders,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { AppSectionId, Dataset } from '../types/analytics';

interface NavGroup {
  groupLabel: string;
  items: {
    id: AppSectionId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    groupLabel: 'Resumen Ejecutivo',
    items: [
      { id: 'dashboard', label: 'Inicio / Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    groupLabel: 'Datos y Exploración',
    items: [
      { id: 'upload', label: 'Cargar datos', icon: FileSpreadsheet },
      { id: 'synthetic', label: 'Datos sintéticos', icon: Database },
      { id: 'explore', label: 'Exploración de datos', icon: Compass },
      { id: 'descriptive', label: 'Análisis descriptivo', icon: BarChart3 },
    ],
  },
  {
    groupLabel: 'Objetivo y Modelado',
    items: [
      { id: 'objective', label: 'Configuración del objetivo', icon: Target },
      { id: 'preparation', label: 'Preparación de datos', icon: Sliders },
      { id: 'tree', label: 'Construcción del árbol', icon: GitBranch },
      { id: 'pruning', label: 'Optimización y poda', icon: Scissors },
    ],
  },
  {
    groupLabel: 'Evaluación e Inteligencia',
    items: [
      { id: 'evaluation', label: 'Evaluación del modelo', icon: CheckSquare },
      { id: 'interpretation', label: 'Interpretación de resultados', icon: Activity },
    ],
  },
  {
    groupLabel: 'Estrategia y Reporte',
    items: [
      { id: 'strategies', label: 'Estrategias de negocio', icon: Lightbulb },
      { id: 'matrix', label: 'Matriz impacto vs. esfuerzo', icon: Grid },
      { id: 'export', label: 'Exportar informe', icon: Download },
    ],
  },
];

interface LayoutShellProps {
  activeSection: AppSectionId;
  onSelectSection: (id: AppSectionId) => void;
  dataset: Dataset | null;
  onQuickExportPDF: () => void;
  children: React.ReactNode;
}

export const LayoutShell: React.FC<LayoutShellProps> = ({
  activeSection,
  onSelectSection,
  dataset,
  onQuickExportPDF,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeLabel =
    NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === activeSection)?.label ??
    'Inicio / Dashboard';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#18221F] border-r border-[#2B3B35]">
      <div className="px-5 py-5 border-b border-[#2B3B35] flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            onSelectSection('dashboard');
            setMobileOpen(false);
          }}
          className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] rounded"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#10B981]/15 border border-[#10B981]/40 flex items-center justify-center shrink-0">
              <GitBranch className="w-4 h-4 text-[#10B981]" />
            </div>
            <span className="text-[15px] font-bold tracking-tight text-[#F3F7F4] whitespace-nowrap">
              Decision Tree Intelligence
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 text-[#A1B2AA] hover:text-[#F3F7F4]"
          aria-label="Cerrar menú"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Navegación principal">
        {NAV_GROUPS.map((group) => (
          <div key={group.groupLabel}>
            <div className="px-3 mb-1.5 text-[11px] font-semibold tracking-wider text-[#A1B2AA]/70">
              {group.groupLabel}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSection(item.id);
                        setMobileOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors text-left whitespace-nowrap ${
                        isActive
                          ? 'bg-[#10B981]/14 text-[#10B981] border border-[#10B981]/30'
                          : 'text-[#A1B2AA] hover:text-[#F3F7F4] hover:bg-[#202C27] border border-transparent'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#10B981]' : 'text-[#A1B2AA]'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {dataset && (
        <div className="px-4 py-3.5 border-t border-[#2B3B35] bg-[#101715]/50 text-[12px] text-[#A1B2AA] space-y-1">
          <div className="font-medium text-[#F3F7F4] truncate">{dataset.sector}</div>
          <div className="truncate">
            {dataset.sourceType === 'synthetic' ? 'Base sintética' : 'Archivo propio'} ·{' '}
            <span className="font-mono tabular-nums">{dataset.quality.rowCount}</span> reg.
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#101715] text-[#F3F7F4] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-[272px] max-w-[85vw] h-full">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-[#101715]/95 backdrop-blur border-b border-[#2B3B35] px-4 sm:px-8 py-3.5 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-md bg-[#18221F] border border-[#2B3B35] text-[#F3F7F4]"
              aria-label="Abrir navegación"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-[13px] min-w-0">
              <span className="text-[#A1B2AA] hidden sm:inline whitespace-nowrap">
                Analítica de Decisiones
              </span>
              <span className="text-[#A1B2AA]/60 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-semibold text-[#F3F7F4] truncate">{activeLabel}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {dataset && (
              <span className="hidden md:inline text-[12px] text-[#A1B2AA] whitespace-nowrap">
                {dataset.sourceType === 'synthetic'
                  ? 'Entorno con datos sintéticos'
                  : `Archivo: ${dataset.fileName}`}
              </span>
            )}
            <button
              type="button"
              onClick={onQuickExportPDF}
              disabled={!dataset}
              className="px-4 py-2 rounded-md text-[13px] font-semibold bg-[#10B981] text-[#101715] hover:bg-[#2DD4BF] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 hidden" />
              <Download className="w-3.5 h-3.5" />
              <span>Exportar PDF</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-6 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
