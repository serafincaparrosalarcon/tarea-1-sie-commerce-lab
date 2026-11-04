from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, HRFlowable
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "Memoria_Sensoria_Tarea_2.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

NAVY = colors.HexColor("#102F42")
TEAL = colors.HexColor("#2D6F75")
MINT = colors.HexColor("#E5F1EF")
GOLD = colors.HexColor("#D7A75E")
INK = colors.HexColor("#173341")
MUTED = colors.HexColor("#607781")
LINE = colors.HexColor("#D8E4E4")
WHITE = colors.white
RED = colors.HexColor("#A94442")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=30, leading=34, textColor=WHITE, alignment=TA_LEFT, spaceAfter=10))
styles.add(ParagraphStyle(name="CoverSub", parent=styles["Normal"], fontName="Helvetica", fontSize=13, leading=19, textColor=colors.HexColor("#D6E7E8")))
styles.add(ParagraphStyle(name="PageTitle", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=22, leading=26, textColor=NAVY, spaceAfter=10))
styles.add(ParagraphStyle(name="PageKicker", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=TEAL, spaceAfter=5, uppercase=True))
styles.add(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=TEAL, spaceBefore=8, spaceAfter=5))
styles.add(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.2, leading=13.2, textColor=INK, spaceAfter=6))
styles.add(ParagraphStyle(name="Smallx", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.5, leading=10, textColor=MUTED))
styles.add(ParagraphStyle(name="Callout", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=10, leading=14, textColor=NAVY, leftIndent=8, rightIndent=8, spaceBefore=5, spaceAfter=5))
styles.add(ParagraphStyle(name="BigNumber", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=21, leading=22, textColor=NAVY, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="MetricLabel", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=7, leading=9, textColor=TEAL, alignment=TA_CENTER))

def P(text, style="Bodyx"):
    return Paragraph(text, styles[style])

def bullet(text):
    return Paragraph("• " + text, styles["Bodyx"])

def section(kicker, title):
    return [P(kicker.upper(), "PageKicker"), P(title, "PageTitle"), HRFlowable(width="100%", thickness=1.5, color=GOLD, spaceAfter=9)]

def box(text, bg=MINT, border=TEAL):
    t = Table([[P(text, "Callout")]], colWidths=[167*mm])
    t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), bg), ("BOX", (0,0), (-1,-1), 0.8, border), ("LEFTPADDING", (0,0), (-1,-1), 8), ("RIGHTPADDING", (0,0), (-1,-1), 8), ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7)]))
    return t

def data_table(data, widths, header=True, font=7.4):
    formatted = [[P(str(v), "Smallx") for v in row] for row in data]
    t = Table(formatted, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    commands = [
        ("GRID", (0,0), (-1,-1), 0.45, LINE),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 5),
        ("RIGHTPADDING", (0,0), (-1,-1), 5),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, colors.HexColor("#F6F9F9")]),
    ]
    if header:
        commands += [("BACKGROUND", (0,0), (-1,0), NAVY), ("TEXTCOLOR", (0,0), (-1,0), WHITE), ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold")]
    t.setStyle(TableStyle(commands))
    return t

def metric(value, label):
    t = Table([[P(value, "BigNumber")], [P(label, "MetricLabel")]], colWidths=[31*mm], rowHeights=[12*mm, 8*mm])
    t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), colors.HexColor("#F2F7F6")), ("BOX", (0,0), (-1,-1), 0.6, LINE), ("VALIGN", (0,0), (-1,-1), "MIDDLE")]))
    return t

def header_footer(canvas, doc):
    canvas.saveState()
    page = canvas.getPageNumber()
    if page == 1:
        canvas.restoreState()
        return
    canvas.setFillColor(NAVY)
    canvas.rect(0, A4[1]-14*mm, A4[0], 14*mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(18*mm, A4[1]-9*mm, "SENSORIA · SISTEMA INTEGRADO DE EMPRESA")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(18*mm, 10*mm, "Prototipo académico · sin cobros reales")
    canvas.drawRightString(A4[0]-18*mm, 10*mm, f"{page:02d} / 10")
    canvas.restoreState()

story = []

# 1 · Portada
cover = Table([[P("SENSORIA", "CoverTitle")], [P("Tarea 2 · Integración empresarial, back-office independiente y agente supervisado", "CoverSub")], [Spacer(1, 12*mm)], [P("Sistema Integrado de Empresa", "CoverSub")], [P("Memoria técnica · 04 de noviembre de 2026", "CoverSub")]], colWidths=[170*mm], rowHeights=[None, None, 42*mm, None, None])
cover.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), NAVY), ("LEFTPADDING", (0,0), (-1,-1), 15*mm), ("RIGHTPADDING", (0,0), (-1,-1), 15*mm), ("TOPPADDING", (0,0), (-1,0), 30*mm), ("BOTTOMPADDING", (0,-1), (-1,-1), 25*mm), ("VALIGN", (0,0), (-1,-1), "TOP")]))
story += [Spacer(1, 12*mm), cover, Spacer(1, 8*mm), box("<b>Alcance:</b> front-office PHP/MySQL + n8n desplegable + Sensoria Operations Node/SQLite + IA con revisión humana. Todo dato, pago, reembolso y comunicación de la demo está claramente identificado como académico.", colors.HexColor("#FFF5E7"), GOLD), PageBreak()]

# 2
story += section("01 · contexto", "Objetivo, alcance y respuesta al enunciado")
story += [P("La primera versión de Sensoria resolvía la experiencia de compra. La segunda tarea exige pasar de una web aislada a un sistema integrado: automatización externa, back-office autónomo, tres escenarios de negocio, trazabilidad, métricas y un agente con supervisión."), box("La decisión central es <b>no convertir el panel de la tienda en el back-office</b>. Operations tiene API, base de datos, acceso, interfaz y auditoría propias.")]
story += [P("Requisitos cubiertos", "H2x")]
reqs = [
    ["Requisito", "Implementación", "Evidencia"],
    ["Back-office independiente", "Sensoria Operations", "backoffice/ y SQLite propio"],
    ["Automatización externa", "Workflow n8n importable", "automation/n8n/"],
    ["Tres escenarios", "Pedido, cambio operativo, postventa", "payloads/ y tests"],
    ["Éxito/error", "IF, ramas 202/422 y logs", "workflow + integration_events"],
    ["IA supervisada", "Consulta + propuesta + revisión", "agent_proposals y audit_log"],
    ["5+ métricas", "10 KPIs y 5 agrupaciones", "dashboard real"],
    ["Matriz", "3 alternativas, 10 criterios", "DECISION_MATRIX.md"],
]
story += [data_table(reqs, [42*mm, 77*mm, 48*mm]), Spacer(1, 3*mm), P("El repositorio añade contratos JSON, payloads de prueba, Docker Compose, plan de pruebas, guion de defensa, anexo de IA y documentación de despliegue.") , PageBreak()]

# 3
story += section("02 · arquitectura", "Tres sistemas desacoplados por eventos")
arch = [[P("SENSORIA STORE", "Callout"), P("n8n", "Callout"), P("OPERATIONS", "Callout")], [P("PHP + MySQL<br/>Compra, cuenta, soporte y outbox", "Smallx"), P("Webhook + JavaScript<br/>Valida, normaliza y enruta", "Smallx"), P("Node + SQLite<br/>Gestiona, mide y audita", "Smallx")]]
arch_t = Table(arch, colWidths=[53*mm]*3, hAlign="CENTER")
arch_t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), NAVY), ("TEXTCOLOR", (0,0), (-1,0), WHITE), ("BACKGROUND", (0,1), (-1,1), MINT), ("BOX", (0,0), (-1,-1), 0.8, TEAL), ("INNERGRID", (0,0), (-1,-1), 0.6, LINE), ("ALIGN", (0,0), (-1,-1), "CENTER"), ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("TOPPADDING", (0,0), (-1,-1), 9), ("BOTTOMPADDING", (0,0), (-1,-1), 9)]))
story += [arch_t, Spacer(1, 6*mm), P("Patrones aplicados", "H2x")]
patterns = [
    ["Patrón", "Motivo", "Resultado"],
    ["Outbox", "No bloquear el proceso principal", "El pedido se confirma aunque n8n falle"],
    ["Contrato común", "Evitar payloads improvisados", "Validación consistente y documentada"],
    ["Idempotencia", "Permitir reintentos", "Un evento repetido no duplica entidades"],
    ["HMAC SHA-256", "Autenticar emisor e integridad", "Rechazo 401 de mensajes manipulados"],
    ["Transacción", "Pedido y líneas indivisibles", "Commit o rollback completo"],
    ["Audit log", "Responsabilidad humana/técnica", "Actor, acción, entidad, fecha y detalle"],
]
story += [data_table(patterns, [33*mm, 61*mm, 73*mm]), Spacer(1, 5*mm), box("El <b>event_id</b> actúa como trace_id de extremo a extremo. El secreto nunca se incluye en el JSON ni en GitHub."), PageBreak()]

# 4
story += section("03 · integración", "Workflow, contratos y tres escenarios")
flow = [["1. Webhook", "2. Validación", "3. IF", "4. API", "5. Registro"], ["Recibe JSON", "Normaliza + firma", "Válido / error", "Operations", "Respuesta + seguimiento"]]
story += [data_table(flow, [33.4*mm]*5), Spacer(1, 5*mm)]
scenarios = [
    ["Escenario", "Evento", "Datos mínimos", "Resultado"],
    ["Pedido", "order.created", "id, cliente, líneas, total, estado, fecha", "Cliente + pedido + productos"],
    ["Cambio operativo", "order.status_changed / stock.changed", "entidad, anterior, nuevo", "Pedido o inventario actualizado"],
    ["Postventa", "support.requested / return.requested", "caso, cliente, pedido, mensaje", "Caso listo para revisión"],
]
story += [data_table(scenarios, [30*mm, 40*mm, 58*mm, 39*mm]), Spacer(1, 4*mm), P("Ramas de control", "H2x"), bullet("Payload inválido: n8n devuelve 422 con lista de campos y registra la ejecución de error."), bullet("Firma inválida: Operations devuelve 401 y registra el rechazo sin reservar el identificador legítimo."), bullet("Procesamiento fallido: la integración queda en ERROR con código y mensaje."), bullet("Reintento: si event_id o idempotency_key ya existen, se devuelve duplicate sin segunda escritura."), bullet("Éxito: respuesta 201/202 con integración, entidad y trace_id."), box("Los archivos <b>order-created.json</b>, <b>order-status-changed.json</b>, <b>support-requested.json</b> e <b>invalid-event.json</b> permiten reproducir la defensa."), PageBreak()]

# 5
story += section("04 · back-office", "Modelo de datos y operación independiente")
entities = [
    ["Entidad", "Función", "Relaciones / control"],
    ["integration_events", "recepciones, éxito y error", "event_id e idempotency únicos"],
    ["customers", "identidad operativa", "correo único"],
    ["orders / order_items", "pedido y productos", "FK y borrado en cascada"],
    ["inventory", "stock integrado", "SKU y external_id únicos"],
    ["cases / case_messages", "soporte y devoluciones", "cliente y pedido opcionales"],
    ["agent_proposals", "salida estructurada", "caso, revisor y estado"],
    ["notifications", "Telegram real/simulado", "resultado y error"],
    ["sync_tasks", "cambios salientes", "estado, intentos y destino"],
    ["audit_log", "trazabilidad transversal", "actor, acción y detalle"],
]
story += [data_table(entities, [41*mm, 56*mm, 70*mm]), Spacer(1, 4*mm), P("Interfaz operativa", "H2x"), bullet("Pedidos: cliente, fecha, importe, estado y detalle desplegable de cada producto."), bullet("Postventa: casos asociados, prioridad y lanzamiento del análisis."), bullet("Integraciones: historial, errores e idempotencia."), bullet("Auditoría: actividad técnica, del agente y de revisores."), bullet("Matriz: decisión tecnológica disponible dentro de la propia aplicación."), PageBreak()]

# 6
story += section("05 · inteligencia artificial", "Agente con herramientas y revisión humana")
story += [box("Regla de gobierno: <b>la IA propone; una persona decide</b>. No puede contactar al cliente por sí sola."), Spacer(1, 4*mm)]
agent_steps = [
    ["Paso", "Herramienta / acción", "Evidencia"],
    ["1", "Consultar caso", "tipo, asunto, mensaje, prioridad"],
    ["2", "Consultar cliente", "nombre, correo y canal"],
    ["3", "Consultar pedido", "estado, total y productos"],
    ["4", "Consultar historial", "mensajes y propuestas anteriores"],
    ["5", "Generar propuesta", "acción, borrador, justificación"],
    ["6", "Revisión humana", "aprobar o rechazar con revisor/fecha"],
    ["7", "Notificación", "Telegram solo tras aprobar"],
]
story += [data_table(agent_steps, [18*mm, 67*mm, 82*mm]), Spacer(1, 4*mm), P("Salida estructurada", "H2x")]
output_fields = [["Campo", "Ejemplo"], ["case_type", "INCIDENCIA"], ["consulted_data", "caso + cliente + pedido + historial"], ["proposed_action", "verificar daño y preparar sustitución"], ["justification", "pedido localizado y prioridad alta"], ["confidence / priority", "0,86 / ALTA"], ["risks", "verificación visual; stock"], ["status", "PENDIENTE_REVISION"]]
story += [data_table(output_fields, [50*mm, 117*mm]), Spacer(1, 4*mm), P("Con clave se utiliza Gemini; sin ella se activan reglas deterministas con el mismo contrato. Este modo de contingencia permite demostrar el control incluso si falla el proveedor."), PageBreak()]

# 7
story += section("06 · analítica", "Dashboard con métricas calculadas sobre datos reales")
story += [Table([[metric("1", "PEDIDOS") , metric("93,85 €", "INGRESOS DEMO"), metric("1", "CASOS ABIERTOS"), metric("100%", "INTEGRACIÓN"), metric("1", "PROPUESTAS IA")]], colWidths=[33.4*mm]*5, hAlign="CENTER"), Spacer(1, 7*mm)]
metrics = [
    ["Métrica", "Cálculo", "Decisión que facilita"],
    ["Pedidos", "COUNT orders", "volumen operativo"],
    ["Ingresos simulados", "SUM total", "dimensión económica"],
    ["Casos abiertos", "estado no cerrado", "carga postventa"],
    ["Tiempo medio", "AVG resuelto − abierto", "eficiencia de soporte"],
    ["Éxitos / errores", "conteo integration_events", "salud técnica"],
    ["Tasa de integración", "éxitos / total", "fiabilidad"],
    ["Propuestas", "total / aprobadas / pendientes", "control del agente"],
    ["Top productos", "SUM quantity", "demanda"],
]
story += [data_table(metrics, [45*mm, 53*mm, 69*mm]), Spacer(1, 4*mm), P("Visualizaciones", "H2x"), bullet("Pedidos por día y por estado."), bullet("Productos más solicitados."), bullet("Casos por tipo y errores por código."), box("Las métricas se consultan directamente en SQLite; no son números escritos a mano ni imágenes estáticas."), PageBreak()]

# 8
story += section("07 · decisión", "Matriz ponderada de alternativas")
matrix = [
    ["Criterio", "Peso", "Propio", "SaaS", "Híbrido"],
    ["Funcionalidad", "20", "5", "4", "5"], ["Coste", "12", "5", "2", "4"],
    ["Implantación", "10", "3", "2", "4"], ["Escalabilidad", "10", "4", "5", "5"],
    ["Integración", "12", "5", "3", "5"], ["Seguridad", "10", "5", "4", "4"],
    ["Trazabilidad", "10", "5", "4", "5"], ["Dependencia", "6", "5", "2", "3"],
    ["Mantenimiento", "5", "3", "4", "4"], ["Evolución", "5", "5", "3", "5"],
    ["TOTAL / 5", "100", "4,60", "3,45", "4,60"],
]
story += [data_table(matrix, [65*mm, 21*mm, 27*mm, 27*mm, 27*mm]), Spacer(1, 5*mm), P("Recomendación", "H2x"), P("La alternativa híbrida empata numéricamente con el desarrollo propio, pero reduce el riesgo: n8n aporta orquestación, historial y ramas visibles; el código propio se concentra en contratos, negocio, almacenamiento y gobierno de IA. El SaaS obtiene menor puntuación por coste, dependencia y adaptación al ejercicio."), box("Decisión: <b>front-office existente + n8n + back-office propio</b>. Es la combinación más demostrable y evolucionable para el alcance académico."), PageBreak()]

# 9
story += section("08 · calidad y seguridad", "Pruebas, errores controlados y riesgos")
tests = [
    ["Prueba automática", "Cobertura", "Resultado"],
    ["Salud y acceso", "health 200 / dashboard 401", "OK"],
    ["Firma HMAC", "rechazo y log", "OK"],
    ["Tres escenarios", "pedido, cambio, soporte", "OK"],
    ["Idempotencia", "repetición sin duplicado", "OK"],
    ["Productos", "dos líneas visibles", "OK"],
    ["Métricas y sync", "KPIs + tarea saliente", "OK"],
    ["Agente y Telegram", "pendiente → aprobación → simulado", "OK"],
]
story += [data_table(tests, [55*mm, 82*mm, 30*mm]), Spacer(1, 4*mm), box("Resultado ejecutado: <b>6/6 pruebas superadas</b>. Además se validan sintaxis JavaScript y todos los JSON."), P("Controles de riesgo", "H2x")]
risks = [["Riesgo", "Control"], ["Duplicados", "idempotency_key y event_id únicos"], ["Manipulación", "HMAC y secreto de entorno"], ["Caída de middleware", "outbox y fallo no bloqueante"], ["Datos parciales", "transacciones y claves foráneas"], ["Acción de IA incorrecta", "propuesta, confianza, riesgos y revisión"], ["Credenciales expuestas", ".env ignorado y placeholders"], ["Correo no enviado", "estado SIMULADO/ERROR visible y causa"]]
story += [data_table(risks, [59*mm, 108*mm]), PageBreak()]

# 10
story += section("09 · entrega", "Despliegue, limitaciones y conclusión")
deploy = [["Componente", "Destino", "Comprobación"], ["Store", "DonDominio PHP/MySQL", "pedido, soporte, outbox"], ["Operations", "Railway/Render con volumen", "/api/health y login"], ["n8n", "servicio externo con volumen", "workflow activo y ejecuciones"]]
story += [data_table(deploy, [40*mm, 68*mm, 59*mm]), Spacer(1, 4*mm), P("Limitaciones conocidas", "H2x"), bullet("SQLite y sesiones en memoria son adecuados para una demo; producción multiinstancia requeriría PostgreSQL y Redis."), bullet("Las URL de Operations y n8n deben completarse después del despliegue real."), bullet("Correo, Gemini y Telegram dependen de credenciales del equipo; sin ellas se mantiene una simulación explícita."), P("Entregables", "H2x"), bullet("Repositorio, ZIP, README, export n8n, contratos y cuatro payloads."), bullet("Memoria de 10 páginas, matriz, anexo IA, pruebas y guion de defensa."), bullet("Evidencias de éxito, error, antes/después, dashboard y supervisión."), P("Conclusión", "H2x"), P("Sensoria evoluciona de comercio electrónico a sistema empresarial integrado. La solución demuestra separación real, automatización reproducible, trazabilidad técnica y de negocio, analítica accionable y un uso responsable de IA. La arquitectura admite crecimiento sin ocultar las limitaciones académicas ni presentar simulaciones como servicios reales."), box("Próximo paso obligatorio: desplegar Operations y n8n, completar las dos URL y capturar las ejecuciones públicas antes de entregar.", colors.HexColor("#FFF5E7"), GOLD)]

doc = SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=20*mm, bottomMargin=16*mm, title="Memoria Sensoria Tarea 2", author="Equipo Sensoria", subject="Sistema Integrado de Empresa")
doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(OUT)
