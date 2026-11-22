export type AppSectionId =
  | 'dashboard'
  | 'upload'
  | 'synthetic'
  | 'explore'
  | 'descriptive'
  | 'objective'
  | 'preparation'
  | 'tree'
  | 'pruning'
  | 'evaluation'
  | 'interpretation'
  | 'strategies'
  | 'matrix'
  | 'export';

export type VariableType =
  | 'numeric_continuous'
  | 'numeric_discrete'
  | 'numeric_integer'
  | 'categorical_nominal'
  | 'categorical_ordinal'
  | 'categorical_binary';

export type VariableRole =
  | 'target_candidate'
  | 'predictor'
  | 'identifier'
  | 'ignored';

export type DataValue = string | number | null;
export type DataRow = Record<string, DataValue>;

export interface VariableMeta {
  name: string;
  detectedType: VariableType;
  type: VariableType;
  uniqueCount: number;
  missingCount: number;
  missingPct: number;
  examples: string[];
  role: VariableRole;
  isNumericEncodedCategorical?: boolean;
  ordinalOrder?: string[];
  notes?: string;
}

export interface DataInconsistency {
  column: string;
  type: 'case_whitespace' | 'mixed_type' | 'outlier_extreme' | 'constant' | 'high_missing';
  description: string;
  affectedCount: number;
}

export interface DataQualityReport {
  rowCount: number;
  columnCount: number;
  totalMissingCells: number;
  missingPct: number;
  duplicateRows: number;
  inconsistencies: DataInconsistency[];
}

export type EconomicSector =
  | 'Financiero y bancario'
  | 'Telecomunicaciones'
  | 'Comercio y retail'
  | 'Salud'
  | 'Educación'
  | 'Marketing y publicidad'
  | 'Transporte y logística'
  | 'Manufactura'
  | 'Tecnología'
  | 'Servicios'
  | 'Turismo y hotelería'
  | 'Otros';

export interface Dataset {
  id: string;
  fileName: string;
  sourceType: 'uploaded' | 'synthetic';
  sector: EconomicSector;
  businessContext: string;
  scenarioDescription?: string;
  columns: string[];
  rows: DataRow[];
  variables: VariableMeta[];
  quality: DataQualityReport;
  loadedAt: string;
}

export interface NumericStats {
  column: string;
  count: number;
  missing: number;
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
  outlierCount: number;
  bins: { label: string; min: number; max: number; count: number }[];
  interpretation: string;
}

export interface CategoricalFreqItem {
  value: string;
  count: number;
  pct: number;
}

export interface CategoricalStats {
  column: string;
  count: number;
  missing: number;
  uniqueCount: number;
  topCategory: string;
  topCategoryPct: number;
  frequencies: CategoricalFreqItem[];
  interpretation: string;
}

export interface CrossComparisonItem {
  category: string;
  targetBreakdown: { targetValue: string; count: number; pct: number }[];
  total: number;
}

export type ProblemType = 'binary' | 'multiclass';

export interface ObjectiveRecommendation {
  suggestedTarget: string | null;
  reason: string;
  suggestedPredictors: string[];
  detectedKeywords: string[];
  warning?: string;
}

export interface ObjectiveConfig {
  businessGoal: string;
  targetColumn: string;
  predictorColumns: string[];
  problemType: ProblemType;
  positiveClass?: string;
  recommendation?: ObjectiveRecommendation;
}

export interface PrepAction {
  id: string;
  category: 'duplicates' | 'missing' | 'normalization' | 'leakage' | 'irrelevant' | 'encoding';
  column?: string;
  title: string;
  reason: string;
  impactSummary: string;
  enabled: boolean;
  recommended: boolean;
  severity: 'info' | 'warning' | 'critical';
}

export interface PreparedDataset {
  rows: DataRow[];
  targetColumn: string;
  predictorColumns: string[];
  classes: string[];
  removedDuplicates: number;
  imputedColumns: string[];
  droppedColumns: { name: string; reason: string }[];
  normalizedColumns: string[];
  actionsApplied: PrepAction[];
}

export type SplitCriterion = 'gini' | 'entropy';

export interface TreeHyperparams {
  criterion: SplitCriterion;
  maxDepth: number;
  minSamplesSplit: number;
  minSamplesLeaf: number;
  maxLeafNodes: number;
  ccpAlpha: number;
}

export interface TreeNode {
  id: string;
  depth: number;
  isLeaf: boolean;
  samples: number;
  impurity: number;
  classCounts: Record<string, number>;
  classProportions: Record<string, number>;
  predictedClass: string;
  confidencePct: number;
  feature?: string;
  featureType?: 'numeric' | 'categorical';
  threshold?: number;
  splitCategoriesLeft?: string[];
  conditionLabel?: string;
  leftConditionText?: string;
  rightConditionText?: string;
  pathConditions: string[];
  businessExplanation: string;
  left?: TreeNode;
  right?: TreeNode;
}

export interface TreeRule {
  id: string;
  leafId: string;
  conditions: string[];
  predictedClass: string;
  samples: number;
  samplePct: number;
  confidencePct: number;
  businessSummary: string;
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number; // 0 to 1
  importancePct: number;
  splitCount: number;
  businessRole: string;
}

export interface ClassMetrics {
  className: string;
  support: number;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  precision: number;
  recall: number;
  f1: number;
  specificity: number;
}

export interface ModelEvaluation {
  classes: string[];
  confusionMatrix: number[][]; // [actualIdx][predictedIdx]
  testAccuracy: number;
  trainAccuracy: number;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  weightedPrecision: number;
  weightedRecall: number;
  weightedF1: number;
  avgSpecificity: number;
  classMetrics: ClassMetrics[];
  imbalanceWarning: string | null;
  overfittingStatus: 'equilibrado' | 'leve_sobreajuste' | 'sobreajuste_severo' | 'subajuste';
  overfittingMessage: string;
  testPredictions: {
    rowIndex: number;
    actual: string;
    predicted: string;
    confidence: number;
    correct: boolean;
    features: DataRow;
  }[];
}

export interface TreeMetricsSummary {
  nodeCount: number;
  leafCount: number;
  depth: number;
  trainAccuracy: number;
  testAccuracy: number;
  trainF1: number;
  testF1: number;
}

export interface TreeModelResult {
  id: string;
  params: TreeHyperparams;
  root: TreeNode;
  rules: TreeRule[];
  featureImportances: FeatureImportanceItem[];
  evaluation: ModelEvaluation;
  summary: TreeMetricsSummary;
  trainCount: number;
  testCount: number;
  trainClassDist: Record<string, number>;
  testClassDist: Record<string, number>;
  isOptimized: boolean;
  cvScore?: number;
}

export interface CVGridCandidate {
  params: TreeHyperparams;
  cvAccuracy: number;
  cvF1: number;
  trainAccuracy: number;
  nodeCount: number;
  leafCount: number;
  actualDepth: number;
  generalizationGap: number;
  compositeScore: number;
}

export interface PruningComparisonRow {
  label: string;
  method: string;
  params: TreeHyperparams;
  summary: TreeMetricsSummary;
  businessTradeoff: string;
}

export interface BusinessDiagnostic {
  whatIsHappening: string;
  patternsIdentified: string[];
  topVariablesExplanation: string;
  distinguishedProfiles: {
    title: string;
    targetClass: string;
    sharePct: number;
    confidencePct: number;
    characteristics: string;
  }[];
  categoryCharacteristics: {
    className: string;
    count: number;
    pct: number;
    summary: string;
  }[];
  modelReliability: string;
  modelErrors: string;
  businessOpportunities: string[];
  recommendedDecisions: string[];
}

export type StrategicLine =
  | 'Marketing'
  | 'Comunicación'
  | 'Fidelización'
  | 'Innovación'
  | 'Gestión comercial'
  | 'Operaciones';

export type MatrixQuadrant =
  | 'quick_wins'
  | 'strategic_initiatives'
  | 'complementary'
  | 'low_priority';

export interface StrategyItem {
  id: string;
  name: string;
  line: StrategicLine;
  findingJustification: string;
  businessObjective: string;
  impactScore: number; // 1-10 hypothesis
  effortScore: number; // 1-10 hypothesis
  impactLevel: 'Alto' | 'Bajo';
  effortLevel: 'Alto' | 'Bajo';
  quadrant: MatrixQuadrant;
  matrixRationale: string;
  kpi: string;
  horizon: 'Corto plazo (0-3 meses)' | 'Mediano plazo (3-6 meses)' | 'Largo plazo (6-12 meses)';
  owner: string;
  expectedBenefit: string;
}

export interface ExecutiveSummary {
  mainOpportunities: string[];
  topThreeStrategies: StrategyItem[];
  expectedBusinessBenefit: string;
  trackingIndicators: string[];
  implementationRoadmap: string[];
}
