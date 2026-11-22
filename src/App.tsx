import { useMemo, useState } from 'react';
import {
  AppSectionId,
  CVGridCandidate,
  Dataset,
  ExecutiveSummary,
  MatrixQuadrant,
  ObjectiveConfig,
  PrepAction,
  PreparedDataset,
  PruningComparisonRow,
  StrategyItem,
  TreeHyperparams,
  TreeModelResult,
  VariableRole,
  VariableType,
} from './types/analytics';
import { generateSyntheticDataset } from './engine/syntheticGenerator';
import { computeCategoricalStats, computeNumericStats } from './engine/statistics';
import { buildPreparationPlan, executePreparationPlan } from './engine/dataPreparation';
import {
  buildPruningComparison,
  optimizeTreeWithCV,
  trainDecisionTreeModel,
} from './engine/decisionTree';
import {
  generateBusinessDiagnostic,
  generateStrategicPlan,
  recommendObjective,
} from './engine/businessEngine';
import { exportExecutivePDF } from './engine/exporters';
import { LayoutShell } from './components/LayoutShell';
import { DashboardHome } from './components/DashboardHome';
import {
  SyntheticDataModule,
  UploadDataModule,
} from './components/DataIngestionModules';
import {
  DescriptiveAnalysisModule,
  ExploreVariablesModule,
} from './components/VariableExplorationModules';
import {
  DataPreparationModule,
  ObjectiveConfigModule,
} from './components/ModelSetupModules';
import {
  PruningOptimizationModule,
  TreeBuilderModule,
} from './components/TreeBuilderModules';
import {
  InterpretationModule,
  ModelEvaluationModule,
} from './components/EvaluationInterpretationModules';
import {
  BusinessStrategiesModule,
  ExportReportModule,
  ImpactEffortMatrixModule,
} from './components/StrategyExportModules';

interface PipelineBundle {
  dataset: Dataset;
  objective: ObjectiveConfig;
  prepActions: PrepAction[];
  prepared: PreparedDataset;
  params: TreeHyperparams;
  cvCandidates: CVGridCandidate[];
  model: TreeModelResult;
  pruningRows: PruningComparisonRow[];
  strategies: StrategyItem[];
  executiveSummary: ExecutiveSummary;
}

function buildFullPipelineFromDataset(ds: Dataset): PipelineBundle {
  const rec = recommendObjective(ds, ds.businessContext);
  const fallbackTarget =
    rec.suggestedTarget ??
    ds.variables.find((v) => v.type.startsWith('categorical_') && v.uniqueCount >= 2)
      ?.name ??
    ds.columns[ds.columns.length - 1];

  const predictors =
    rec.suggestedPredictors.length > 0
      ? rec.suggestedPredictors
      : ds.variables
          .filter((v) => v.name !== fallbackTarget && v.role !== 'identifier' && v.uniqueCount > 1)
          .map((v) => v.name);

  const uniqueTargetVals = Array.from(
    new Set(
      ds.rows
        .map((r) => r[fallbackTarget])
        .filter((v) => v !== null)
        .map((v) => String(v))
    )
  ).sort();

  const objective: ObjectiveConfig = {
    businessGoal: `Analizar y predecir ${fallbackTarget} en el contexto de ${ds.businessContext}.`,
    targetColumn: fallbackTarget,
    predictorColumns: predictors,
    problemType: uniqueTargetVals.length <= 2 ? 'binary' : 'multiclass',
    positiveClass: uniqueTargetVals[0],
    recommendation: rec,
  };

  const prepActions = buildPreparationPlan(ds, objective.targetColumn, objective.predictorColumns);
  const prepared = executePreparationPlan(
    ds,
    objective.targetColumn,
    objective.predictorColumns,
    prepActions
  );

  const cv = optimizeTreeWithCV(prepared, ds.variables);
  const model = trainDecisionTreeModel(prepared, ds.variables, cv.bestParams, {
    isOptimized: true,
    cvScore: cv.candidates[0]?.cvF1,
  });
  const pruningRows = buildPruningComparison(prepared, ds.variables, cv.bestParams);
  const { strategies, executiveSummary } = generateStrategicPlan(ds, objective, model);

  return {
    dataset: ds,
    objective,
    prepActions,
    prepared,
    params: cv.bestParams,
    cvCandidates: cv.candidates,
    model,
    pruningRows,
    strategies,
    executiveSummary,
  };
}

export default function App() {
  const initialBundle = useMemo(() => {
    const initialDs = generateSyntheticDataset('Telecomunicaciones', 'telecom_churn', 800, 2026);
    return buildFullPipelineFromDataset(initialDs);
  }, []);

  const [activeSection, setActiveSection] = useState<AppSectionId>('dashboard');
  const [dataset, setDataset] = useState<Dataset>(initialBundle.dataset);
  const [objective, setObjective] = useState<ObjectiveConfig>(initialBundle.objective);
  const [prepActions, setPrepActions] = useState<PrepAction[]>(initialBundle.prepActions);
  const [prepared, setPrepared] = useState<PreparedDataset>(initialBundle.prepared);
  const [params, setParams] = useState<TreeHyperparams>(initialBundle.params);
  const [cvCandidates, setCvCandidates] = useState<CVGridCandidate[]>(initialBundle.cvCandidates);
  const [model, setModel] = useState<TreeModelResult>(initialBundle.model);
  const [pruningRows, setPruningRows] = useState<PruningComparisonRow[]>(initialBundle.pruningRows);
  const [strategies, setStrategies] = useState<StrategyItem[]>(initialBundle.strategies);
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummary>(
    initialBundle.executiveSummary
  );

  const numericStats = useMemo(
    () =>
      dataset.variables
        .filter((v) => v.type.startsWith('numeric_'))
        .map((v) => computeNumericStats(dataset, v)),
    [dataset]
  );

  const categoricalStats = useMemo(
    () =>
      dataset.variables
        .filter((v) => v.type.startsWith('categorical_'))
        .map((v) => computeCategoricalStats(dataset, v)),
    [dataset]
  );

  const diagnostic = useMemo(
    () => generateBusinessDiagnostic(dataset, objective, model),
    [dataset, objective, model]
  );

  const applyBundle = (b: PipelineBundle, nextSection?: AppSectionId) => {
    setDataset(b.dataset);
    setObjective(b.objective);
    setPrepActions(b.prepActions);
    setPrepared(b.prepared);
    setParams(b.params);
    setCvCandidates(b.cvCandidates);
    setModel(b.model);
    setPruningRows(b.pruningRows);
    setStrategies(b.strategies);
    setExecutiveSummary(b.executiveSummary);
    if (nextSection) setActiveSection(nextSection);
  };

  const handleDatasetLoaded = (ds: Dataset, nextSection?: AppSectionId) => {
    const bundle = buildFullPipelineFromDataset(ds);
    applyBundle(bundle, nextSection);
  };

  const handleUpdateVariable = (
    colName: string,
    patch: { type?: VariableType; role?: VariableRole }
  ) => {
    const nextVars = dataset.variables.map((v) =>
      v.name === colName
        ? {
            ...v,
            ...patch,
            isNumericEncodedCategorical:
              patch.type?.startsWith('categorical_') &&
              typeof dataset.rows[0]?.[colName] === 'number'
                ? true
                : v.isNumericEncodedCategorical,
          }
        : v
    );
    const updatedDs: Dataset = { ...dataset, variables: nextVars };
    setDataset(updatedDs);

    // Refresh model if predictors or types changed
    const nextModel = trainDecisionTreeModel(prepared, nextVars, params, {
      isOptimized: model.isOptimized,
      cvScore: model.cvScore,
    });
    setModel(nextModel);
    setPruningRows(buildPruningComparison(prepared, nextVars, params));
    const plan = generateStrategicPlan(updatedDs, objective, nextModel);
    setStrategies(plan.strategies);
    setExecutiveSummary(plan.executiveSummary);
  };

  const handleSaveObjective = (cfg: ObjectiveConfig, nextSection?: AppSectionId) => {
    setObjective(cfg);
    const nextActions = buildPreparationPlan(dataset, cfg.targetColumn, cfg.predictorColumns);
    setPrepActions(nextActions);
    const nextPrepared = executePreparationPlan(
      dataset,
      cfg.targetColumn,
      cfg.predictorColumns,
      nextActions
    );
    setPrepared(nextPrepared);
    const cv = optimizeTreeWithCV(nextPrepared, dataset.variables);
    setParams(cv.bestParams);
    setCvCandidates(cv.candidates);
    const nextModel = trainDecisionTreeModel(nextPrepared, dataset.variables, cv.bestParams, {
      isOptimized: true,
      cvScore: cv.candidates[0]?.cvF1,
    });
    setModel(nextModel);
    setPruningRows(buildPruningComparison(nextPrepared, dataset.variables, cv.bestParams));
    const plan = generateStrategicPlan(dataset, cfg, nextModel);
    setStrategies(plan.strategies);
    setExecutiveSummary(plan.executiveSummary);
    if (nextSection) setActiveSection(nextSection);
  };

  const handleTogglePrepAction = (id: string) => {
    const updatedActions = prepActions.map((a) =>
      a.id === id ? { ...a, enabled: !a.enabled } : a
    );
    setPrepActions(updatedActions);
  };

  const handleExecutePrep = () => {
    const nextPrepared = executePreparationPlan(
      dataset,
      objective.targetColumn,
      objective.predictorColumns,
      prepActions
    );
    setPrepared(nextPrepared);
    const nextModel = trainDecisionTreeModel(nextPrepared, dataset.variables, params);
    setModel(nextModel);
    setPruningRows(buildPruningComparison(nextPrepared, dataset.variables, params));
    const plan = generateStrategicPlan(dataset, objective, nextModel);
    setStrategies(plan.strategies);
    setExecutiveSummary(plan.executiveSummary);
  };

  const handleTrainWithParams = (nextParams: TreeHyperparams) => {
    setParams(nextParams);
    const nextModel = trainDecisionTreeModel(prepared, dataset.variables, nextParams);
    setModel(nextModel);
    setPruningRows(buildPruningComparison(prepared, dataset.variables, nextParams));
    const plan = generateStrategicPlan(dataset, objective, nextModel);
    setStrategies(plan.strategies);
    setExecutiveSummary(plan.executiveSummary);
  };

  const handleRunAutoOptimize = () => {
    const cv = optimizeTreeWithCV(prepared, dataset.variables);
    setCvCandidates(cv.candidates);
    setParams(cv.bestParams);
    const nextModel = trainDecisionTreeModel(prepared, dataset.variables, cv.bestParams, {
      isOptimized: true,
      cvScore: cv.candidates[0]?.cvF1,
    });
    setModel(nextModel);
    setPruningRows(buildPruningComparison(prepared, dataset.variables, cv.bestParams));
    const plan = generateStrategicPlan(dataset, objective, nextModel);
    setStrategies(plan.strategies);
    setExecutiveSummary(plan.executiveSummary);
  };

  const handleUpdateStrategyScore = (
    id: string,
    impactScore: number,
    effortScore: number
  ) => {
    const next = strategies.map((s) => {
      if (s.id !== id) return s;
      const impactLevel: 'Alto' | 'Bajo' = impactScore >= 6 ? 'Alto' : 'Bajo';
      const effortLevel: 'Alto' | 'Bajo' = effortScore >= 6 ? 'Alto' : 'Bajo';
      const quadrant: MatrixQuadrant =
        impactLevel === 'Alto' && effortLevel === 'Bajo'
          ? 'quick_wins'
          : impactLevel === 'Alto' && effortLevel === 'Alto'
          ? 'strategic_initiatives'
          : impactLevel === 'Bajo' && effortLevel === 'Bajo'
          ? 'complementary'
          : 'low_priority';
      return {
        ...s,
        impactScore,
        effortScore,
        impactLevel,
        effortLevel,
        quadrant,
      };
    });
    setStrategies(next);

    const prioritized = [...next].sort((a, b) => {
      const scoreA = a.impactScore * 1.4 - a.effortScore * 0.7;
      const scoreB = b.impactScore * 1.4 - b.effortScore * 0.7;
      return scoreB - scoreA;
    });
    setExecutiveSummary({
      ...executiveSummary,
      topThreeStrategies: prioritized.slice(0, 3),
    });
  };

  const handleQuickExportPDF = () => {
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
    <LayoutShell
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      dataset={dataset}
      onQuickExportPDF={handleQuickExportPDF}
    >
      {activeSection === 'dashboard' && (
        <DashboardHome
          dataset={dataset}
          objective={objective}
          model={model}
          diagnostic={diagnostic}
          executiveSummary={executiveSummary}
          onNavigate={setActiveSection}
        />
      )}

      {activeSection === 'upload' && (
        <UploadDataModule
          dataset={dataset}
          onDatasetLoaded={handleDatasetLoaded}
        />
      )}

      {activeSection === 'synthetic' && (
        <SyntheticDataModule
          dataset={dataset}
          onDatasetLoaded={handleDatasetLoaded}
        />
      )}

      {activeSection === 'explore' && (
        <ExploreVariablesModule
          dataset={dataset}
          onUpdateVariable={handleUpdateVariable}
          onNavigate={setActiveSection}
        />
      )}

      {activeSection === 'descriptive' && (
        <DescriptiveAnalysisModule
          dataset={dataset}
          numericStats={numericStats}
          categoricalStats={categoricalStats}
          targetColumn={objective.targetColumn}
          onNavigate={setActiveSection}
        />
      )}

      {activeSection === 'objective' && (
        <ObjectiveConfigModule
          dataset={dataset}
          objective={objective}
          onSaveObjective={handleSaveObjective}
        />
      )}

      {activeSection === 'preparation' && (
        <DataPreparationModule
          actions={prepActions}
          prepared={prepared}
          onToggleAction={handleTogglePrepAction}
          onExecutePrep={handleExecutePrep}
          onNavigate={setActiveSection}
        />
      )}

      {activeSection === 'tree' && (
        <TreeBuilderModule
          model={model}
          params={params}
          cvCandidates={cvCandidates}
          onTrainWithParams={handleTrainWithParams}
          onRunAutoOptimize={handleRunAutoOptimize}
          onNavigate={setActiveSection}
        />
      )}

      {activeSection === 'pruning' && (
        <PruningOptimizationModule
          model={model}
          pruningRows={pruningRows}
          onApplyParams={handleTrainWithParams}
          onNavigate={setActiveSection}
        />
      )}

      {activeSection === 'evaluation' && (
        <ModelEvaluationModule
          model={model}
          onNavigate={setActiveSection}
        />
      )}

      {activeSection === 'interpretation' && (
        <InterpretationModule
          model={model}
          diagnostic={diagnostic}
          onNavigate={setActiveSection}
        />
      )}

      {activeSection === 'strategies' && (
        <BusinessStrategiesModule
          strategies={strategies}
          executiveSummary={executiveSummary}
          onNavigate={setActiveSection}
        />
      )}

      {activeSection === 'matrix' && (
        <ImpactEffortMatrixModule
          strategies={strategies}
          onUpdateStrategyScore={handleUpdateStrategyScore}
          onNavigate={setActiveSection}
        />
      )}

      {activeSection === 'export' && (
        <ExportReportModule
          dataset={dataset}
          objective={objective}
          prepared={prepared}
          numericStats={numericStats}
          categoricalStats={categoricalStats}
          model={model}
          pruningRows={pruningRows}
          diagnostic={diagnostic}
          strategies={strategies}
          executiveSummary={executiveSummary}
        />
      )}
    </LayoutShell>
  );
}
