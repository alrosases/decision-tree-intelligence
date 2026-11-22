import {
  BusinessDiagnostic,
  Dataset,
  EconomicSector,
  ExecutiveSummary,
  MatrixQuadrant,
  ObjectiveConfig,
  ObjectiveRecommendation,
  StrategicLine,
  StrategyItem,
  TreeModelResult,
} from '../types/analytics';

const KEYWORD_TARGET_MAP: { keywords: string[]; colPatterns: RegExp }[] = [
  {
    keywords: ['abandono', 'churn', 'desercion', 'deserción', 'cancel', 'fuga', 'baja', 'renuncia', 'rotacion', 'rotación'],
    colPatterns: /(abandono|churn|desercion|deserción|cancela|rotacion|renueva|egresa)/i,
  },
  {
    keywords: ['compra', 'recompra', 'venta', 'convert', 'conversión', 'acepta', 'oferta', 'upgrade', 'adicional', 'carrito'],
    colPatterns: /(compra|recompra|acepta|upgrade|responde|ganada|oportunidad|solicita|expande|adicional)/i,
  },
  {
    keywords: ['incumpl', 'mora', 'pago', 'riesgo', 'credito', 'crédito', 'default', 'reingreso', 'critico', 'crítico'],
    colPatterns: /(incumpl|riesgo|default|reingreso|retras|incidencia|defect|mantenimiento|alerta)/i,
  },
  {
    keywords: ['lead', 'calific', 'campaña', 'campana', 'respuesta', 'satisfacc', 'nps', 'cita', 'asist'],
    colPatterns: /(lead|responde|satisfacc|inasistencia|asiste|calificacion)/i,
  },
];

export function recommendObjective(
  dataset: Dataset,
  businessGoal: string
): ObjectiveRecommendation {
  const goalLower = businessGoal.toLowerCase();
  const categoricalVars = dataset.variables.filter(
    (v) =>
      v.type.startsWith('categorical_') &&
      v.role !== 'identifier' &&
      v.uniqueCount >= 2 &&
      v.uniqueCount <= 12
  );

  const detectedKeywords: string[] = [];
  let matchedTarget: string | null = null;
  let matchReason = '';

  // 1. Try matching user's objective keywords with categorical variable names
  for (const mapping of KEYWORD_TARGET_MAP) {
    const hitKeywords = mapping.keywords.filter((kw) => goalLower.includes(kw));
    if (hitKeywords.length > 0) {
      detectedKeywords.push(...hitKeywords);
      const found = categoricalVars.find((v) => mapping.colPatterns.test(v.name));
      if (found) {
        matchedTarget = found.name;
        matchReason = `La descripción menciona "${hitKeywords.join(', ')}", lo cual se alinea directamente con la variable categórica "${found.name}" (${found.uniqueCount} categorías: ${found.examples.slice(0, 3).join(', ')}).`;
        break;
      }
    }
  }

  // 2. Fallback to variable tagged as target_candidate
  if (!matchedTarget) {
    const candidate = categoricalVars.find((v) => v.role === 'target_candidate');
    if (candidate) {
      matchedTarget = candidate.name;
      matchReason = `Se recomienda "${candidate.name}" por su estructura categórica (${candidate.uniqueCount} clases: ${candidate.examples.slice(0, 3).join(', ')}) y su correspondencia directa con el contexto "${dataset.businessContext}".`;
    } else if (categoricalVars.length > 0) {
      const binaryOrLowCard = [...categoricalVars].sort((a, b) => a.uniqueCount - b.uniqueCount)[0];
      matchedTarget = binaryOrLowCard.name;
      matchReason = `"${binaryOrLowCard.name}" presenta ${binaryOrLowCard.uniqueCount} categorías bien definidas, lo que permite construir un árbol de clasificación interpretable.`;
    }
  }

  const suggestedPredictors = dataset.variables
    .filter(
      (v) =>
        v.name !== matchedTarget &&
        v.role !== 'identifier' &&
        v.role !== 'ignored' &&
        v.uniqueCount > 1
    )
    .map((v) => v.name);

  let warning: string | undefined;
  if (!matchedTarget) {
    warning =
      'No se detectaron variables categóricas adecuadas para clasificación. Puede reclasificar una variable en el módulo de Variables si representa categorías codificadas con números.';
  }

  return {
    suggestedTarget: matchedTarget,
    reason: matchReason,
    suggestedPredictors,
    detectedKeywords: Array.from(new Set(detectedKeywords)),
    warning,
  };
}

export function generateBusinessDiagnostic(
  dataset: Dataset,
  objective: ObjectiveConfig,
  model: TreeModelResult
): BusinessDiagnostic {
  const { evaluation, featureImportances, rules, summary } = model;
  const target = objective.targetColumn;
  const totalProcessed = model.trainCount + model.testCount;

  // Class distribution across processed data
  const totalDist: { className: string; count: number; pct: number }[] = evaluation.classes.map(
    (cls) => {
      const c = (model.trainClassDist[cls] ?? 0) + (model.testClassDist[cls] ?? 0);
      return {
        className: cls,
        count: c,
        pct: totalProcessed > 0 ? (c / totalProcessed) * 100 : 0,
      };
    }
  );
  totalDist.sort((a, b) => b.count - a.count);

  const major = totalDist[0];
  const minor = totalDist[totalDist.length - 1];

  const whatIsHappening = `Se analizaron ${totalProcessed} registros válidos del sector ${dataset.sector} (${dataset.businessContext}). En la variable objetivo "${target}", la categoría predominante es "${major?.className}" con ${major?.pct.toFixed(1)}% (${major?.count} casos), mientras que "${minor?.className}" representa el ${minor?.pct.toFixed(1)}% (${minor?.count} casos).`;

  const topRules = rules.slice(0, 4);
  const patternsIdentified = topRules.map((r) => {
    const condText = r.conditions.length > 0 ? r.conditions.join(' y ') : 'toda la población analizada';
    return `Cuando ${condText}, el ${r.confidencePct.toFixed(1)}% de los ${r.samples} registros evaluados en entrenamiento corresponde a "${r.predictedClass}" (${r.samplePct.toFixed(1)}% del total de entrenamiento).`;
  });

  const activeFeatures = featureImportances.filter((f) => f.importancePct > 0);
  const topTwo = activeFeatures.slice(0, 2);
  const topVariablesExplanation =
    topTwo.length >= 2
      ? `Las variables con mayor capacidad predictiva en el árbol son "${topTwo[0].feature}" (${topTwo[0].importancePct.toFixed(1)}% de importancia) y "${topTwo[1].feature}" (${topTwo[1].importancePct.toFixed(1)}%). Estas variables determinan las principales separaciones del modelo, aunque su relevancia indica asociación predictiva y no necesariamente causalidad directa.`
      : topTwo.length === 1
      ? `"${topTwo[0].feature}" concentra el ${topTwo[0].importancePct.toFixed(1)}% de la capacidad de separación del árbol. Se recuerda que importancia predictiva no equivale a causalidad.`
      : 'El árbol no encontró divisiones con ganancia significativa bajo los parámetros actuales.';

  const distinguishedProfiles = topRules.slice(0, 3).map((r, idx) => ({
    title: `Perfil ${idx + 1}: Segmento "${r.predictedClass}"`,
    targetClass: r.predictedClass,
    sharePct: r.samplePct,
    confidencePct: r.confidencePct,
    characteristics:
      r.conditions.length > 0
        ? r.conditions.join(' · ')
        : 'Población general sin segmentación adicional',
  }));

  const categoryCharacteristics = totalDist.map((d) => {
    const matchingRules = rules.filter((r) => r.predictedClass === d.className);
    const bestRule = matchingRules.sort((a, b) => b.confidencePct - a.confidencePct)[0];
    return {
      className: d.className,
      count: d.count,
      pct: d.pct,
      summary: bestRule
        ? `Su patrón más definido (${bestRule.confidencePct.toFixed(1)}% de concentración en ${bestRule.samples} registros) se caracteriza por: ${bestRule.conditions.join(' y ') || 'distribución base'}.`
        : `Participa con ${d.count} registros, aunque aparece mezclada en hojas donde otra categoría es mayoritaria.`,
    };
  });

  const accPct = (evaluation.testAccuracy * 100).toFixed(1);
  const f1Pct = (evaluation.weightedF1 * 100).toFixed(1);
  const modelReliability = `El modelo logra un Accuracy de ${accPct}% (clasifica correctamente ~${Math.round(evaluation.testAccuracy * 100)} de cada 100 casos nuevos no vistos) y un F1-score ponderado de ${f1Pct}% (equilibrio entre precisión de las alertas y cobertura real). Con una profundidad de ${summary.depth} niveles y ${summary.leafCount} segmentos finales, ${evaluation.overfittingMessage.toLowerCase()}`;

  // Analyze worst-performing class & error counts
  const totalErrors = evaluation.testPredictions.filter((p) => !p.correct).length;
  const worstClass = [...evaluation.classMetrics].sort((a, b) => a.recall - b.recall)[0];
  const modelErrors =
    totalErrors === 0
      ? 'En el conjunto de prueba evaluado no se registraron errores de clasificación; aun así, se recomienda validar periódicamente con datos recientes.'
      : `Se registraron ${totalErrors} errores sobre ${model.testCount} casos de prueba (${((totalErrors / model.testCount) * 100).toFixed(1)}%). La categoría con mayor oportunidad de mejora es "${worstClass.className}", donde el modelo detecta el ${(worstClass.recall * 100).toFixed(1)}% de los casos reales (${worstClass.fn} falsos negativos y ${worstClass.fp} falsos positivos).`;

  const topFeatName = topTwo[0]?.feature ?? objective.predictorColumns[0] ?? 'la variable principal';
  const secondFeatName = topTwo[1]?.feature ?? objective.predictorColumns[1] ?? 'los factores secundarios';

  const businessOpportunities = [
    `Focalizar acciones preventivas o comerciales en los segmentos delimitados por ${topFeatName}, donde se concentra la mayor diferenciación de ${target}.`,
    `Estandarizar reglas de decisión operativas simples basadas en los ${distinguishedProfiles.length} perfiles principales sin requerir sistemas complejos para su aplicación inmediata.`,
    `Monitorear la evolución de ${secondFeatName} como indicador temprano antes de que los casos escalen hacia resultados desfavorables.`,
  ];

  const recommendedDecisions = [
    `Traducir las condiciones de los nodos de mayor concentración (${topRules[0]?.conditions[0] ?? topFeatName}) en protocolos de atención o alertas tempranas para los equipos comerciales y operativos.`,
    `Implementar un piloto controlado sobre el segmento de mayor impacto antes de desplegar cambios masivos, midiendo la variación real en ${target}.`,
    `Establecer un ciclo trimestral de reentrenamiento para verificar que los umbrales de decisión sigan vigentes ante cambios del mercado.`,
  ];

  return {
    whatIsHappening,
    patternsIdentified,
    topVariablesExplanation,
    distinguishedProfiles,
    categoryCharacteristics,
    modelReliability,
    modelErrors,
    businessOpportunities,
    recommendedDecisions,
  };
}

function classifyQuadrant(impactScore: number, effortScore: number): {
  impactLevel: 'Alto' | 'Bajo';
  effortLevel: 'Alto' | 'Bajo';
  quadrant: MatrixQuadrant;
} {
  const impactLevel = impactScore >= 6 ? 'Alto' : 'Bajo';
  const effortLevel = effortScore >= 6 ? 'Alto' : 'Bajo';
  let quadrant: MatrixQuadrant = 'quick_wins';
  if (impactLevel === 'Alto' && effortLevel === 'Bajo') quadrant = 'quick_wins';
  else if (impactLevel === 'Alto' && effortLevel === 'Alto') quadrant = 'strategic_initiatives';
  else if (impactLevel === 'Bajo' && effortLevel === 'Bajo') quadrant = 'complementary';
  else quadrant = 'low_priority';
  return { impactLevel, effortLevel, quadrant };
}

function getSectorOwner(sector: EconomicSector, line: StrategicLine): string {
  if (line === 'Marketing') return 'Gerencia de Marketing y Segmentación';
  if (line === 'Comunicación') return 'Líder de Comunicación y CRM';
  if (line === 'Fidelización') return sector === 'Educación' ? 'Dirección de Bienestar Estudiantil' : 'Dirección de Experiencia y Retención';
  if (line === 'Innovación') return 'Gerencia de Producto e Innovación';
  if (line === 'Gestión comercial') return 'Dirección Comercial y Ventas';
  return 'Gerencia de Operaciones y Calidad';
}

export function generateStrategicPlan(
  dataset: Dataset,
  objective: ObjectiveConfig,
  model: TreeModelResult
): { strategies: StrategyItem[]; executiveSummary: ExecutiveSummary } {
  const topVars = model.featureImportances.filter((f) => f.importancePct > 0).slice(0, 4);
  const v1 = topVars[0]?.feature ?? objective.predictorColumns[0] ?? 'Variable principal';
  const v1Pct = topVars[0]?.importancePct.toFixed(1) ?? '0.0';
  const v2 = topVars[1]?.feature ?? objective.predictorColumns[1] ?? v1;
  const v2Pct = topVars[1]?.importancePct.toFixed(1) ?? '0.0';
  const v3 = topVars[2]?.feature ?? v2;

  const topRule = model.rules[0];
  const secondRule = model.rules[1] ?? topRule;
  const topCond = topRule?.conditions.join(' y ') || v1;
  const secCond = secondRule?.conditions.join(' y ') || v2;
  const target = objective.targetColumn;

  const focusClass =
    objective.positiveClass ||
    model.evaluation.classMetrics[0]?.className ||
    model.evaluation.classes[0];

  const rawConfigs: {
    id: string;
    name: string;
    line: StrategicLine;
    findingJustification: string;
    businessObjective: string;
    impactScore: number;
    effortScore: number;
    matrixRationale: string;
    kpi: string;
    horizon: StrategyItem['horizon'];
    expectedBenefit: string;
  }[] = [
    {
      id: 'strat_marketing',
      name: `Microsegmentación comercial guiada por ${v1}`,
      line: 'Marketing',
      findingJustification: `"${v1}" concentra el ${v1Pct}% de la capacidad explicativa del árbol en ${target}, separando claramente los perfiles de mayor propensión a "${focusClass}".`,
      businessObjective: `Ajustar la propuesta de oferta y segmentación de campañas según los umbrales detectados en ${v1} (${topRule?.conditions[0] ?? v1}).`,
      impactScore: 8.5,
      effortScore: 3.5,
      matrixRationale: 'Hipótesis de planificación: alto impacto por atacar directamente el divisor raíz del árbol con bajo esfuerzo al usar reglas de segmentación ya disponibles.',
      kpi: `Tasa de conversión / mejora en ${target} por segmento`,
      horizon: 'Corto plazo (0-3 meses)',
      expectedBenefit: 'Incremento estimado de efectividad en campañas al concentrar presupuesto en los perfiles con mayor probabilidad validada.',
    },
    {
      id: 'strat_comunicacion',
      name: `Mensajería preventiva automatizada para perfiles "${secondRule?.predictedClass ?? focusClass}"`,
      line: 'Comunicación',
      findingJustification: `El árbol identifica un segmento de ${secondRule?.samples ?? 0} registros (${secondRule?.confidencePct.toFixed(1) ?? '0'}% concentración) bajo la condición: ${secCond}.`,
      businessObjective: 'Activar comunicaciones personalizadas y oportunas antes de que se materialice el evento crítico en el grupo identificado.',
      impactScore: 7.8,
      effortScore: 3.0,
      matrixRationale: 'Hipótesis de planificación: alto retorno al automatizar mensajes sobre flujos existentes de correo o mensajería sin rediseñar procesos centrales.',
      kpi: 'Tasa de apertura, respuesta efectiva y reducción de casos críticos',
      horizon: 'Corto plazo (0-3 meses)',
      expectedBenefit: 'Intervención temprana a costo marginal bajo mediante comunicación contextualizada.',
    },
    {
      id: 'strat_fidelizacion',
      name: `Programa de retención y acompañamiento sobre ${v1} y ${v2}`,
      line: 'Fidelización',
      findingJustification: `La combinación de "${v1}" (${v1Pct}%) y "${v2}" (${v2Pct}%) explica la mayoría de los nodos terminales asociados a "${focusClass}".`,
      businessObjective: `Establecer hitos de seguimiento y beneficios diferenciados cuando un registro ingrese en la zona de alerta (${topCond}).`,
      impactScore: 9.0,
      effortScore: 6.5,
      matrixRationale: 'Hipótesis de planificación: impacto estructural muy alto sobre la cartera, pero requiere coordinación entre áreas, incentivos y seguimiento continuo.',
      kpi: `Tasa de permanencia / retención en el segmento ${focusClass}`,
      horizon: 'Mediano plazo (3-6 meses)',
      expectedBenefit: 'Estabilización sostenible de la base de clientes o usuarios críticos en los primeros ciclos de relación.',
    },
    {
      id: 'strat_comercial',
      name: `Priorización de cartera y guion de gestión por reglas del árbol`,
      line: 'Gestión comercial',
      findingJustification: `Las ${model.rules.length} hojas del modelo permiten clasificar cada nuevo caso con un Accuracy de ${(model.evaluation.testAccuracy * 100).toFixed(1)}% y asignar prioridad según probabilidad.`,
      businessObjective: 'Dotar al equipo comercial o de atención de una matriz simple de 2 a 3 preguntas basadas en las ramas superiores del árbol.',
      impactScore: 8.2,
      effortScore: 4.0,
      matrixRationale: 'Hipótesis de planificación: alto impacto en productividad comercial y esfuerzo moderado-bajo al no exigir integraciones tecnológicas complejas.',
      kpi: 'Productividad por asesor y tasa de resolución en primer contacto',
      horizon: 'Corto plazo (0-3 meses)',
      expectedBenefit: 'Reducción del tiempo dedicado a casos de baja prioridad y foco en oportunidades de mayor valor.',
    },
    {
      id: 'strat_operaciones',
      name: `Rediseño de puntos críticos operativos vinculados a ${v2}`,
      line: 'Operaciones',
      findingJustification: `"${v2}" aparece como segundo eje clave (${v2Pct}% de importancia), evidenciando cuellos de botella o fricciones operativas recurrentes.`,
      businessObjective: `Revisar los protocolos operativos y SLA asociados a ${v2} para prevenir que los registros alcancen los umbrales críticos del árbol.`,
      impactScore: 7.4,
      effortScore: 7.2,
      matrixRationale: 'Hipótesis de planificación: impacto alto y duradero, pero exige ajuste de procesos internos, capacitación y control operativo.',
      kpi: `Reducción de incidencias o tiempos asociados a ${v2}`,
      horizon: 'Mediano plazo (3-6 meses)',
      expectedBenefit: 'Disminución estructural de errores operativos que alimentan los resultados negativos.',
    },
    {
      id: 'strat_innovacion',
      name: `Motor de alertas tempranas e integración predictiva con ${v3}`,
      line: 'Innovación',
      findingJustification: `Las reglas del árbol combinan ${v1}, ${v2} y ${v3}, lo que permite automatizar la puntuación de riesgo o propensión en tiempo real.`,
      businessObjective: 'Desplegar una nueva oferta o flujo digital adaptativo que personalice condiciones de servicio automáticamente según el perfil clasificado.',
      impactScore: 8.0,
      effortScore: 8.4,
      matrixRationale: 'Hipótesis de planificación: iniciativa transformadora de alto impacto potencial, pero de alto esfuerzo técnico y organizacional.',
      kpi: 'Adopción de flujo automatizado y retorno incremental neto',
      horizon: 'Largo plazo (6-12 meses)',
      expectedBenefit: 'Ventaja competitiva sostenible mediante personalización dinámica basada en reglas transparentes.',
    },
    {
      id: 'strat_complementary',
      name: `Tablero de monitoreo semanal de calidad de datos y variables clave`,
      line: 'Operaciones',
      findingJustification: `El conjunto analizado presenta ${dataset.quality.missingPct.toFixed(1)}% de datos faltantes y ${dataset.quality.duplicateRows} duplicados previos a la preparación.`,
      businessObjective: 'Implementar validaciones simples en los formularios de captura para garantizar datos completos en las variables de mayor peso.',
      impactScore: 4.8,
      effortScore: 2.8,
      matrixRationale: 'Hipótesis de planificación: mejora complementaria de bajo esfuerzo que protege la precisión futura del modelo sin alterar la estrategia comercial.',
      kpi: 'Porcentaje de completitud en captura de datos',
      horizon: 'Corto plazo (0-3 meses)',
      expectedBenefit: 'Menor pérdida de información y modelos más estables en futuros ciclos.',
    },
    {
      id: 'strat_low_priority',
      name: `Reestructuración integral de arquitectura histórica heredada`,
      line: 'Innovación',
      findingJustification: `Aunque existen variables complementarias de menor peso predictivo (<5%), el árbol logra ${(model.evaluation.testAccuracy * 100).toFixed(1)}% de exactitud con los datos actuales.`,
      businessObjective: 'Unificar fuentes históricas secundarias de bajo aporte discriminante en un repositorio único de largo plazo.',
      impactScore: 4.2,
      effortScore: 8.0,
      matrixRationale: 'Hipótesis de planificación: bajo impacto inmediato frente a un esfuerzo elevado de ingeniería; debe diferirse frente a los Quick Wins.',
      kpi: 'Porcentaje de fuentes secundarias integradas',
      horizon: 'Largo plazo (6-12 meses)',
      expectedBenefit: 'Ordenamiento de largo plazo sin impacto prioritario en los indicadores actuales.',
    },
  ];

  const strategies: StrategyItem[] = rawConfigs.map((cfg) => {
    const q = classifyQuadrant(cfg.impactScore, cfg.effortScore);
    return {
      ...cfg,
      ...q,
      owner: getSectorOwner(dataset.sector, cfg.line),
    };
  });

  const prioritized = [...strategies].sort((a, b) => {
    const scoreA = a.impactScore * 1.4 - a.effortScore * 0.7;
    const scoreB = b.impactScore * 1.4 - b.effortScore * 0.7;
    return scoreB - scoreA;
  });

  const topThreeStrategies = prioritized.slice(0, 3);

  const executiveSummary: ExecutiveSummary = {
    mainOpportunities: [
      `Concentración clara de valor en torno a "${v1}" (${v1Pct}% de importancia), lo que simplifica la toma de decisiones ejecutivas sin depender de modelos opacos.`,
      `Capacidad de accionar de inmediato sobre ${model.rules.length} segmentos bien delimitados, respaldados por una precisión de prueba de ${(model.evaluation.testAccuracy * 100).toFixed(1)}%.`,
      `Equilibrio favorable entre simplicidad (profundidad ${model.summary.depth}) y capacidad predictiva (F1-score ${(model.evaluation.weightedF1 * 100).toFixed(1)}%), permitiendo trasladar las reglas a protocolos reales.`,
    ],
    topThreeStrategies,
    expectedBusinessBenefit: `La ejecución secuencial de las tres estrategias prioritarias (comenzando por los Quick Wins de alto impacto y bajo esfuerzo) permite capturar valor en el corto plazo sobre ${target}, reduciendo la dispersión de recursos y midiendo resultados reales mediante pilotos controlados.`,
    trackingIndicators: topThreeStrategies.map((s) => `${s.kpi} (${s.line})`),
    implementationRoadmap: [
      'Fase 1 (Semanas 1–4): Validar las reglas críticas del árbol con los líderes operativos e iniciar los Quick Wins de Marketing y Gestión Comercial.',
      'Fase 2 (Meses 2–4): Desplegar la automatización de mensajes preventivos y medir variación frente a un grupo de control.',
      'Fase 3 (Meses 4–6): Ejecutar las iniciativas estratégicas de Fidelización y Operaciones, reevaluando el desempeño del modelo con nuevos registros.',
    ],
  };

  return { strategies, executiveSummary };
}
