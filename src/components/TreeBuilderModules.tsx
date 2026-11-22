import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  GitBranch,
  RotateCcw,
  Scissors,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  AppSectionId,
  CVGridCandidate,
  PruningComparisonRow,
  SplitCriterion,
  TreeHyperparams,
  TreeModelResult,
  TreeNode,
} from '../types/analytics';

interface TreeBuilderProps {
  model: TreeModelResult;
  params: TreeHyperparams;
  cvCandidates: CVGridCandidate[];
  onTrainWithParams: (nextParams: TreeHyperparams) => void;
  onRunAutoOptimize: () => void;
  onNavigate: (sec: AppSectionId) => void;
}

interface PositionedNode {
  node: TreeNode;
  x: number;
  y: number;
  parentX?: number;
  parentY?: number;
  branchText?: string;
}

function layoutTreeSVG(root: TreeNode): {
  nodes: PositionedNode[];
  width: number;
  height: number;
} {
  const leafCount = (n: TreeNode): number =>
    n.isLeaf || !n.left || !n.right ? 1 : leafCount(n.left) + leafCount(n.right);
  const depthCount = (n: TreeNode): number =>
    n.isLeaf || !n.left || !n.right ? 0 : 1 + Math.max(depthCount(n.left), depthCount(n.right));

  const leaves = Math.max(1, leafCount(root));
  const maxD = depthCount(root);
  const nodeW = 190;
  const nodeH = 78;
  const hGap = 24;
  const vGap = 92;

  const width = Math.max(820, leaves * (nodeW + hGap) + 60);
  const height = Math.max(380, (maxD + 1) * (nodeH + vGap) + 40);

  const nodes: PositionedNode[] = [];
  let cursor = 0;

  const walk = (node: TreeNode, depth: number): number => {
    const y = 30 + depth * (nodeH + vGap);
    if (node.isLeaf || !node.left || !node.right) {
      const x = 30 + cursor * (nodeW + hGap) + nodeW / 2;
      cursor++;
      nodes.push({ node, x, y });
      return x;
    }
    const lx = walk(node.left, depth + 1);
    const rx = walk(node.right, depth + 1);
    const x = (lx + rx) / 2;
    const lc = nodes.find((item) => item.node.id === node.left!.id);
    const rc = nodes.find((item) => item.node.id === node.right!.id);
    if (lc) {
      lc.parentX = x;
      lc.parentY = y + nodeH;
      lc.branchText = 'Sí';
    }
    if (rc) {
      rc.parentX = x;
      rc.parentY = y + nodeH;
      rc.branchText = 'No';
    }
    nodes.push({ node, x, y });
    return x;
  };

  walk(root, 0);
  return { nodes, width, height };
}

export const TreeBuilderModule: React.FC<TreeBuilderProps> = ({
  model,
  params,
  cvCandidates,
  onTrainWithParams,
  onRunAutoOptimize,
  onNavigate,
}) => {
  const [localParams, setLocalParams] = useState<TreeHyperparams>(params);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(model.root.id);
  const [zoom, setZoom] = useState<number>(1);

  const treeLayout = useMemo(() => layoutTreeSVG(model.root), [model.root]);

  const selectedNode = useMemo(() => {
    return (
      treeLayout.nodes.find((n) => n.node.id === selectedNodeId)?.node ??
      model.root
    );
  }, [treeLayout, selectedNodeId, model.root]);

  const totalTrainTest = model.trainCount + model.testCount;
  const trainPct = totalTrainTest > 0 ? (model.trainCount / totalTrainTest) * 100 : 70;
  const testPct = 100 - trainPct;

  return (
    <div className="space-y-6">
      {/* 70/30 Stratified Split Explanation */}
      <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#F3F7F4]">
              Entrenamiento y División Estratificada 70% / 30%
            </h2>
            <p className="text-[13px] text-[#A1B2AA] mt-1">
              El modelo aprende patrones exclusivamente con el <strong className="text-[#F3F7F4]">70% de entrenamiento ({model.trainCount} registros)</strong> y se valida con el <strong className="text-[#F3F7F4]">30% de prueba ({model.testCount} registros)</strong> que nunca vio durante el aprendizaje, evitando evaluaciones engañosas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('pruning')}
            className="px-4 py-2 rounded-md bg-[#18221F] border border-[#2B3B35] hover:border-[#10B981] text-[13px] font-medium text-[#F3F7F4] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <span>Comparar poda</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="h-5 bg-[#101715] rounded overflow-hidden flex text-[11px] font-mono font-semibold text-[#101715]">
            <div
              className="bg-[#10B981] flex items-center justify-center"
              style={{ width: `${trainPct}%` }}
            >
              Entrenamiento: {trainPct.toFixed(0)}% ({model.trainCount})
            </div>
            <div
              className="bg-[#2DD4BF] flex items-center justify-center"
              style={{ width: `${testPct}%` }}
            >
              Prueba: {testPct.toFixed(0)}% ({model.testCount})
            </div>
          </div>
          <div className="flex flex-wrap gap-6 text-[12px] text-[#A1B2AA]">
            {model.evaluation.classes.map((cls) => {
              const tr = model.trainClassDist[cls] ?? 0;
              const te = model.testClassDist[cls] ?? 0;
              return (
                <div key={cls}>
                  <span className="text-[#F3F7F4] font-medium">{cls}:</span>{' '}
                  <span className="font-mono tabular-nums">
                    {tr} entreno ({((tr / Math.max(1, model.trainCount)) * 100).toFixed(1)}%) · {te} prueba ({((te / Math.max(1, model.testCount)) * 100).toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hyperparameter Controls + Auto-CV Optimization */}
      <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2B3B35] pb-4">
          <div>
            <h3 className="text-[16px] font-semibold text-[#F3F7F4]">
              Construcción y Parámetros del Árbol de Decisión
            </h3>
            <p className="text-[12px] text-[#A1B2AA] mt-0.5">
              Ajuste los criterios manualmente o ejecute la búsqueda automática con validación cruzada de 5 pliegues para equilibrar precisión y simplicidad.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onRunAutoOptimize}
              className="px-4 py-2 rounded-md bg-[#2DD4BF]/15 border border-[#2DD4BF]/50 text-[#2DD4BF] text-[13px] font-semibold hover:bg-[#2DD4BF]/25 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              <span>Optimización automática (CV 5-Fold)</span>
            </button>
            <button
              type="button"
              onClick={() => onTrainWithParams(localParams)}
              className="px-4 py-2 rounded-md bg-[#10B981] text-[#101715] text-[13px] font-semibold hover:bg-[#2DD4BF] transition-colors whitespace-nowrap"
            >
              Entrenar con estos parámetros
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="param-criterion" className="block text-[12px] font-medium text-[#A1B2AA]">
              Criterio de división
            </label>
            <select
              id="param-criterion"
              value={localParams.criterion}
              onChange={(e) =>
                setLocalParams({ ...localParams, criterion: e.target.value as SplitCriterion })
              }
              className="w-full bg-[#18221F] border border-[#2B3B35] rounded px-3 py-2 text-[13px] text-[#F3F7F4]"
            >
              <option value="gini">Índice de Gini (estándar CART)</option>
              <option value="entropy">Entropía / Ganancia de información</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[12px]">
              <label htmlFor="param-depth" className="text-[#A1B2AA]">Profundidad máxima</label>
              <span className="font-mono text-[#10B981]">{localParams.maxDepth}</span>
            </div>
            <input
              id="param-depth"
              type="range"
              min={1}
              max={10}
              value={localParams.maxDepth}
              onChange={(e) =>
                setLocalParams({ ...localParams, maxDepth: Number(e.target.value) })
              }
              className="w-full accent-[#10B981]"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[12px]">
              <label htmlFor="param-min-split" className="text-[#A1B2AA]">Mín. registros para dividir</label>
              <span className="font-mono text-[#10B981]">{localParams.minSamplesSplit}</span>
            </div>
            <input
              id="param-min-split"
              type="range"
              min={2}
              max={60}
              value={localParams.minSamplesSplit}
              onChange={(e) =>
                setLocalParams({ ...localParams, minSamplesSplit: Number(e.target.value) })
              }
              className="w-full accent-[#10B981]"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[12px]">
              <label htmlFor="param-min-leaf" className="text-[#A1B2AA]">Mín. registros por hoja</label>
              <span className="font-mono text-[#10B981]">{localParams.minSamplesLeaf}</span>
            </div>
            <input
              id="param-min-leaf"
              type="range"
              min={1}
              max={50}
              value={localParams.minSamplesLeaf}
              onChange={(e) =>
                setLocalParams({ ...localParams, minSamplesLeaf: Number(e.target.value) })
              }
              className="w-full accent-[#10B981]"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[12px]">
              <label htmlFor="param-max-leaves" className="text-[#A1B2AA]">Máx. hojas (0 = libre)</label>
              <span className="font-mono text-[#10B981]">{localParams.maxLeafNodes}</span>
            </div>
            <input
              id="param-max-leaves"
              type="range"
              min={0}
              max={24}
              value={localParams.maxLeafNodes}
              onChange={(e) =>
                setLocalParams({ ...localParams, maxLeafNodes: Number(e.target.value) })
              }
              className="w-full accent-[#10B981]"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[12px]">
              <label htmlFor="param-alpha" className="text-[#A1B2AA]">Poda complejidad (ccp_alpha)</label>
              <span className="font-mono text-[#10B981]">{localParams.ccpAlpha.toFixed(3)}</span>
            </div>
            <input
              id="param-alpha"
              type="range"
              min={0}
              max={0.04}
              step={0.002}
              value={localParams.ccpAlpha}
              onChange={(e) =>
                setLocalParams({ ...localParams, ccpAlpha: Number(e.target.value) })
              }
              className="w-full accent-[#10B981]"
            />
          </div>
        </div>

        {cvCandidates.length > 0 && (
          <div className="pt-2 space-y-2">
            <div className="text-[12px] font-semibold text-[#2DD4BF]">
              Resultados de optimización por validación cruzada (Top 5 configuraciones equilibradas)
            </div>
            <div className="overflow-x-auto border border-[#2B3B35] rounded-md">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#18221F] border-b border-[#2B3B35] text-[#A1B2AA]">
                    <th className="px-3 py-2">Criterio</th>
                    <th className="px-3 py-2 text-right">Prof. Máx</th>
                    <th className="px-3 py-2 text-right">Mín. Hoja</th>
                    <th className="px-3 py-2 text-right">ccp_alpha</th>
                    <th className="px-3 py-2 text-right">Hojas</th>
                    <th className="px-3 py-2 text-right">CV Accuracy</th>
                    <th className="px-3 py-2 text-right">CV F1</th>
                    <th className="px-3 py-2 text-right">Brecha Train-CV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2B3B35]">
                  {cvCandidates.slice(0, 5).map((c, idx) => (
                    <tr
                      key={idx}
                      onClick={() => {
                        setLocalParams(c.params);
                        onTrainWithParams(c.params);
                      }}
                      className={`cursor-pointer hover:bg-[#18221F] ${
                        idx === 0 ? 'bg-[#10B981]/10' : ''
                      }`}
                    >
                      <td className="px-3 py-2 font-medium text-[#F3F7F4]">
                        {c.params.criterion.toUpperCase()} {idx === 0 ? '· Óptima' : ''}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{c.params.maxDepth}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{c.params.minSamplesLeaf}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{c.params.ccpAlpha.toFixed(3)}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{c.leafCount}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-[#10B981]">
                        {(c.cvAccuracy * 100).toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-[#2DD4BF]">
                        {(c.cvF1 * 100).toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {(c.generalizationGap * 100).toFixed(1)} pp
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Tree Explorer + Business Node Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 bg-[#202C27] border border-[#2B3B35] rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-[#F3F7F4] flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-[#10B981]" />
                <span>Explorador Interactivo del Árbol (clic en cualquier nodo)</span>
              </h3>
              <p className="text-[12px] text-[#A1B2AA]">
                {model.summary.nodeCount} nodos · {model.summary.leafCount} hojas · Profundidad {model.summary.depth} · Accuracy prueba {(model.evaluation.testAccuracy * 100).toFixed(1)}%
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-[#18221F] border border-[#2B3B35] rounded-md p-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.55, Number((z - 0.15).toFixed(2))))}
                className="p-1.5 text-[#A1B2AA] hover:text-[#F3F7F4]"
                aria-label="Reducir árbol"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono tabular-nums px-1.5 text-[#F3F7F4]">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.15).toFixed(2))))}
                className="p-1.5 text-[#A1B2AA] hover:text-[#F3F7F4]"
                aria-label="Ampliar árbol"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="p-1.5 text-[#A1B2AA] hover:text-[#F3F7F4]"
                aria-label="Restablecer zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-auto bg-[#101715] border border-[#2B3B35] rounded-md max-h-[540px] p-3">
            <svg
              width={treeLayout.width * zoom}
              height={treeLayout.height * zoom}
              viewBox={`0 0 ${treeLayout.width} ${treeLayout.height}`}
              className="mx-auto"
            >
              {/* Branches */}
              {treeLayout.nodes.map((item) => {
                if (item.parentX === undefined || item.parentY === undefined) return null;
                const midX = (item.parentX + item.x) / 2;
                const midY = (item.parentY + item.y) / 2;
                return (
                  <g key={`edge_${item.node.id}`}>
                    <path
                      d={`M ${item.parentX} ${item.parentY} C ${item.parentX} ${midY}, ${item.x} ${midY}, ${item.x} ${item.y}`}
                      fill="none"
                      stroke="#3A4F47"
                      strokeWidth="1.8"
                    />
                    {item.branchText && (
                      <text
                        x={midX}
                        y={midY - 4}
                        textAnchor="middle"
                        fill="#A1B2AA"
                        fontSize="10"
                        fontFamily="Manrope, sans-serif"
                      >
                        {item.branchText}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {treeLayout.nodes.map(({ node, x, y }) => {
                const isSelected = node.id === selectedNode.id;
                const w = 190;
                const h = 78;
                const left = x - w / 2;
                const stroke = isSelected
                  ? '#A3E635'
                  : node.isLeaf
                  ? '#10B981'
                  : '#2DD4BF';
                const fill = isSelected
                  ? '#24352E'
                  : node.isLeaf
                  ? '#152520'
                  : '#1C2824';

                const headerText = node.isLeaf
                  ? `Hoja: ${node.predictedClass}`
                  : node.conditionLabel ?? '';

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={left}
                      y={y}
                      width={w}
                      height={h}
                      rx={6}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isSelected ? 2.4 : 1.3}
                    />
                    <text
                      x={x}
                      y={y + 20}
                      textAnchor="middle"
                      fill="#F3F7F4"
                      fontSize="11"
                      fontWeight="700"
                      fontFamily="Manrope, sans-serif"
                    >
                      {headerText.length > 26 ? headerText.slice(0, 24) + '…' : headerText}
                    </text>
                    <text
                      x={x}
                      y={y + 39}
                      textAnchor="middle"
                      fill="#A1B2AA"
                      fontSize="10.5"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      n={node.samples} · {node.confidencePct.toFixed(1)}%
                    </text>
                    <text
                      x={x}
                      y={y + 58}
                      textAnchor="middle"
                      fill={node.isLeaf ? '#A3E635' : '#2DD4BF'}
                      fontSize="10"
                      fontWeight="600"
                      fontFamily="Manrope, sans-serif"
                    >
                      {node.isLeaf
                        ? `Decisión: ${node.predictedClass}`
                        : `Predomina: ${node.predictedClass}`}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Node Inspector with Mandatory Business Explanation */}
        <div className="xl:col-span-4 bg-[#202C27] border border-[#2B3B35] rounded-lg p-5 space-y-4">
          <div className="border-b border-[#2B3B35] pb-3">
            <div className="text-[12px] text-[#2DD4BF] font-medium">
              {selectedNode.depth === 0
                ? 'Nodo Raíz'
                : selectedNode.isLeaf
                ? 'Nodo Hoja (Decisión final)'
                : `Nodo Interno · Nivel ${selectedNode.depth}`}
            </div>
            <h4 className="text-[16px] font-bold text-[#F3F7F4] mt-0.5">
              {selectedNode.isLeaf
                ? `Predicción: ${selectedNode.predictedClass}`
                : selectedNode.conditionLabel}
            </h4>
          </div>

          <div className="bg-[#18221F] border border-[#10B981]/35 rounded-md p-4 space-y-1.5">
            <div className="text-[12px] font-semibold text-[#10B981]">
              Explicación en lenguaje empresarial
            </div>
            <p className="text-[13px] text-[#F3F7F4] leading-relaxed">
              {selectedNode.businessExplanation}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div className="bg-[#18221F] border border-[#2B3B35] rounded p-3">
              <div className="text-[#A1B2AA]">Registros en nodo</div>
              <div className="text-[18px] font-bold font-mono tabular-nums text-[#F3F7F4]">
                {selectedNode.samples}
              </div>
            </div>
            <div className="bg-[#18221F] border border-[#2B3B35] rounded p-3">
              <div className="text-[#A1B2AA]">Concentración</div>
              <div className="text-[18px] font-bold font-mono tabular-nums text-[#A3E635]">
                {selectedNode.confidencePct.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[12px] font-semibold text-[#F3F7F4]">
              Distribución por categoría en este nodo
            </div>
            {Object.entries(selectedNode.classCounts).map(([cls, count]) => {
              const pct = selectedNode.classProportions[cls] ?? 0;
              return (
                <div key={cls} className="space-y-1 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-[#F3F7F4]">{cls}</span>
                    <span className="font-mono tabular-nums text-[#A1B2AA]">
                      {count} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-[#101715] rounded overflow-hidden">
                    <div
                      className="h-full bg-[#10B981]"
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {selectedNode.pathConditions.length > 0 && (
            <div className="pt-2 border-t border-[#2B3B35] space-y-1.5">
              <div className="text-[12px] font-semibold text-[#A1B2AA]">
                Ruta de condiciones desde la raíz
              </div>
              <ul className="space-y-1 text-[12px] text-[#F3F7F4]/90">
                {selectedNode.pathConditions.map((cond, idx) => (
                  <li key={idx}>
                    {idx + 1}. {cond}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface PruningModuleProps {
  model: TreeModelResult;
  pruningRows: PruningComparisonRow[];
  onApplyParams: (params: TreeHyperparams) => void;
  onNavigate: (sec: AppSectionId) => void;
}

export const PruningOptimizationModule: React.FC<PruningModuleProps> = ({
  model,
  pruningRows,
  onApplyParams,
  onNavigate,
}) => {
  const [depthCut, setDepthCut] = useState(model.params.maxDepth);
  const [leafCut, setLeafCut] = useState(model.params.minSamplesLeaf);
  const [alphaCut, setAlphaCut] = useState(model.params.ccpAlpha);

  return (
    <div className="space-y-6">
      <div className="bg-[#202C27] border border-[#2B3B35] rounded-lg p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2B3B35] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#F3F7F4] flex items-center gap-2">
              <Scissors className="w-5 h-5 text-[#10B981]" />
              <span>Poda y Simplificación del Árbol de Decisión</span>
            </h2>
            <p className="text-[13px] text-[#A1B2AA] mt-1">
              Controle el equilibrio entre precisión, simplicidad e interpretabilidad ejecutiva evitando que el modelo memorice casos aislados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('evaluation')}
            className="px-4 py-2 rounded-md bg-[#10B981] text-[#101715] text-[13px] font-semibold hover:bg-[#2DD4BF] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <span>Evaluar desempeño en prueba</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3 Interactive Pruning Levers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#18221F] border border-[#2B3B35] rounded-md p-4 space-y-3">
            <div className="text-[13px] font-semibold text-[#F3F7F4]">
              1. Poda por profundidad máxima
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-[#A1B2AA]">Niveles permitidos</span>
              <span className="font-mono font-bold text-[#10B981]">{depthCut}</span>
            </div>
            <input
              type="range"
              min={2}
              max={8}
              value={depthCut}
              onChange={(e) => setDepthCut(Number(e.target.value))}
              className="w-full accent-[#10B981]"
            />
            <button
              type="button"
              onClick={() =>
                onApplyParams({ ...model.params, maxDepth: depthCut })
              }
              className="w-full py-1.5 rounded bg-[#202C27] border border-[#2B3B35] hover:border-[#10B981] text-[12px] font-medium text-[#F3F7F4]"
            >
              Aplicar profundidad {depthCut}
            </button>
          </div>

          <div className="bg-[#18221F] border border-[#2B3B35] rounded-md p-4 space-y-3">
            <div className="text-[13px] font-semibold text-[#F3F7F4]">
              2. Poda por mínimo en hoja
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-[#A1B2AA]">Mín. registros / hoja</span>
              <span className="font-mono font-bold text-[#2DD4BF]">{leafCut}</span>
            </div>
            <input
              type="range"
              min={2}
              max={50}
              value={leafCut}
              onChange={(e) => setLeafCut(Number(e.target.value))}
              className="w-full accent-[#2DD4BF]"
            />
            <button
              type="button"
              onClick={() =>
                onApplyParams({
                  ...model.params,
                  minSamplesLeaf: leafCut,
                  minSamplesSplit: Math.max(model.params.minSamplesSplit, leafCut * 2),
                })
              }
              className="w-full py-1.5 rounded bg-[#202C27] border border-[#2B3B35] hover:border-[#2DD4BF] text-[12px] font-medium text-[#F3F7F4]"
            >
              Aplicar mínimo {leafCut} por hoja
            </button>
          </div>

          <div className="bg-[#18221F] border border-[#2B3B35] rounded-md p-4 space-y-3">
            <div className="text-[13px] font-semibold text-[#F3F7F4]">
              3. Poda Cost-Complexity (ccp_alpha)
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-[#A1B2AA]">Penalización alpha</span>
              <span className="font-mono font-bold text-[#A3E635]">{alphaCut.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.04}
              step={0.002}
              value={alphaCut}
              onChange={(e) => setAlphaCut(Number(e.target.value))}
              className="w-full accent-[#A3E635]"
            />
            <button
              type="button"
              onClick={() =>
                onApplyParams({ ...model.params, ccpAlpha: alphaCut })
              }
              className="w-full py-1.5 rounded bg-[#202C27] border border-[#2B3B35] hover:border-[#A3E635] text-[12px] font-medium text-[#F3F7F4]"
            >
              Aplicar ccp_alpha {alphaCut.toFixed(3)}
            </button>
          </div>
        </div>

        {/* Comparison Table: Original vs Pruned */}
        <div className="space-y-2.5">
          <h3 className="text-[15px] font-semibold text-[#F3F7F4]">
            Comparativa: Árbol Original vs. Alternativas de Poda
          </h3>
          <div className="overflow-x-auto border border-[#2B3B35] rounded-md">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#18221F] border-b border-[#2B3B35] text-[#A1B2AA]">
                  <th className="px-3.5 py-2.5 font-semibold">Alternativa</th>
                  <th className="px-3.5 py-2.5 font-semibold text-right">Nodos</th>
                  <th className="px-3.5 py-2.5 font-semibold text-right">Hojas</th>
                  <th className="px-3.5 py-2.5 font-semibold text-right">Prof.</th>
                  <th className="px-3.5 py-2.5 font-semibold text-right">Acc. Entreno</th>
                  <th className="px-3.5 py-2.5 font-semibold text-right">Acc. Prueba</th>
                  <th className="px-3.5 py-2.5 font-semibold text-right">F1 Prueba</th>
                  <th className="px-3.5 py-2.5 font-semibold">Impacto para el negocio</th>
                  <th className="px-3.5 py-2.5 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B3B35]">
                {pruningRows.map((row) => (
                  <tr key={row.label} className="hover:bg-[#18221F]/60">
                    <td className="px-3.5 py-3">
                      <div className="font-semibold text-[#F3F7F4]">{row.label}</div>
                      <div className="text-[11px] text-[#A1B2AA] font-mono">{row.method}</div>
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono tabular-nums">{row.summary.nodeCount}</td>
                    <td className="px-3.5 py-3 text-right font-mono tabular-nums">{row.summary.leafCount}</td>
                    <td className="px-3.5 py-3 text-right font-mono tabular-nums">{row.summary.depth}</td>
                    <td className="px-3.5 py-3 text-right font-mono tabular-nums">
                      {(row.summary.trainAccuracy * 100).toFixed(1)}%
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono tabular-nums text-[#10B981] font-semibold">
                      {(row.summary.testAccuracy * 100).toFixed(1)}%
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono tabular-nums text-[#2DD4BF]">
                      {(row.summary.testF1 * 100).toFixed(1)}%
                    </td>
                    <td className="px-3.5 py-3 text-[#A1B2AA] max-w-[280px] leading-relaxed">
                      {row.businessTradeoff}
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onApplyParams(row.params)}
                        className="px-3 py-1.5 rounded bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] hover:bg-[#10B981] hover:text-[#101715] font-semibold transition-colors whitespace-nowrap"
                      >
                        Activar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
