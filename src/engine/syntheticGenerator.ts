import { DataRow, Dataset, EconomicSector } from '../types/analytics';
import { analyzeDataset } from './dataParser';

export interface SectorScenario {
  id: string;
  title: string;
  description: string;
  targetColumn: string;
  positiveClass: string;
}

export const ECONOMIC_SECTORS: EconomicSector[] = [
  'Financiero y bancario',
  'Telecomunicaciones',
  'Comercio y retail',
  'Salud',
  'Educación',
  'Marketing y publicidad',
  'Transporte y logística',
  'Manufactura',
  'Tecnología',
  'Servicios',
  'Turismo y hotelería',
  'Otros',
];

export const SECTOR_SCENARIOS: Record<EconomicSector, SectorScenario[]> = {
  'Telecomunicaciones': [
    {
      id: 'telecom_churn',
      title: 'Predicción de abandono de clientes (Churn)',
      description: 'Base de suscriptores de telefonía e internet con historial de antigüedad, reclamos, tipo de contrato, gasto mensual y estado de permanencia.',
      targetColumn: 'Abandono_Cliente',
      positiveClass: 'Abandona',
    },
    {
      id: 'telecom_repurchase',
      title: 'Identificación de clientes con alta probabilidad de recompra / upgrade',
      description: 'Clientes actuales evaluados para migración a planes de fibra óptica y paquetes convergentes de mayor valor.',
      targetColumn: 'Acepta_Upgrade',
      positiveClass: 'Sí',
    },
    {
      id: 'telecom_offer',
      title: 'Predicción de aceptación de ofertas comerciales',
      description: 'Campaña comercial de renovación anticipada con datos de consumo, sensibilidad a descuento y canal de contacto.',
      targetColumn: 'Acepta_Oferta',
      positiveClass: 'Acepta',
    },
  ],
  'Financiero y bancario': [
    {
      id: 'bank_default',
      title: 'Predicción de incumplimiento de pagos',
      description: 'Cartera de créditos personales con nivel de endeudamiento, historial crediticio, ingresos mensuales, antigüedad laboral y estado de pago.',
      targetColumn: 'Incumplimiento_Pago',
      positiveClass: 'Incumple',
    },
    {
      id: 'bank_credit',
      title: 'Identificación de clientes interesados en créditos',
      description: 'Clientes con cuentas de ahorro y nómina evaluados para colocación de préstamo de consumo o hipotecario.',
      targetColumn: 'Solicita_Credito',
      positiveClass: 'Interesado',
    },
    {
      id: 'bank_risk',
      title: 'Clasificación de riesgo de clientes',
      description: 'Evaluación integral de riesgo crediticio en tres categorías (Bajo, Medio, Alto) según solvencia y comportamiento financiero.',
      targetColumn: 'Nivel_Riesgo',
      positiveClass: 'Alto',
    },
  ],
  'Comercio y retail': [
    {
      id: 'retail_purchase',
      title: 'Predicción de compra',
      description: 'Visitantes y clientes registrados con frecuencia de navegación, ticket promedio histórico, uso de cupones y conversión final.',
      targetColumn: 'Realiza_Compra',
      positiveClass: 'Compra',
    },
    {
      id: 'retail_recurring',
      title: 'Identificación de clientes recurrentes',
      description: 'Análisis de recompra trimestral a partir de experiencia de entrega, devoluciones, programa de puntos y categoría preferida.',
      targetColumn: 'Cliente_Recurrente',
      positiveClass: 'Recurrente',
    },
    {
      id: 'retail_cart',
      title: 'Predicción de abandono de carrito',
      description: 'Sesiones de comercio electrónico con costo de envío, tiempo en checkout, método de pago y descuento aplicado.',
      targetColumn: 'Abandona_Carrito',
      positiveClass: 'Abandona',
    },
  ],
  'Salud': [
    {
      id: 'health_noshow',
      title: 'Predicción de inasistencia a citas médicas',
      description: 'Registro de pacientes con días de anticipación de reserva, recordatorios enviados, distancia y asistencia efectiva.',
      targetColumn: 'Inasistencia_Cita',
      positiveClass: 'No Asiste',
    },
    {
      id: 'health_readmission',
      title: 'Identificación de riesgo de reingreso hospitalario',
      description: 'Seguimiento post-alta con edad, número de comorbilidades, adherencia a control ambulatorio y reingreso a 30 días.',
      targetColumn: 'Reingreso_30d',
      positiveClass: 'Reingresa',
    },
  ],
  'Educación': [
    {
      id: 'edu_dropout',
      title: 'Predicción de deserción estudiantil',
      description: 'Estudiantes universitarios con promedio acumulado, porcentaje de asistencia, beca financiera, horas de tutoría y continuidad.',
      targetColumn: 'Desercion_Estudiantil',
      positiveClass: 'Deserta',
    },
    {
      id: 'edu_risk',
      title: 'Identificación de estudiantes con riesgo académico',
      description: 'Monitoreo temprano de rendimiento académico en tres niveles (Sin riesgo, Alerta temprana, Riesgo crítico).',
      targetColumn: 'Riesgo_Academico',
      positiveClass: 'Crítico',
    },
  ],
  'Marketing y publicidad': [
    {
      id: 'mkt_campaign',
      title: 'Predicción de respuesta a campañas',
      description: 'Audiencia impactada por campañas multicanal con tasa de apertura previa, afinidad de segmento, canal y respuesta efectiva.',
      targetColumn: 'Responde_Campana',
      positiveClass: 'Responde',
    },
    {
      id: 'mkt_leads',
      title: 'Clasificación de leads (Lead Scoring)',
      description: 'Prospectos B2B evaluados por cargo, tamaño de empresa, descargas de contenido y calificación comercial (Frío, Tibio, Caliente).',
      targetColumn: 'Calificacion_Lead',
      positiveClass: 'Caliente',
    },
  ],
  'Transporte y logística': [
    {
      id: 'log_delay',
      title: 'Predicción de retrasos en entregas',
      description: 'Despachos nacionales con distancia, tipo de carga, congestión de ruta, operador logístico y cumplimiento de ventana horaria.',
      targetColumn: 'Entrega_Retrasada',
      positiveClass: 'Retrasado',
    },
    {
      id: 'log_damage',
      title: 'Identificación de rutas con alto riesgo operativo',
      description: 'Evaluación de incidencias en tránsito según transbordos, tipo de embalaje y condición climática.',
      targetColumn: 'Incidencia_Ruta',
      positiveClass: 'Con Incidencia',
    },
  ],
  'Manufactura': [
    {
      id: 'mfg_defect',
      title: 'Predicción de lotes con defectos de calidad',
      description: 'Lotes de producción industrial con temperatura de proceso, antigüedad de calibración, turno operativo y resultado de inspección.',
      targetColumn: 'Lote_Defectuoso',
      positiveClass: 'Defectuoso',
    },
    {
      id: 'mfg_maint',
      title: 'Predicción de falla temprana de maquinaria',
      description: 'Equipos monitoreados por horas continuas de operación, vibración media, días desde último mantenimiento y estado.',
      targetColumn: 'Requiere_Mantenimiento',
      positiveClass: 'Urgente',
    },
  ],
  'Tecnología': [
    {
      id: 'tech_saas_churn',
      title: 'Predicción de cancelación de suscripciones SaaS',
      description: 'Cuentas B2B de software con adopción semanal de usuarios, tickets de soporte sin resolver, NPS y renovación anual.',
      targetColumn: 'Cancela_Suscripcion',
      positiveClass: 'Cancela',
    },
    {
      id: 'tech_expansion',
      title: 'Identificación de cuentas con potencial de expansión',
      description: 'Empresas usuarias evaluadas por consumo de licencias, uso de integraciones API y ampliación de plan.',
      targetColumn: 'Expande_Cuenta',
      positiveClass: 'Expande',
    },
  ],
  'Servicios': [
    {
      id: 'srv_renewal',
      title: 'Predicción de renovación de contratos de servicio',
      description: 'Clientes corporativos con cumplimiento SLA, satisfacción post-servicio, frecuencia de reuniones y renovación.',
      targetColumn: 'Renueva_Contrato',
      positiveClass: 'No Renueva',
    },
    {
      id: 'srv_nps',
      title: 'Clasificación de satisfacción de clientes',
      description: 'Encuestas operativas de servicio clasificadas en Detractor, Pasivo o Promotor según tiempos de respuesta.',
      targetColumn: 'Categoria_Satisfaccion',
      positiveClass: 'Detractor',
    },
  ],
  'Turismo y hotelería': [
    {
      id: 'tour_cancel',
      title: 'Predicción de cancelación de reservas hoteleras',
      description: 'Reservas con anticipación de compra, canal OTA vs directo, tarifa reembolsable, historial de cancelaciones y estado final.',
      targetColumn: 'Reserva_Cancelada',
      positiveClass: 'Cancelada',
    },
    {
      id: 'tour_vip',
      title: 'Identificación de huéspedes con alta propensión a servicios adicionales',
      description: 'Huéspedes evaluados por motivo de viaje, duración de estancia, membresía y consumo de spa/restaurante.',
      targetColumn: 'Compra_Adicional',
      positiveClass: 'Sí',
    },
  ],
  'Otros': [
    {
      id: 'other_attrition',
      title: 'Predicción de rotación de talento humano',
      description: 'Colaboradores con antigüedad, horas extra mensuales, nivel salarial relativo, evaluaciones y permanencia organizacional.',
      targetColumn: 'Rotacion_Personal',
      positiveClass: 'Egresa',
    },
    {
      id: 'other_conversion',
      title: 'Clasificación general de conversión de oportunidades',
      description: 'Propuestas comerciales evaluadas por tiempo de respuesta, descuento otorgado, tamaño de cuenta y cierre.',
      targetColumn: 'Resultado_Oportunidad',
      positiveClass: 'Ganada',
    },
  ],
};

// Deterministic PRNG (Mulberry32) for coherent reproducible synthetic datasets
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

function randNormal(rng: () => number, mean: number, std: number): number {
  const u1 = Math.max(1e-7, rng());
  const u2 = rng();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z * std;
}

function pickWeighted<T>(rng: () => number, items: { value: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x));
}

export function generateSyntheticDataset(
  sector: EconomicSector,
  scenarioId: string,
  rowCount: number,
  seed = 2026
): Dataset {
  const scenarios = SECTOR_SCENARIOS[sector];
  const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];
  const rng = createRng(seed + rowCount + scenario.id.length * 31);
  const rows: DataRow[] = [];

  for (let i = 1; i <= rowCount; i++) {
    const maybeNull = <T,>(val: T, p = 0.015): T | null => (rng() < p ? null : val);

    if (scenario.id.startsWith('telecom_')) {
      const antiguedad = Math.round(clamp(randNormal(rng, 22, 16), 1, 72));
      const contrato = pickWeighted(rng, [
        { value: 'Mensual', weight: 0.52 },
        { value: 'Anual', weight: 0.30 },
        { value: 'Bianual', weight: 0.18 },
      ]);
      const segmento = pickWeighted(rng, [
        { value: 'Prepago', weight: 0.42 },
        { value: 'Pospago Básico', weight: 0.35 },
        { value: 'Pospago Premium', weight: 0.23 },
      ]);
      const reclamos = Math.round(
        clamp(randNormal(rng, contrato === 'Mensual' ? 2.1 : 0.9, 1.3), 0, 8)
      );
      const cargoMensual = Number(
        clamp(
          segmento === 'Pospago Premium'
            ? randNormal(rng, 74, 14)
            : segmento === 'Pospago Básico'
            ? randNormal(rng, 42, 9)
            : randNormal(rng, 21, 7),
          10,
          120
        ).toFixed(2)
      );
      const soporteChat = rng() < 0.45 ? 'Sí' : 'No';
      const satisfaccion = Math.round(
        clamp(4.4 - reclamos * 0.45 + (antiguedad > 24 ? 0.4 : -0.3) + randNormal(rng, 0, 0.7), 1, 5)
      );

      if (scenario.id === 'telecom_churn') {
        const logit =
          -0.9 +
          (contrato === 'Mensual' ? 1.45 : contrato === 'Anual' ? -0.4 : -1.1) +
          (antiguedad < 8 ? 1.25 : antiguedad > 30 ? -0.9 : 0) +
          reclamos * 0.52 -
          satisfaccion * 0.45 +
          (cargoMensual > 68 ? 0.55 : 0);
        const prob = sigmoid(logit);
        const abandona = rng() < prob ? 'Abandona' : 'Permanece';
        rows.push({
          ID_Cliente: `TEL-${String(i).padStart(4, '0')}`,
          Antiguedad_Meses: maybeNull(antiguedad),
          Tipo_Contrato: contrato,
          Segmento_Plan: segmento,
          Reclamos_Ultimos_6M: reclamos,
          Cargo_Mensual_USD: maybeNull(cargoMensual),
          Uso_Soporte_Digital: soporteChat,
          Satisfaccion_1_a_5: satisfaccion,
          Abandono_Cliente: abandona,
        });
      } else {
        const logit =
          -1.2 +
          (segmento === 'Pospago Básico' ? 1.1 : 0.2) +
          (satisfaccion >= 4 ? 1.05 : -0.6) +
          (antiguedad > 12 ? 0.75 : -0.5) -
          reclamos * 0.48 +
          (soporteChat === 'Sí' ? 0.45 : 0);
        const prob = sigmoid(logit);
        const positive = scenario.id === 'telecom_repurchase' ? 'Sí' : 'Acepta';
        const negative = scenario.id === 'telecom_repurchase' ? 'No' : 'Rechaza';
        rows.push({
          ID_Cliente: `TEL-${String(i).padStart(4, '0')}`,
          Antiguedad_Meses: maybeNull(antiguedad),
          Tipo_Contrato: contrato,
          Segmento_Plan: segmento,
          Reclamos_Ultimos_6M: reclamos,
          Cargo_Mensual_USD: maybeNull(cargoMensual),
          Uso_Soporte_Digital: soporteChat,
          Satisfaccion_1_a_5: satisfaccion,
          [scenario.targetColumn]: rng() < prob ? positive : negative,
        });
      }
    } else if (scenario.id.startsWith('bank_')) {
      const ingreso = Math.round(clamp(randNormal(rng, 2600, 1200), 650, 9500));
      const endeudamiento = Number(clamp(randNormal(rng, 34, 15), 5, 85).toFixed(1));
      const antiguedadLaboral = Math.round(clamp(randNormal(rng, 6.2, 4.5), 0, 30));
      const historial = pickWeighted(rng, [
        { value: 'Excelente', weight: 0.35 },
        { value: 'Bueno', weight: 0.42 },
        { value: 'Regular', weight: 0.23 },
      ]);
      const atrasosPrevios = Math.round(
        clamp(historial === 'Regular' ? randNormal(rng, 2.3, 1.2) : randNormal(rng, 0.3, 0.6), 0, 7)
      );
      const producto = pickWeighted(rng, [
        { value: 'Crédito Consumo', weight: 0.46 },
        { value: 'Tarjeta Oro', weight: 0.32 },
        { value: 'Microcrédito', weight: 0.22 },
      ]);
      const canal = rng() < 0.55 ? 'Digital' : 'Sucursal';

      if (scenario.id === 'bank_risk') {
        const score =
          (endeudamiento > 48 ? 2.1 : endeudamiento > 32 ? 0.9 : -0.6) +
          atrasosPrevios * 0.85 +
          (historial === 'Regular' ? 1.5 : historial === 'Excelente' ? -1.4 : 0) -
          (ingreso > 3500 ? 0.9 : 0) +
          randNormal(rng, 0, 0.5);
        const nivel = score > 2.2 ? 'Alto' : score > 0.3 ? 'Medio' : 'Bajo';
        rows.push({
          ID_Solicitud: `FIN-${String(i).padStart(4, '0')}`,
          Ingreso_Mensual_USD: maybeNull(ingreso),
          Ratio_Endeudamiento_Pct: maybeNull(endeudamiento),
          Antiguedad_Laboral_Anios: antiguedadLaboral,
          Historial_Crediticio: historial,
          Atrasos_Ultimos_12M: atrasosPrevios,
          Tipo_Producto: producto,
          Canal_Origen: canal,
          Nivel_Riesgo: nivel,
        });
      } else if (scenario.id === 'bank_default') {
        const logit =
          -2.1 +
          (endeudamiento > 45 ? 1.55 : 0) +
          atrasosPrevios * 0.72 +
          (historial === 'Regular' ? 1.3 : historial === 'Excelente' ? -1.2 : 0) -
          (antiguedadLaboral > 5 ? 0.6 : -0.4);
        rows.push({
          ID_Solicitud: `FIN-${String(i).padStart(4, '0')}`,
          Ingreso_Mensual_USD: maybeNull(ingreso),
          Ratio_Endeudamiento_Pct: maybeNull(endeudamiento),
          Antiguedad_Laboral_Anios: antiguedadLaboral,
          Historial_Crediticio: historial,
          Atrasos_Ultimos_12M: atrasosPrevios,
          Tipo_Producto: producto,
          Canal_Origen: canal,
          Incumplimiento_Pago: rng() < sigmoid(logit) ? 'Incumple' : 'Al Día',
        });
      } else {
        const logit =
          -1.0 +
          (ingreso > 2400 ? 0.9 : -0.4) +
          (endeudamiento < 35 ? 0.8 : -0.6) +
          (canal === 'Digital' ? 0.7 : 0) +
          (historial !== 'Regular' ? 0.65 : -0.8);
        rows.push({
          ID_Cliente: `FIN-${String(i).padStart(4, '0')}`,
          Ingreso_Mensual_USD: maybeNull(ingreso),
          Ratio_Endeudamiento_Pct: maybeNull(endeudamiento),
          Antiguedad_Laboral_Anios: antiguedadLaboral,
          Historial_Crediticio: historial,
          Atrasos_Ultimos_12M: atrasosPrevios,
          Tipo_Producto: producto,
          Canal_Origen: canal,
          Solicita_Credito: rng() < sigmoid(logit) ? 'Interesado' : 'No Interesado',
        });
      }
    } else if (scenario.id.startsWith('retail_')) {
      const visitasMes = Math.round(clamp(randNormal(rng, 7, 4.5), 1, 25));
      const ticketProm = Number(clamp(randNormal(rng, 85, 40), 15, 320).toFixed(2));
      const usaCupon = rng() < 0.44 ? 'Sí' : 'No';
      const membresia = pickWeighted(rng, [
        { value: 'Bronce', weight: 0.48 },
        { value: 'Plata', weight: 0.34 },
        { value: 'Oro', weight: 0.18 },
      ]);
      const costoEnvio = Number(clamp(randNormal(rng, 7.5, 4.2), 0, 22).toFixed(2));
      const diasUltimaCompra = Math.round(clamp(randNormal(rng, 28, 22), 1, 120));
      const categoria = pickWeighted(rng, [
        { value: 'Tecnología', weight: 0.28 },
        { value: 'Moda', weight: 0.36 },
        { value: 'Hogar', weight: 0.36 },
      ]);

      let targetVal = '';
      if (scenario.id === 'retail_cart') {
        const logit =
          -1.1 +
          (costoEnvio > 10 ? 1.55 : -0.4) +
          (usaCupon === 'No' ? 0.75 : -0.8) +
          (membresia === 'Bronce' ? 0.65 : -0.5) +
          (ticketProm > 120 ? 0.5 : 0);
        targetVal = rng() < sigmoid(logit) ? 'Abandona' : 'Completa';
      } else if (scenario.id === 'retail_recurring') {
        const logit =
          -1.3 +
          (visitasMes >= 8 ? 1.2 : -0.4) +
          (diasUltimaCompra < 25 ? 1.15 : -0.8) +
          (membresia === 'Oro' ? 1.3 : membresia === 'Plata' ? 0.5 : -0.3) +
          (usaCupon === 'Sí' ? 0.4 : 0);
        targetVal = rng() < sigmoid(logit) ? 'Recurrente' : 'Ocasional';
      } else {
        const logit =
          -1.2 +
          (visitasMes >= 6 ? 1.05 : -0.5) +
          (usaCupon === 'Sí' ? 1.15 : -0.2) +
          (costoEnvio < 6 ? 0.7 : -0.5) +
          (membresia !== 'Bronce' ? 0.6 : 0);
        targetVal = rng() < sigmoid(logit) ? 'Compra' : 'No Compra';
      }

      rows.push({
        ID_Sesion: `RET-${String(i).padStart(4, '0')}`,
        Visitas_Mensuales: maybeNull(visitasMes),
        Ticket_Promedio_USD: maybeNull(ticketProm),
        Usa_Cupon_Descuento: usaCupon,
        Nivel_Membresia: membresia,
        Costo_Envio_USD: costoEnvio,
        Dias_Desde_Ultima_Compra: diasUltimaCompra,
        Categoria_Preferida: categoria,
        [scenario.targetColumn]: targetVal,
      });
    } else if (scenario.id.startsWith('edu_')) {
      const promedio = Number(clamp(randNormal(rng, 3.6, 0.75), 1.5, 5.0).toFixed(2));
      const asistenciaPct = Math.round(clamp(randNormal(rng, 81, 13), 40, 100));
      const beca = pickWeighted(rng, [
        { value: 'Sin Beca', weight: 0.5 },
        { value: 'Beca Parcial', weight: 0.32 },
        { value: 'Beca Completa', weight: 0.18 },
      ]);
      const tutorias = Math.round(clamp(randNormal(rng, 2.5, 2.0), 0, 10));
      const trabaja = rng() < 0.42 ? 'Sí' : 'No';
      const modalidad = pickWeighted(rng, [
        { value: 'Presencial', weight: 0.55 },
        { value: 'Híbrida', weight: 0.28 },
        { value: 'Virtual', weight: 0.17 },
      ]);

      if (scenario.id === 'edu_risk') {
        const score =
          (promedio < 3.0 ? 2.2 : promedio < 3.6 ? 0.8 : -1.2) +
          (asistenciaPct < 70 ? 1.8 : asistenciaPct < 82 ? 0.6 : -0.9) +
          (trabaja === 'Sí' ? 0.5 : 0) -
          tutorias * 0.22 +
          randNormal(rng, 0, 0.4);
        const nivel = score > 2.0 ? 'Crítico' : score > 0.2 ? 'Alerta Temprana' : 'Sin Riesgo';
        rows.push({
          ID_Estudiante: `EDU-${String(i).padStart(4, '0')}`,
          Promedio_Academico: maybeNull(promedio),
          Asistencia_Pct: maybeNull(asistenciaPct),
          Tipo_Beca: beca,
          Horas_Tutoria_Mes: tutorias,
          Trabaja_Actualmente: trabaja,
          Modalidad_Estudio: modalidad,
          Riesgo_Academico: nivel,
        });
      } else {
        const logit =
          -1.4 +
          (promedio < 3.1 ? 1.85 : promedio > 4.0 ? -1.1 : 0) +
          (asistenciaPct < 72 ? 1.65 : -0.6) +
          (beca === 'Sin Beca' ? 0.75 : -0.8) +
          (trabaja === 'Sí' ? 0.55 : 0) -
          tutorias * 0.28;
        rows.push({
          ID_Estudiante: `EDU-${String(i).padStart(4, '0')}`,
          Promedio_Academico: maybeNull(promedio),
          Asistencia_Pct: maybeNull(asistenciaPct),
          Tipo_Beca: beca,
          Horas_Tutoria_Mes: tutorias,
          Trabaja_Actualmente: trabaja,
          Modalidad_Estudio: modalidad,
          Desercion_Estudiantil: rng() < sigmoid(logit) ? 'Deserta' : 'Continúa',
        });
      }
    } else if (scenario.id.startsWith('mkt_')) {
      const tasaApertura = Math.round(clamp(randNormal(rng, 34, 18), 2, 95));
      const interacciones = Math.round(clamp(randNormal(rng, 5.2, 3.6), 0, 20));
      const canal = pickWeighted(rng, [
        { value: 'Email + WhatsApp', weight: 0.35 },
        { value: 'Redes Sociales', weight: 0.40 },
        { value: 'Pauta Búsqueda', weight: 0.25 },
      ]);
      const tamanoEmpresa = pickWeighted(rng, [
        { value: 'Pyme', weight: 0.46 },
        { value: 'Mediana', weight: 0.34 },
        { value: 'Corporativa', weight: 0.20 },
      ]);
      const presupuesto = Math.round(clamp(randNormal(rng, 4500, 2800), 500, 15000));
      const descargas = Math.round(clamp(randNormal(rng, 2.2, 1.8), 0, 10));

      if (scenario.id === 'mkt_leads') {
        const score =
          (interacciones >= 6 ? 1.4 : interacciones <= 2 ? -1.0 : 0.2) +
          (tasaApertura > 45 ? 1.1 : -0.5) +
          descargas * 0.35 +
          (tamanoEmpresa === 'Corporativa' ? 0.8 : 0) +
          randNormal(rng, 0, 0.45);
        const lead = score > 2.2 ? 'Caliente' : score > 0.5 ? 'Tibio' : 'Frío';
        rows.push({
          ID_Lead: `MKT-${String(i).padStart(4, '0')}`,
          Tasa_Apertura_Pct: maybeNull(tasaApertura),
          Interacciones_Previas: interacciones,
          Canal_Captacion: canal,
          Tamano_Empresa: tamanoEmpresa,
          Presupuesto_Estimado_USD: maybeNull(presupuesto),
          Descargas_Contenido: descargas,
          Calificacion_Lead: lead,
        });
      } else {
        const logit =
          -1.6 +
          (tasaApertura > 40 ? 1.35 : -0.4) +
          interacciones * 0.22 +
          (canal === 'Email + WhatsApp' ? 0.85 : 0) +
          descargas * 0.28;
        rows.push({
          ID_Contacto: `MKT-${String(i).padStart(4, '0')}`,
          Tasa_Apertura_Pct: maybeNull(tasaApertura),
          Interacciones_Previas: interacciones,
          Canal_Captacion: canal,
          Tamano_Empresa: tamanoEmpresa,
          Presupuesto_Estimado_USD: maybeNull(presupuesto),
          Descargas_Contenido: descargas,
          Responde_Campana: rng() < sigmoid(logit) ? 'Responde' : 'No Responde',
        });
      }
    } else {
      // Generalized high-coherence sector-specific generators for Salud, Logística, Manufactura, Tecnología, Servicios, Turismo, Otros
      const metricA = Number(clamp(randNormal(rng, 52, 22), 5, 100).toFixed(1));
      const metricB = Math.round(clamp(randNormal(rng, 4.2, 2.6), 0, 15));
      const metricC = Number(clamp(randNormal(rng, 18, 10), 1, 60).toFixed(1));
      const nivelCat = pickWeighted(rng, [
        { value: 'Bajo', weight: 0.32 },
        { value: 'Medio', weight: 0.44 },
        { value: 'Alto', weight: 0.24 },
      ]);
      const canalCat = pickWeighted(rng, [
        { value: 'Canal Directo', weight: 0.45 },
        { value: 'Intermediario / Partner', weight: 0.33 },
        { value: 'Autogestión Digital', weight: 0.22 },
      ]);
      const alertaBin = rng() < 0.36 ? 'Sí' : 'No';

      const logit =
        -1.35 +
        (metricA > 62 ? 1.2 : -0.45) +
        metricB * 0.28 +
        (nivelCat === 'Alto' ? 1.15 : nivelCat === 'Bajo' ? -0.7 : 0) +
        (alertaBin === 'Sí' ? 0.95 : -0.3) -
        (metricC > 25 ? 0.55 : 0);

      const isPositive = rng() < sigmoid(logit);
      const negLabel =
        scenario.positiveClass === 'Sí'
          ? 'No'
          : scenario.positiveClass === 'No Asiste'
          ? 'Asiste'
          : scenario.positiveClass === 'Reingresa'
          ? 'No Reingresa'
          : scenario.positiveClass === 'Retrasado'
          ? 'A Tiempo'
          : scenario.positiveClass === 'Con Incidencia'
          ? 'Sin Incidencia'
          : scenario.positiveClass === 'Defectuoso'
          ? 'Conforme'
          : scenario.positiveClass === 'Urgente'
          ? 'Normal'
          : scenario.positiveClass === 'Cancela'
          ? 'Renueva'
          : scenario.positiveClass === 'Expande'
          ? 'Mantiene'
          : scenario.positiveClass === 'No Renueva'
          ? 'Renueva'
          : scenario.positiveClass === 'Cancelada'
          ? 'Confirmada'
          : scenario.positiveClass === 'Egresa'
          ? 'Permanece'
          : scenario.positiveClass === 'Ganada'
          ? 'Perdida'
          : 'Estable';

      if (scenario.id === 'srv_nps') {
        const score = (metricA > 65 ? 1.4 : -0.8) + (alertaBin === 'Sí' ? -1.4 : 0.7) + randNormal(rng, 0, 0.5);
        const sat = score < -0.5 ? 'Detractor' : score < 0.8 ? 'Pasivo' : 'Promotor';
        rows.push({
          ID_Registro: `REG-${String(i).padStart(4, '0')}`,
          Indice_Desempeno_Operativo: maybeNull(metricA),
          Eventos_Criticos_90D: metricB,
          Tiempo_Ciclo_Dias: maybeNull(metricC),
          Nivel_Exposicion: nivelCat,
          Canal_Atencion: canalCat,
          Alerta_Previa: alertaBin,
          [scenario.targetColumn]: sat,
        });
      } else {
        rows.push({
          ID_Registro: `REG-${String(i).padStart(4, '0')}`,
          Indice_Desempeno_Operativo: maybeNull(metricA),
          Eventos_Criticos_90D: metricB,
          Tiempo_Ciclo_Dias: maybeNull(metricC),
          Nivel_Exposicion: nivelCat,
          Canal_Atencion: canalCat,
          Alerta_Previa: alertaBin,
          [scenario.targetColumn]: isPositive ? scenario.positiveClass : negLabel,
        });
      }
    }
  }

  return analyzeDataset(
    rows,
    `sintetico_${scenario.id}_${rowCount}.csv`,
    'synthetic',
    sector,
    scenario.title,
    `${scenario.description} (Datos sintéticos generados estadísticamente para simulación de Decision Intelligence; no corresponden a registros reales de clientes ni operaciones.)`
  );
}
