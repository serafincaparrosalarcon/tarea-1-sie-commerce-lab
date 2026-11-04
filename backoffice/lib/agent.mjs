import { audit } from './database.mjs';

function extractJson(text) {
  const cleaned = String(text || '').replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('La IA no devolvio JSON estructurado');
  return JSON.parse(cleaned.slice(start, end + 1));
}

function fallbackProposal(context) {
  const message = context.case_record.message.toLowerCase();
  const type = context.case_record.case_type;
  let priority = 'MEDIA';
  if (/roto|dañado|cargo|cobro|urgente|peligro/.test(message)) priority = 'ALTA';
  if (/gracias|informaci[oó]n|consulta/.test(message) && !/urgente/.test(message)) priority = 'BAJA';
  const proposedAction = type === 'DEVOLUCION'
    ? 'Revisar el estado y las lineas del pedido antes de aprobar la devolucion.'
    : 'Crear una tarea de soporte y solicitar la informacion minima que falte.';
  return {
    case_type: type,
    consulted_data: {
      case_id: context.case_record.id,
      order_number: context.order?.order_number || null,
      customer_email: context.customer?.email || null,
      previous_cases: context.history.length
    },
    proposed_action: proposedAction,
    response_draft: `Hola ${context.customer?.name || 'cliente'}, hemos recibido tu solicitud ${context.case_record.external_id}. El equipo la revisara y te respondera tras validar la informacion del pedido.`,
    justification: 'Clasificacion de contingencia basada en tipo de caso, palabras de riesgo e historial disponible.',
    confidence: 0.62,
    priority,
    risks: ['Requiere revision humana', 'No enviar sin comprobar pedido e identidad'],
    final_status: 'PENDIENTE_REVISION'
  };
}

async function callGemini(context, env) {
  const prompt = `Eres el agente operativo supervisado de Sensoria Operations. Tienes resultados de herramientas ya consultados: pedido, cliente e historial. No inventes datos. No puedes enviar mensajes ni aprobar devoluciones; solo propones. Devuelve EXCLUSIVAMENTE JSON valido con estas claves: case_type, consulted_data, proposed_action, response_draft, justification, confidence (0 a 1), priority (BAJA|MEDIA|ALTA|CRITICA), risks (array), final_status (siempre PENDIENTE_REVISION).\n\nCONTEXTO:\n${JSON.stringify(context)}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
    }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
  const data = await response.json();
  return extractJson(data?.candidates?.[0]?.content?.parts?.[0]?.text);
}

function normalizeProposal(raw, context) {
  const confidence = Math.max(0, Math.min(1, Number(raw.confidence || 0)));
  const allowedPriority = new Set(['BAJA', 'MEDIA', 'ALTA', 'CRITICA']);
  return {
    case_type: String(raw.case_type || context.case_record.case_type).toUpperCase(),
    consulted_data: raw.consulted_data && typeof raw.consulted_data === 'object' ? raw.consulted_data : {},
    proposed_action: String(raw.proposed_action || '').slice(0, 2000),
    response_draft: String(raw.response_draft || '').slice(0, 3000),
    justification: String(raw.justification || '').slice(0, 2000),
    confidence,
    priority: allowedPriority.has(String(raw.priority).toUpperCase()) ? String(raw.priority).toUpperCase() : 'MEDIA',
    risks: Array.isArray(raw.risks) ? raw.risks.map(String).slice(0, 8) : ['Requiere revision humana'],
    final_status: 'PENDIENTE_REVISION'
  };
}

export async function createAgentProposal(db, caseId, env) {
  const caseRecord = db.prepare('SELECT * FROM cases WHERE id=?').get(caseId);
  if (!caseRecord) throw new Error('Caso no encontrado');
  const customer = caseRecord.customer_id ? db.prepare('SELECT * FROM customers WHERE id=?').get(caseRecord.customer_id) : null;
  const order = caseRecord.order_id ? db.prepare('SELECT * FROM orders WHERE id=?').get(caseRecord.order_id) : null;
  const items = order ? db.prepare('SELECT * FROM order_items WHERE order_id=?').all(order.id) : [];
  const history = customer ? db.prepare('SELECT id,case_type,subject,status,opened_at,resolved_at FROM cases WHERE customer_id=? AND id<>? ORDER BY id DESC LIMIT 10').all(customer.id, caseId) : [];
  const context = { case_record: caseRecord, customer, order: order ? { ...order, items } : null, history };

  let raw;
  let model;
  try {
    if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY no configurada');
    raw = await callGemini(context, env);
    model = env.GEMINI_MODEL;
  } catch (error) {
    raw = fallbackProposal(context);
    model = `CONTINGENCIA_REGLAS: ${String(error.message || error).slice(0, 120)}`;
  }
  const proposal = normalizeProposal(raw, context);
  const result = db.prepare(`INSERT INTO agent_proposals
    (case_id,case_type,consulted_data_json,proposed_action,response_draft,justification,confidence,priority,risks_json,model,status)
    VALUES(?,?,?,?,?,?,?,?,?,?,'PENDIENTE_REVISION')`).run(
    caseId,
    proposal.case_type,
    JSON.stringify(proposal.consulted_data),
    proposal.proposed_action,
    proposal.response_draft,
    proposal.justification,
    proposal.confidence,
    proposal.priority,
    JSON.stringify(proposal.risks),
    model
  );
  db.prepare('UPDATE cases SET priority=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(proposal.priority, caseId);
  audit(db, {
    actorType: 'AGENT', actorId: model, action: 'proposal.created',
    entityType: 'agent_proposal', entityId: result.lastInsertRowid,
    details: { case_id: caseId, confidence: proposal.confidence, priority: proposal.priority, status: 'PENDIENTE_REVISION' }
  });
  return db.prepare('SELECT * FROM agent_proposals WHERE id=?').get(result.lastInsertRowid);
}
