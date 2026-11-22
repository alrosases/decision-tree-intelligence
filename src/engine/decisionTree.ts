import {
  CVGridCandidate,
  ClassMetrics,
  DataRow,
  FeatureImportanceItem,
  ModelEvaluation,
  PreparedDataset,
  PruningComparisonRow,
  SplitCriterion,
  TreeHyperparams,
  TreeNode,
  TreeRule,
  TreeModelResult,
  VariableMeta,
} from '../types/analytics';

interface InternalSample {
  row: DataRow;
  target: string;
  originalIdx: number;
}

function createRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const rng = createRng(seed);
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function stratifiedTrainTestSplit(
  rows: DataRow[],
  targetColumn: string,
  trainRatio = 0.7,
  seed = 42
): {
  trainSamples: InternalSample[];
  testSamples: InternalSample[];
  trainClassDist: Record<string, number>;
  testClassDist: Record<string, number>;
} {
  const byClass = new Map<string, InternalSample[]>();
  rows.forEach((row, idx) => {
    const t = String(row[targetColumn]);
    if (!byClass.has(t)) byClass.set(t, []);
    byClass.get(t)!.push({ row, target: t, originalIdx: idx });
  });

  const trainSamples: InternalSample[] = [];
  const testSamples: InternalSample[] = [];
  const trainClassDist: Record<string, number> = {};
  const testClassDist: Record<string, number> = {};

  let classIdx = 0;
  for (const [cls, list] of Array.from(byClass.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const shuffled = shuffleWithSeed(list, seed + classIdx * 101);
    classIdx++;
    let splitIdx = Math.round(shuffled.length * trainRatio);
    if (shuffled.length >= 2) {
      splitIdx = Math.max(1, Math.min(shuffled.length - 1, splitIdx));
    }
    const tr = shuffled.slice(0, splitIdx);
    const te = shuffled.slice(splitIdx);
    trainSamples.push(...tr);
    testSamples.push(...te);
    trainClassDist[cls] = tr.length;
    testClassDist[cls] = te.length;
  }

  return {
    trainSamples: shuffleWithSeed(trainSamples, seed + 7),
    testSamples: shuffleWithSeed(testSamples, seed + 13),
    trainClassDist,
    testClassDist,
  };
}

function calcImpurity(counts: Record<string, number>, total: number, criterion: SplitCriterion): number {
  if (total === 0) return 0;
  if (criterion === 'gini') {
    let sumSq = 0;
    for (const c of Object.values(counts)) {
      const p = c / total;
      sumSq += p * p;
    }
    return 1 - sumSq;
  } else {
    let ent = 0;
    for (const c of Object.values(counts)) {
      if (c > 0) {
        const p = c / total;
        ent -= p * Math.log2(p);
      }
    }
    return ent;
  }
}

function countClasses(samples: InternalSample[], classes: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of classes) counts[c] = 0;
  for (const s of samples) {
    counts[s.target] = (counts[s.target] ?? 0) + 1;
  }
  return counts;
}

function getMajorityClass(counts: Record<string, number>): { cls: string; count: number } {
  let bestCls = '';
  let bestCount = -1;
  for (const [cls, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count;
      bestCls = cls;
    }
  }
  return { cls: bestCls, count: bestCount };
}

interface CandidateSplit {
  feature: string;
  featureType: 'numeric' | 'categorical';
  threshold?: number;
  leftCategories?: string[];
  gain: number;
  weightedGain: number;
  leftSamples: InternalSample[];
  rightSamples: InternalSample[];
  leftConditionText: string;
  rightConditionText: string;
  conditionLabel: string;
}

function findBestSplit(
  samples: InternalSample[],
  predictors: string[],
  numericFeatures: Set<string>,
  classes: string[],
  criterion: SplitCriterion,
  minSamplesLeaf: number,
  totalTrainCount: number
): CandidateSplit | null {
  const n = samples.length;
  const parentCounts = countClasses(samples, classes);
  const parentImpurity = calcImpurity(parentCounts, n, criterion);
  if (parentImpurity <= 1e-9) return null;

  let best: CandidateSplit | null = null;

  for (const feature of predictors) {
    const isNum = numericFeatures.has(feature);

    if (isNum) {
      const pairs: { val: number; sample: InternalSample }[] = [];
      for (const s of samples) {
        const raw = s.row[feature];
        const num = typeof raw === 'number' ? raw : Number(raw);
        if (Number.isFinite(num)) {
          pairs.push({ val: num, sample: s });
        }
      }
      if (pairs.length < minSamplesLeaf * 2) continue;
      pairs.sort((a, b) => a.val - b.val);

      const leftCounts: Record<string, number> = {};
      const rightCounts: Record<string, number> = { ...parentCounts };
      for (const c of classes) leftCounts[c] = 0;

      for (let i = 0; i < pairs.length - 1; i++) {
        const cur = pairs[i];
        const next = pairs[i + 1];
        leftCounts[cur.sample.target] += 1;
        rightCounts[cur.sample.target] -= 1;

        const leftN = i + 1;
        const rightN = pairs.length - leftN;

        if (cur.val === next.val) continue;
        if (leftN < minSamplesLeaf || rightN < minSamplesLeaf) continue;

        const leftImp = calcImpurity(leftCounts, leftN, criterion);
        const rightImp = calcImpurity(rightCounts, rightN, criterion);
        const childImp = (leftN / pairs.length) * leftImp + (rightN / pairs.length) * rightImp;
        const gain = parentImpurity - childImp;

        if (gain > 1e-9 && (!best || gain > best.gain)) {
          const threshold = Number(((cur.val + next.val) / 2).toFixed(2));
          const leftSamples = pairs.slice(0, leftN).map((p) => p.sample);
          const rightSamples = pairs.slice(leftN).map((p) => p.sample);
          best = {
            feature,
            featureType: 'numeric',
            threshold,
            gain,
            weightedGain: (n / totalTrainCount) * gain,
            leftSamples,
            rightSamples,
            conditionLabel: `${feature} ≤ ${threshold}`,
            leftConditionText: `${feature} ≤ ${threshold}`,
            rightConditionText: `${feature} > ${threshold}`,
          };
        }
      }
    } else {
      // Categorical optimal subset / one-vs-rest split
      const catGroups = new Map<string, InternalSample[]>();
      for (const s of samples) {
        const key = String(s.row[feature] ?? 'Sin Dato');
        if (!catGroups.has(key)) catGroups.set(key, []);
        catGroups.get(key)!.push(s);
      }
      const categories = Array.from(catGroups.keys());
      if (categories.length < 2) continue;

      const candidateLeftSets: string[][] = [];
      if (categories.length <= 6) {
        // Exact non-empty proper subsets (half of 2^k to avoid duplicates)
        const limit = 1 << categories.length;
        for (let mask = 1; mask < limit / 2; mask++) {
          const subset: string[] = [];
          for (let b = 0; b < categories.length; b++) {
            if (mask & (1 << b)) subset.push(categories[b]);
          }
          candidateLeftSets.push(subset);
        }
      } else {
        // Sort categories by positive proportion for greedy ordered subsets + one-vs-rest
        const focusClass = classes[0];
        const sortedCats = [...categories].sort((a, b) => {
          const ga = catGroups.get(a)!;
          const gb = catGroups.get(b)!;
          const pa = ga.filter((s) => s.target === focusClass).length / ga.length;
          const pb = gb.filter((s) => s.target === focusClass).length / gb.length;
          return pa - pb;
        });
        for (let i = 1; i < sortedCats.length; i++) {
          candidateLeftSets.push(sortedCats.slice(0, i));
        }
        for (const cat of categories) {
          candidateLeftSets.push([cat]);
        }
      }

      for (const leftCats of candidateLeftSets) {
        const leftSet = new Set(leftCats);
        const leftSamples: InternalSample[] = [];
        const rightSamples: InternalSample[] = [];
        for (const s of samples) {
          const key = String(s.row[feature] ?? 'Sin Dato');
          if (leftSet.has(key)) leftSamples.push(s);
          else rightSamples.push(s);
        }

        if (leftSamples.length < minSamplesLeaf || rightSamples.length < minSamplesLeaf) {
          continue;
        }

        const lCounts = countClasses(leftSamples, classes);
        const rCounts = countClasses(rightSamples, classes);
        const lImp = calcImpurity(lCounts, leftSamples.length, criterion);
        const rImp = calcImpurity(rCounts, rightSamples.length, criterion);
        const childImp = (leftSamples.length / n) * lImp + (rightSamples.length / n) * rImp;
        const gain = parentImpurity - childImp;

        if (gain > 1e-9 && (!best || gain > best.gain)) {
          const rightCats = categories.filter((c) => !leftSet.has(c));
          const leftLabel =
            leftCats.length === 1
              ? `${feature} = "${leftCats[0]}"`
              : `${feature} ∈ {${leftCats.join(', ')}}`;
          const rightLabel =
            rightCats.length === 1
              ? `${feature} = "${rightCats[0]}"`
              : `${feature} ∈ {${rightCats.join(', ')}}`;
          best = {
            feature,
            featureType: 'categorical',
            leftCategories: leftCats,
            gain,
            weightedGain: (n / totalTrainCount) * gain,
            leftSamples,
            rightSamples,
            conditionLabel: leftLabel,
            leftConditionText: leftLabel,
            rightConditionText: rightLabel,
          };
        }
      }
    }
  }

  return best;
}

function buildBusinessNodeExplanation(
  node: {
    depth: number;
    isLeaf: boolean;
    samples: number;
    predictedClass: string;
    confidencePct: number;
    pathConditions: string[];
    feature?: string;
    conditionLabel?: string;
  },
  targetColumn: string
): string {
  const condText =
    node.pathConditions.length === 0
      ? 'Base completa de entrenamiento'
      : node.pathConditions.join(' y ');

  if (node.depth === 0) {
    if (node.isLeaf) {
      return `Nodo único: con ${node.samples} registros, la categoría predominante de ${targetColumn} es "${node.predictedClass}" (${node.confidencePct.toFixed(1)}%).`;
    }
    return `Punto de partida del modelo (${node.samples} registros). La primera gran diferenciación se produce mediante ${node.conditionLabel}, donde la clase mayoritaria inicial es "${node.predictedClass}" (${node.confidencePct.toFixed(1)}%).`;
  }

  if (node.isLeaf) {
    return `Segmento final (${node.samples} registros): cuando se cumple que ${condText}, el ${node.confidencePct.toFixed(1)}% de los casos corresponde a "${node.predictedClass}".`;
  }

  return `Subgrupo de ${node.samples} registros (${condText}): predomina "${node.predictedClass}" con ${node.confidencePct.toFixed(1)}%. El árbol continúa dividiendo por ${node.feature} para refinar la separación.`;
}

function cloneTree(node: TreeNode): TreeNode {
  return {
    ...node,
    classCounts: { ...node.classCounts },
    classProportions: { ...node.classProportions },
    pathConditions: [...node.pathConditions],
    splitCategoriesLeft: node.splitCategoriesLeft ? [...node.splitCategoriesLeft] : undefined,
    left: node.left ? cloneTree(node.left) : undefined,
    right: node.right ? cloneTree(node.right) : undefined,
  };
}

// Compute subtree stats for Breiman Cost-Complexity Pruning
function getSubtreeStats(node: TreeNode, totalTrainSamples: number): { leafCount: number; leafWeightedImpurity: number } {
  if (node.isLeaf || !node.left || !node.right) {
    return {
      leafCount: 1,
      leafWeightedImpurity: (node.samples / totalTrainSamples) * node.impurity,
    };
  }
  const l = getSubtreeStats(node.left, totalTrainSamples);
  const r = getSubtreeStats(node.right, totalTrainSamples);
  return {
    leafCount: l.leafCount + r.leafCount,
    leafWeightedImpurity: l.leafWeightedImpurity + r.leafWeightedImpurity,
  };
}

function collectInternalNodes(node: TreeNode, acc: TreeNode[] = []): TreeNode[] {
  if (!node.isLeaf && node.left && node.right) {
    acc.push(node);
    collectInternalNodes(node.left, acc);
    collectInternalNodes(node.right, acc);
  }
  return acc;
}

function applyCostComplexityPruning(root: TreeNode, ccpAlpha: number, totalTrainSamples: number, targetColumn: string): TreeNode {
  if (ccpAlpha <= 0) return root;
  const pruned = cloneTree(root);

  while (true) {
    const internals = collectInternalNodes(pruned);
    if (internals.length === 0) break;

    let weakestNode: TreeNode | null = null;
    let minAlpha = Infinity;

    for (const node of internals) {
      const stats = getSubtreeStats(node, totalTrainSamples);
      if (stats.leafCount <= 1) continue;
      const rNode = (node.samples / totalTrainSamples) * node.impurity;
      const effAlpha = (rNode - stats.leafWeightedImpurity) / (stats.leafCount - 1);
      if (effAlpha < minAlpha) {
        minAlpha = effAlpha;
        weakestNode = node;
      }
    }

    if (weakestNode && minAlpha <= ccpAlpha + 1e-12) {
      weakestNode.isLeaf = true;
      weakestNode.left = undefined;
      weakestNode.right = undefined;
      weakestNode.feature = undefined;
      weakestNode.featureType = undefined;
      weakestNode.threshold = undefined;
      weakestNode.splitCategoriesLeft = undefined;
      weakestNode.conditionLabel = undefined;
      weakestNode.businessExplanation = buildBusinessNodeExplanation(weakestNode, targetColumn);
    } else {
      break;
    }
  }

  return pruned;
}

function countLeaves(node: TreeNode): number {
  if (node.isLeaf || !node.left || !node.right) return 1;
  return countLeaves(node.left) + countLeaves(node.right);
}

function countNodes(node: TreeNode): number {
  if (node.isLeaf || !node.left || !node.right) return 1;
  return 1 + countNodes(node.left) + countNodes(node.right);
}

function getTreeDepth(node: TreeNode): number {
  if (node.isLeaf || !node.left || !node.right) return 0;
  return 1 + Math.max(getTreeDepth(node.left), getTreeDepth(node.right));
}

function enforceMaxLeafNodes(root: TreeNode, maxLeafNodes: number, targetColumn: string): TreeNode {
  if (maxLeafNodes <= 0) return root;
  const tree = cloneTree(root);

  // Prune deepest / lowest-impact internal nodes until leaf count <= maxLeafNodes
  while (countLeaves(tree) > maxLeafNodes) {
    const internals = collectInternalNodes(tree);
    // Pick internal node whose children are both leaves with smallest weighted impurity reduction
    const collapsible = internals.filter((n) => n.left?.isLeaf && n.right?.isLeaf);
    if (collapsible.length === 0) break;
    collapsible.sort((a, b) => {
      const gainA =
        a.samples * a.impurity -
        ((a.left?.samples ?? 0) * (a.left?.impurity ?? 0) +
          (a.right?.samples ?? 0) * (a.right?.impurity ?? 0));
      const gainB =
        b.samples * b.impurity -
        ((b.left?.samples ?? 0) * (b.left?.impurity ?? 0) +
          (b.right?.samples ?? 0) * (b.right?.impurity ?? 0));
      return gainA - gainB;
    });
    const victim = collapsible[0];
    victim.isLeaf = true;
    victim.left = undefined;
    victim.right = undefined;
    victim.feature = undefined;
    victim.conditionLabel = undefined;
    victim.businessExplanation = buildBusinessNodeExplanation(victim, targetColumn);
  }
  return tree;
}

function buildCartTree(
  trainSamples: InternalSample[],
  predictors: string[],
  numericFeatures: Set<string>,
  classes: string[],
  params: TreeHyperparams,
  targetColumn: string
): TreeNode {
  let nodeIdCounter = 1;
  const totalN = Math.max(1, trainSamples.length);

  const buildNode = (
    samples: InternalSample[],
    depth: number,
    pathConditions: string[]
  ): TreeNode => {
    const id = `N${nodeIdCounter++}`;
    const counts = countClasses(samples, classes);
    const n = samples.length;
    const proportions: Record<string, number> = {};
    for (const c of classes) {
      proportions[c] = n > 0 ? (counts[c] / n) * 100 : 0;
    }
    const maj = getMajorityClass(counts);
    const confidencePct = n > 0 ? (maj.count / n) * 100 : 0;
    const impurity = calcImpurity(counts, n, params.criterion);

    const canSplit =
      depth < params.maxDepth &&
      n >= params.minSamplesSplit &&
      impurity > 1e-9;

    let bestSplit: CandidateSplit | null = null;
    if (canSplit) {
      bestSplit = findBestSplit(
        samples,
        predictors,
        numericFeatures,
        classes,
        params.criterion,
        params.minSamplesLeaf,
        totalN
      );
    }

    if (!bestSplit) {
      const leaf: TreeNode = {
        id,
        depth,
        isLeaf: true,
        samples: n,
        impurity,
        classCounts: counts,
        classProportions: proportions,
        predictedClass: maj.cls,
        confidencePct,
        pathConditions,
        businessExplanation: '',
      };
      leaf.businessExplanation = buildBusinessNodeExplanation(leaf, targetColumn);
      return leaf;
    }

    const leftChild = buildNode(bestSplit.leftSamples, depth + 1, [
      ...pathConditions,
      bestSplit.leftConditionText,
    ]);
    const rightChild = buildNode(bestSplit.rightSamples, depth + 1, [
      ...pathConditions,
      bestSplit.rightConditionText,
    ]);

    const internal: TreeNode = {
      id,
      depth,
      isLeaf: false,
      samples: n,
      impurity,
      classCounts: counts,
      classProportions: proportions,
      predictedClass: maj.cls,
      confidencePct,
      feature: bestSplit.feature,
      featureType: bestSplit.featureType,
      threshold: bestSplit.threshold,
      splitCategoriesLeft: bestSplit.leftCategories,
      conditionLabel: bestSplit.conditionLabel,
      leftConditionText: bestSplit.leftConditionText,
      rightConditionText: bestSplit.rightConditionText,
      pathConditions,
      businessExplanation: '',
      left: leftChild,
      right: rightChild,
    };
    internal.businessExplanation = buildBusinessNodeExplanation(internal, targetColumn);
    return internal;
  };

  let root = buildNode(trainSamples, 0, []);
  if (params.maxLeafNodes > 0) {
    root = enforceMaxLeafNodes(root, params.maxLeafNodes, targetColumn);
  }
  if (params.ccpAlpha > 0) {
    root = applyCostComplexityPruning(root, params.ccpAlpha, totalN, targetColumn);
  }
  return root;
}

export function predictSingleRow(
  root: TreeNode,
  row: DataRow
): { predictedClass: string; confidencePct: number; leafId: string } {
  let curr = root;
  while (!curr.isLeaf && curr.left && curr.right && curr.feature) {
    if (curr.featureType === 'numeric' && curr.threshold !== undefined) {
      const raw = row[curr.feature];
      const num = typeof raw === 'number' ? raw : Number(raw);
      if (Number.isFinite(num) && num <= curr.threshold) {
        curr = curr.left;
      } else {
        curr = curr.right;
      }
    } else if (curr.featureType === 'categorical' && curr.splitCategoriesLeft) {
      const val = String(row[curr.feature] ?? 'Sin Dato');
      if (curr.splitCategoriesLeft.includes(val)) {
        curr = curr.left;
      } else {
        curr = curr.right;
      }
    } else {
      break;
    }
  }
  return {
    predictedClass: curr.predictedClass,
    confidencePct: curr.confidencePct,
    leafId: curr.id,
  };
}

function extractRules(root: TreeNode, totalSamples: number): TreeRule[] {
  const rules: TreeRule[] = [];
  let idx = 1;
  const walk = (node: TreeNode) => {
    if (node.isLeaf || !node.left || !node.right) {
      rules.push({
        id: `R${idx++}`,
        leafId: node.id,
        conditions: node.pathConditions,
        predictedClass: node.predictedClass,
        samples: node.samples,
        samplePct: totalSamples > 0 ? (node.samples / totalSamples) * 100 : 0,
        confidencePct: node.confidencePct,
        businessSummary: node.businessExplanation,
      });
      return;
    }
    walk(node.left);
    walk(node.right);
  };
  walk(root);
  return rules.sort((a, b) => b.samples - a.samples);
}

function computeFeatureImportances(
  root: TreeNode,
  predictors: string[],
  totalTrainSamples: number
): FeatureImportanceItem[] {
  const gainMap: Record<string, number> = {};
  const splitCounts: Record<string, number> = {};
  for (const p of predictors) {
    gainMap[p] = 0;
    splitCounts[p] = 0;
  }

  const walk = (node: TreeNode) => {
    if (node.isLeaf || !node.left || !node.right || !node.feature) return;
    const weightedGain =
      (node.samples / Math.max(1, totalTrainSamples)) *
      (node.impurity -
        (node.left.samples / node.samples) * node.left.impurity -
        (node.right.samples / node.samples) * node.right.impurity);
    gainMap[node.feature] = (gainMap[node.feature] ?? 0) + Math.max(0, weightedGain);
    splitCounts[node.feature] = (splitCounts[node.feature] ?? 0) + 1;
    walk(node.left);
    walk(node.right);
  };
  walk(root);

  const totalGain = Object.values(gainMap).reduce((a, b) => a + b, 0);

  return predictors
    .map((f) => {
      const imp = totalGain > 0 ? gainMap[f] / totalGain : 0;
      const pct = imp * 100;
      let businessRole = 'Aporte marginal o nulo en este árbol.';
      if (pct >= 30) {
        businessRole = 'Factor predictor principal que estructura las decisiones iniciales del árbol.';
      } else if (pct >= 12) {
        businessRole = 'Factor secundario relevante para refinar perfiles y subsegmentos.';
      } else if (pct > 0) {
        businessRole = 'Variable complementaria usada en ramificaciones específicas.';
      }
      return {
        feature: f,
        importance: imp,
        importancePct: pct,
        splitCount: splitCounts[f] ?? 0,
        businessRole,
      };
    })
    .sort((a, b) => b.importance - a.importance);
}

export function evaluatePredictions(
  root: TreeNode,
  trainSamples: InternalSample[],
  testSamples: InternalSample[],
  classes: string[]
): ModelEvaluation {
  const classToIdx = new Map<string, number>();
  classes.forEach((c, i) => classToIdx.set(c, i));

  const k = classes.length;
  const cm: number[][] = Array.from({ length: k }, () => Array(k).fill(0));

  let trainCorrect = 0;
  for (const s of trainSamples) {
    const pred = predictSingleRow(root, s.row);
    if (pred.predictedClass === s.target) trainCorrect++;
  }
  const trainAccuracy = trainSamples.length > 0 ? trainCorrect / trainSamples.length : 0;

  let testCorrect = 0;
  const testPredictions: ModelEvaluation['testPredictions'] = [];

  for (const s of testSamples) {
    const pred = predictSingleRow(root, s.row);
    const aIdx = classToIdx.get(s.target) ?? 0;
    const pIdx = classToIdx.get(pred.predictedClass) ?? 0;
    cm[aIdx][pIdx] += 1;
    const correct = pred.predictedClass === s.target;
    if (correct) testCorrect++;
    testPredictions.push({
      rowIndex: s.originalIdx + 1,
      actual: s.target,
      predicted: pred.predictedClass,
      confidence: pred.confidencePct,
      correct,
      features: s.row,
    });
  }

  const totalTest = Math.max(1, testSamples.length);
  const testAccuracy = testCorrect / totalTest;

  const classMetrics: ClassMetrics[] = classes.map((cls, i) => {
    const tp = cm[i][i];
    const fn = cm[i].reduce((sum, val, j) => (j !== i ? sum + val : sum), 0);
    const fp = cm.reduce((sum, row, r) => (r !== i ? sum + row[i] : sum), 0);
    const tn = totalTest - tp - fn - fp;
    const support = tp + fn;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const specificity = tn + fp > 0 ? tn / (tn + fp) : 0;

    return {
      className: cls,
      support,
      tp,
      fp,
      tn,
      fn,
      precision,
      recall,
      f1,
      specificity,
    };
  });

  const macroPrecision =
    classMetrics.reduce((s, m) => s + m.precision, 0) / Math.max(1, classMetrics.length);
  const macroRecall =
    classMetrics.reduce((s, m) => s + m.recall, 0) / Math.max(1, classMetrics.length);
  const macroF1 =
    classMetrics.reduce((s, m) => s + m.f1, 0) / Math.max(1, classMetrics.length);
  const avgSpecificity =
    classMetrics.reduce((s, m) => s + m.specificity, 0) / Math.max(1, classMetrics.length);

  const weightedPrecision =
    classMetrics.reduce((s, m) => s + m.precision * m.support, 0) / totalTest;
  const weightedRecall =
    classMetrics.reduce((s, m) => s + m.recall * m.support, 0) / totalTest;
  const weightedF1 =
    classMetrics.reduce((s, m) => s + m.f1 * m.support, 0) / totalTest;

  // Check class imbalance
  const supports = classMetrics.map((m) => m.support);
  const maxSup = Math.max(...supports);
  const minSup = Math.max(1, Math.min(...supports));
  const maxPct = (maxSup / totalTest) * 100;
  let imbalanceWarning: string | null = null;
  if (maxPct >= 70 || maxSup / minSup >= 2.8) {
    const domClass = classMetrics.find((m) => m.support === maxSup)?.className ?? '';
    imbalanceWarning = `Desbalance de clases detectado: la categoría "${domClass}" concentra el ${maxPct.toFixed(1)}% del conjunto de prueba. En estos escenarios, el Accuracy aislado puede resultar engañoso; priorice Recall y F1-score de las clases minoritarias.`;
  }

  // Overfitting check
  const gap = trainAccuracy - testAccuracy;
  let overfittingStatus: ModelEvaluation['overfittingStatus'] = 'equilibrado';
  let overfittingMessage = '';

  if (testAccuracy < 0.58 && trainAccuracy < 0.62) {
    overfittingStatus = 'subajuste';
    overfittingMessage = `Posible subajuste: tanto el desempeño en entrenamiento (${(trainAccuracy * 100).toFixed(1)}%) como en prueba (${(testAccuracy * 100).toFixed(1)}%) son moderados o bajos. Considere permitir mayor profundidad o revisar variables predictoras.`;
  } else if (gap > 0.12) {
    overfittingStatus = 'sobreajuste_severo';
    overfittingMessage = `Señal de sobreajuste relevante: el entrenamiento alcanza ${(trainAccuracy * 100).toFixed(1)}% frente a ${(testAccuracy * 100).toFixed(1)}% en prueba (brecha de ${(gap * 100).toFixed(1)} pp). Se recomienda podar el árbol reduciendo la profundidad máxima o aumentando ccp_alpha.`;
  } else if (gap > 0.06) {
    overfittingStatus = 'leve_sobreajuste';
    overfittingMessage = `Brecha moderada entre entrenamiento (${(trainAccuracy * 100).toFixed(1)}%) y prueba (${(testAccuracy * 100).toFixed(1)}%). Una poda ligera puede mejorar la estabilidad en datos nuevos.`;
  } else {
    overfittingStatus = 'equilibrado';
    overfittingMessage = `Buena capacidad de generalización: la diferencia entre entrenamiento (${(trainAccuracy * 100).toFixed(1)}%) y prueba (${(testAccuracy * 100).toFixed(1)}%) es de apenas ${(Math.abs(gap) * 100).toFixed(1)} puntos porcentuales.`;
  }

  return {
    classes,
    confusionMatrix: cm,
    testAccuracy,
    trainAccuracy,
    macroPrecision,
    macroRecall,
    macroF1,
    weightedPrecision,
    weightedRecall,
    weightedF1,
    avgSpecificity,
    classMetrics,
    imbalanceWarning,
    overfittingStatus,
    overfittingMessage,
    testPredictions,
  };
}

function calcWeightedF1(samples: InternalSample[], root: TreeNode, classes: string[]): number {
  const k = classes.length;
  const classToIdx = new Map<string, number>();
  classes.forEach((c, i) => classToIdx.set(c, i));
  const cm = Array.from({ length: k }, () => Array(k).fill(0));
  for (const s of samples) {
    const pred = predictSingleRow(root, s.row);
    cm[classToIdx.get(s.target) ?? 0][classToIdx.get(pred.predictedClass) ?? 0] += 1;
  }
  let weightedF1 = 0;
  const total = Math.max(1, samples.length);
  for (let i = 0; i < k; i++) {
    const tp = cm[i][i];
    const fn = cm[i].reduce((sum, v, j) => (j !== i ? sum + v : sum), 0);
    const fp = cm.reduce((sum, row, r) => (r !== i ? sum + row[i] : sum), 0);
    const sup = tp + fn;
    const p = tp + fp > 0 ? tp / (tp + fp) : 0;
    const r = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = p + r > 0 ? (2 * p * r) / (p + r) : 0;
    weightedF1 += f1 * sup;
  }
  return weightedF1 / total;
}

export function trainDecisionTreeModel(
  prepared: PreparedDataset,
  variables: VariableMeta[],
  params: TreeHyperparams,
  options?: { isOptimized?: boolean; cvScore?: number }
): TreeModelResult {
  const numericSet = new Set(
    variables
      .filter((v) => v.type.startsWith('numeric_'))
      .map((v) => v.name)
  );

  const { trainSamples, testSamples, trainClassDist, testClassDist } =
    stratifiedTrainTestSplit(prepared.rows, prepared.targetColumn, 0.7, 42);

  const root = buildCartTree(
    trainSamples,
    prepared.predictorColumns,
    numericSet,
    prepared.classes,
    params,
    prepared.targetColumn
  );

  const evaluation = evaluatePredictions(root, trainSamples, testSamples, prepared.classes);
  const trainF1 = calcWeightedF1(trainSamples, root, prepared.classes);
  const rules = extractRules(root, trainSamples.length);
  const featureImportances = computeFeatureImportances(
    root,
    prepared.predictorColumns,
    trainSamples.length
  );

  return {
    id: `tree_${Date.now()}`,
    params,
    root,
    rules,
    featureImportances,
    evaluation,
    summary: {
      nodeCount: countNodes(root),
      leafCount: countLeaves(root),
      depth: getTreeDepth(root),
      trainAccuracy: evaluation.trainAccuracy,
      testAccuracy: evaluation.testAccuracy,
      trainF1,
      testF1: evaluation.weightedF1,
    },
    trainCount: trainSamples.length,
    testCount: testSamples.length,
    trainClassDist,
    testClassDist,
    isOptimized: Boolean(options?.isOptimized),
    cvScore: options?.cvScore,
  };
}

export function optimizeTreeWithCV(
  prepared: PreparedDataset,
  variables: VariableMeta[]
): { bestParams: TreeHyperparams; candidates: CVGridCandidate[] } {
  const numericSet = new Set(
    variables.filter((v) => v.type.startsWith('numeric_')).map((v) => v.name)
  );

  const { trainSamples } = stratifiedTrainTestSplit(
    prepared.rows,
    prepared.targetColumn,
    0.7,
    42
  );

  // Build 5 stratified folds inside trainSamples only
  const kFolds = 5;
  const folds: InternalSample[][] = Array.from({ length: kFolds }, () => []);
  const byClass = new Map<string, InternalSample[]>();
  for (const s of trainSamples) {
    if (!byClass.has(s.target)) byClass.set(s.target, []);
    byClass.get(s.target)!.push(s);
  }
  for (const list of byClass.values()) {
    list.forEach((s, idx) => {
      folds[idx % kFolds].push(s);
    });
  }

  const candidateGrid: TreeHyperparams[] = [];
  const criteria: SplitCriterion[] = ['gini', 'entropy'];
  const depths = [3, 4, 5, 6];
  const minLeaves = [
    Math.max(3, Math.round(trainSamples.length * 0.015)),
    Math.max(5, Math.round(trainSamples.length * 0.03)),
  ];
  const alphas = [0, 0.005, 0.012];

  for (const criterion of criteria) {
    for (const maxDepth of depths) {
      for (const minSamplesLeaf of minLeaves) {
        for (const ccpAlpha of alphas) {
          candidateGrid.push({
            criterion,
            maxDepth,
            minSamplesSplit: Math.max(2, minSamplesLeaf * 2),
            minSamplesLeaf,
            maxLeafNodes: 0,
            ccpAlpha,
          });
        }
      }
    }
  }

  const results: CVGridCandidate[] = [];

  for (const params of candidateGrid) {
    let sumValAcc = 0;
    let sumValF1 = 0;
    let sumTrainAcc = 0;

    for (let f = 0; f < kFolds; f++) {
      const valFold = folds[f];
      const trFold: InternalSample[] = [];
      for (let j = 0; j < kFolds; j++) {
        if (j !== f) trFold.push(...folds[j]);
      }
      const tree = buildCartTree(
        trFold,
        prepared.predictorColumns,
        numericSet,
        prepared.classes,
        params,
        prepared.targetColumn
      );

      let valCorrect = 0;
      for (const s of valFold) {
        if (predictSingleRow(tree, s.row).predictedClass === s.target) valCorrect++;
      }
      let trCorrect = 0;
      for (const s of trFold) {
        if (predictSingleRow(tree, s.row).predictedClass === s.target) trCorrect++;
      }
      sumValAcc += valCorrect / Math.max(1, valFold.length);
      sumValF1 += calcWeightedF1(valFold, tree, prepared.classes);
      sumTrainAcc += trCorrect / Math.max(1, trFold.length);
    }

    const cvAccuracy = sumValAcc / kFolds;
    const cvF1 = sumValF1 / kFolds;
    const trainAccuracy = sumTrainAcc / kFolds;
    const fullTrainTree = buildCartTree(
      trainSamples,
      prepared.predictorColumns,
      numericSet,
      prepared.classes,
      params,
      prepared.targetColumn
    );
    const nodeCount = countNodes(fullTrainTree);
    const leafCount = countLeaves(fullTrainTree);
    const actualDepth = getTreeDepth(fullTrainTree);
    const gap = Math.max(0, trainAccuracy - cvAccuracy);

    // Penalize excessive complexity and overfitting gap to encourage interpretable, well-generalizing trees
    const complexityPenalty = Math.max(0, leafCount - 8) * 0.0025;
    const gapPenalty = gap * 0.35;
    const compositeScore = cvF1 - complexityPenalty - gapPenalty;

    results.push({
      params,
      cvAccuracy,
      cvF1,
      trainAccuracy,
      nodeCount,
      leafCount,
      actualDepth,
      generalizationGap: gap,
      compositeScore,
    });
  }

  results.sort((a, b) => b.compositeScore - a.compositeScore);
  return {
    bestParams: results[0].params,
    candidates: results.slice(0, 10),
  };
}

export function buildPruningComparison(
  prepared: PreparedDataset,
  variables: VariableMeta[],
  baseParams: TreeHyperparams
): PruningComparisonRow[] {
  const unprunedParams: TreeHyperparams = {
    criterion: baseParams.criterion,
    maxDepth: 10,
    minSamplesSplit: 2,
    minSamplesLeaf: 1,
    maxLeafNodes: 0,
    ccpAlpha: 0,
  };

  const depthPrunedParams: TreeHyperparams = {
    ...unprunedParams,
    maxDepth: 3,
    minSamplesLeaf: Math.max(4, baseParams.minSamplesLeaf),
  };

  const leafPrunedParams: TreeHyperparams = {
    ...unprunedParams,
    maxDepth: 6,
    minSamplesLeaf: Math.max(15, Math.round(prepared.rows.length * 0.04)),
    minSamplesSplit: Math.max(30, Math.round(prepared.rows.length * 0.08)),
  };

  const ccpPrunedParams: TreeHyperparams = {
    ...unprunedParams,
    maxDepth: 6,
    minSamplesLeaf: Math.max(5, baseParams.minSamplesLeaf),
    ccpAlpha: baseParams.ccpAlpha > 0 ? baseParams.ccpAlpha : 0.012,
  };

  const variants: { label: string; method: string; params: TreeHyperparams; tradeoff: string }[] = [
    {
      label: 'Árbol original (sin poda)',
      method: 'Crecimiento libre (profundidad máxima 10)',
      params: unprunedParams,
      tradeoff: 'Maximiza el ajuste sobre entrenamiento, pero genera reglas fragmentadas y alto riesgo de memorizar ruido.',
    },
    {
      label: 'Poda por profundidad máxima',
      method: `max_depth = ${depthPrunedParams.maxDepth}`,
      params: depthPrunedParams,
      tradeoff: 'Simplifica drásticamente las reglas de decisión; resulta muy fácil de comunicar e implementar en equipos comerciales.',
    },
    {
      label: 'Poda por mínimo de registros por hoja',
      method: `min_samples_leaf = ${leafPrunedParams.minSamplesLeaf}`,
      params: leafPrunedParams,
      tradeoff: 'Evita hojas pequeñas poco representativas, asegurando que cada perfil identificado tenga volumen estadístico relevante.',
    },
    {
      label: 'Poda por complejidad de costo (CCP)',
      method: `ccp_alpha = ${ccpPrunedParams.ccpAlpha.toFixed(3)}`,
      params: ccpPrunedParams,
      tradeoff: 'Elimina únicamente las ramas cuyo aporte predictivo no compensa la complejidad añadida, logrando un equilibrio técnico óptimo.',
    },
  ];

  return variants.map((v) => {
    const model = trainDecisionTreeModel(prepared, variables, v.params);
    return {
      label: v.label,
      method: v.method,
      params: v.params,
      summary: model.summary,
      businessTradeoff: v.tradeoff,
    };
  });
}
