import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const workspaceDir = path.resolve(import.meta.dirname, '..');
const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const runtimePython = process.env.CODEX_PRIMARY_RUNTIME_PYTHON;
if (!runtimeModules || !runtimePython) throw new Error('Runtime de presentaciones no disponible');
const artifact = await import(pathToFileURL(path.join(runtimeModules, '@oai/artifact-tool/dist/artifact_tool.mjs')).href);
const { Presentation, PresentationFile } = artifact;
const { finalizePresentation } = await import(pathToFileURL('/root/.codex/skills/builtins/presentations/container_tools/artifact_tool_utils.mjs').href);

const buildDir = path.join(workspaceDir, '.presentation-build');
const previewDir = path.join(buildDir, 'previews');
const outputDir = path.join(workspaceDir, 'output', 'presentation');
const finalPath = path.join(outputDir, 'Defensa_Sensoria_Tarea_2_FINAL.pptx');
await fs.mkdir(previewDir, { recursive: true });
await fs.mkdir(outputDir, { recursive: true });

const W = 1280, H = 720;
const C = { navy: '#102F42', teal: '#2D6F75', mint: '#E5F1EF', gold: '#D7A75E', ink: '#173341', muted: '#627983', line: '#D7E3E3', white: '#FFFFFF', mist: '#F5F8F7', green: '#2E7D61', red: '#A64A46', amber: '#A96D24' };
const FONT = 'DejaVu Sans';
const presentation = Presentation.create({ slideSize: { width: W, height: H } });

function addText(slide, text, position, size = 20, color = C.ink, bold = false, name = undefined, align = 'left') {
  const shape = slide.shapes.add({ name, geometry: 'textbox', position, fill: 'none', line: { style: 'solid', fill: 'none', width: 0 } });
  shape.text = text;
  shape.text.style = { typeface: FONT, fontSize: `${size}pt`, color, bold, alignment: align, verticalAlignment: 'middle' };
  return shape;
}

function rect(slide, position, fill, radius = false, line = 'none', name = undefined) {
  return slide.shapes.add({ name, geometry: radius ? 'roundRect' : 'rect', position, fill, line: { style: 'solid', fill: line, width: line === 'none' ? 0 : 1 } });
}

function title(slide, text, section) {
  addText(slide, section.toUpperCase(), { left: 72, top: 42, width: 500, height: 24 }, 10, C.teal, true);
  addText(slide, text, { left: 72, top: 68, width: 1136, height: 60 }, 32, C.navy, true, 'slide-title');
  rect(slide, { left: 72, top: 137, width: 94, height: 4 }, C.gold);
}

function footer(slide, number) {
  addText(slide, 'SENSORIA · PROTOTIPO ACADÉMICO', { left: 72, top: 681, width: 360, height: 18 }, 8, C.muted, true);
  addText(slide, `${String(number).padStart(2, '0')} / 06`, { left: 1080, top: 681, width: 128, height: 18 }, 8, C.muted, false, undefined, 'right');
}

function arrow(slide, left, top, width = 62) {
  const s = slide.shapes.add({ geometry: 'rightArrow', position: { left, top, width, height: 34 }, fill: C.gold, line: { style: 'solid', fill: C.gold, width: 0 } });
  return s;
}

// 1 Cover
{
  const slide = presentation.slides.add();
  slide.background.fill = C.navy;
  rect(slide, { left: 74, top: 72, width: 10, height: 540 }, C.gold);
  addText(slide, 'SENSORIA', { left: 118, top: 92, width: 500, height: 60 }, 18, C.gold, true);
  addText(slide, 'Sistema empresarial\nintegrado', { left: 112, top: 190, width: 900, height: 180 }, 48, C.white, true, 'cover-title');
  addText(slide, 'Back-office independiente, n8n y agente supervisado', { left: 118, top: 404, width: 900, height: 62 }, 22, '#D7E7E8');
  addText(slide, 'Tarea 2 · Sistema Integrado de Empresa\nDefensa de 7 minutos', { left: 118, top: 555, width: 600, height: 58 }, 13, '#BFD3D5');
  slide.speakerNotes.text = 'Presentar el objetivo en 30 segundos. Sensoria pasa de una tienda aislada a tres sistemas integrados. Aclarar que todos los pagos y reembolsos son simulados.';
}

// 2 Architecture
{
  const slide = presentation.slides.add(); slide.background.fill = C.white; title(slide, 'Arquitectura independiente', '01 · Solución');
  const blocks = [
    { x: 74, t: 'Sensoria Store', s: 'PHP + MySQL\nCompra, cuenta y outbox', f: C.navy },
    { x: 442, t: 'n8n', s: 'Webhook + JavaScript\nValida, firma y enruta', f: C.teal },
    { x: 810, t: 'Operations', s: 'Node + SQLite\nGestiona, mide y audita', f: C.navy },
  ];
  for (const b of blocks) {
    rect(slide, { left: b.x, top: 225, width: 300, height: 190 }, b.f, true);
    addText(slide, b.t, { left: b.x + 25, top: 255, width: 250, height: 45 }, 24, C.white, true, `block-${b.t}`);
    addText(slide, b.s, { left: b.x + 25, top: 315, width: 250, height: 70 }, 16, '#D9E7E8');
  }
  arrow(slide, 376, 303); arrow(slide, 744, 303);
  addText(slide, 'Evento JSON + HMAC', { left: 334, top: 265, width: 150, height: 24 }, 10, C.teal, true, undefined, 'center');
  addText(slide, 'API idempotente', { left: 708, top: 265, width: 130, height: 24 }, 10, C.teal, true, undefined, 'center');
  addText(slide, 'Cada sistema conserva su acceso y sus datos. El trace_id permite seguir un evento de extremo a extremo.', { left: 140, top: 482, width: 1000, height: 62 }, 20, C.ink, false, 'architecture-takeaway', 'center');
  addText(slide, 'Outbox', { left: 150, top: 585, width: 150, height: 28 }, 15, C.green, true, undefined, 'center');
  addText(slide, 'Idempotencia', { left: 565, top: 585, width: 150, height: 28 }, 15, C.green, true, undefined, 'center');
  addText(slide, 'Auditoría', { left: 980, top: 585, width: 150, height: 28 }, 15, C.green, true, undefined, 'center');
  footer(slide, 2);
  slide.speakerNotes.text = 'Explicar el recorrido Store, n8n y Operations. El outbox evita que una caída de n8n anule el pedido. HMAC autentica y la idempotencia permite reintentar.';
}

// 3 Scenarios
{
  const slide = presentation.slides.add(); slide.background.fill = C.mist; title(slide, 'Tres escenarios reproducibles', '02 · Integración');
  const values = [
    ['Escenario', 'Evento', 'Datos principales', 'Resultado'],
    ['Pedido', 'order.created', 'Cliente, productos, importe, fecha', 'Pedido con líneas'],
    ['Cambio operativo', 'order.status_changed', 'Pedido, estado anterior y nuevo', 'Estado sincronizado'],
    ['Postventa', 'support.requested', 'Caso, cliente, pedido y mensaje', 'Caso para revisión'],
  ];
  const table = slide.tables.add({ rows: 4, columns: 4, left: 72, top: 190, width: 1136, height: 290, columnWidths: [210, 260, 390, 276], values });
  table.styleOptions = { headerRow: true, bandedRows: true };
  table.borders.assign({ style: 'solid', fill: C.line, width: 1 });
  for (let c = 0; c < 4; c++) { table.getCell(0, c).fill = C.navy; table.getCell(0, c).text.style = { typeface: FONT, fontSize: '15pt', bold: true, color: C.white }; }
  for (let r = 1; r < 4; r++) for (let c = 0; c < 4; c++) table.getCell(r, c).text.style = { typeface: FONT, fontSize: '14pt', color: C.ink, bold: c === 0 };
  addText(slide, 'Rama válida', { left: 95, top: 535, width: 235, height: 35 }, 18, C.green, true, undefined, 'center');
  addText(slide, '201 / 202 + entidad + trace_id', { left: 70, top: 575, width: 285, height: 42 }, 14, C.ink, false, undefined, 'center');
  addText(slide, 'Reintento', { left: 520, top: 535, width: 235, height: 35 }, 18, C.teal, true, undefined, 'center');
  addText(slide, 'duplicate: true, sin segunda escritura', { left: 465, top: 575, width: 345, height: 42 }, 14, C.ink, false, undefined, 'center');
  addText(slide, 'Rama de error', { left: 940, top: 535, width: 235, height: 35 }, 18, C.red, true, undefined, 'center');
  addText(slide, '401 / 422 + causa registrada', { left: 910, top: 575, width: 295, height: 42 }, 14, C.ink, false, undefined, 'center');
  footer(slide, 3);
  slide.speakerNotes.text = 'Demostrar los tres payloads. Abrir el pedido y desplegar Aura Wave y Pebble Calm. Repetir un evento para enseñar duplicate. Enviar el payload inválido para mostrar 422.';
}

// 4 Dashboard
{
  const slide = presentation.slides.add(); slide.background.fill = C.white; title(slide, 'Métricas operativas en tiempo real', '03 · Analítica');
  const metrics = [['1', 'Pedidos'], ['93,85 €', 'Ingresos demo'], ['1', 'Casos abiertos'], ['100 %', 'Integración'], ['1', 'Propuestas IA']];
  metrics.forEach((m, i) => { const x = 74 + i * 222; addText(slide, m[0], { left: x, top: 165, width: 190, height: 54 }, 28, C.navy, true, undefined, 'center'); addText(slide, m[1].toUpperCase(), { left: x, top: 220, width: 190, height: 28 }, 10, C.teal, true, undefined, 'center'); });
  slide.charts.add('bar', {
    position: { left: 92, top: 305, width: 700, height: 300 },
    categories: ['PAGO', 'PREPARACIÓN', 'ENVIADO', 'ENTREGADO'],
    series: [{ name: 'Pedidos', values: [0, 1, 0, 0], fill: C.teal }],
    hasLegend: false,
    dataLabels: { showValue: true, position: 'outEnd', textStyle: { typeface: FONT, fontSize: 14, fill: C.navy } },
    xAxis: { textStyle: { typeface: FONT, fontSize: 12, fill: C.muted } },
    yAxis: { textStyle: { typeface: FONT, fontSize: 11, fill: C.muted }, majorGridlines: { style: 'solid', fill: C.line, width: 1 } },
  });
  addText(slide, 'También calculamos', { left: 875, top: 325, width: 285, height: 34 }, 18, C.navy, true);
  addText(slide, 'Tiempo medio de resolución\nÉxitos y errores por tipo\nProductos más solicitados\nPropuestas pendientes y aprobadas', { left: 875, top: 375, width: 310, height: 155 }, 16, C.ink);
  addText(slide, 'Los valores salen de SQLite, no de textos escritos a mano.', { left: 875, top: 552, width: 300, height: 52 }, 15, C.green, true);
  footer(slide, 4);
  slide.speakerNotes.text = 'Mostrar cinco métricas y el gráfico. Aclarar que el dashboard consulta la base de datos. Abrir Integraciones y Auditoría para enseñar éxito, error y actor.';
}

// 5 Agent
{
  const slide = presentation.slides.add(); slide.background.fill = C.mist; title(slide, 'Agente supervisado', '04 · Inteligencia artificial');
  const steps = [
    { x: 70, n: '1', t: 'Consulta', s: 'Caso, cliente, pedido e historial', c: C.navy },
    { x: 350, n: '2', t: 'Propuesta', s: 'Acción, borrador, confianza y riesgos', c: C.teal },
    { x: 630, n: '3', t: 'Revisión', s: 'El administrador aprueba o rechaza', c: C.gold },
    { x: 910, n: '4', t: 'Telegram', s: 'Solo después de la aprobación', c: C.green },
  ];
  for (const st of steps) {
    const circle = slide.shapes.add({ geometry: 'ellipse', position: { left: st.x, top: 222, width: 64, height: 64 }, fill: st.c, line: { style: 'solid', fill: st.c, width: 0 } });
    circle.text = st.n; circle.text.style = { typeface: FONT, fontSize: '24pt', bold: true, color: C.white, alignment: 'center', verticalAlignment: 'middle' };
    addText(slide, st.t, { left: st.x - 28, top: 306, width: 220, height: 38 }, 20, C.navy, true);
    addText(slide, st.s, { left: st.x - 28, top: 352, width: 235, height: 80 }, 15, C.ink);
  }
  arrow(slide, 270, 238, 52); arrow(slide, 550, 238, 52); arrow(slide, 830, 238, 52);
  rect(slide, { left: 110, top: 505, width: 1060, height: 105 }, C.navy, true);
  addText(slide, 'La IA propone. Una persona decide.', { left: 165, top: 524, width: 950, height: 42 }, 26, C.white, true, undefined, 'center');
  addText(slide, 'Revisor, fecha, decisión y resultado de Telegram quedan en auditoría.', { left: 165, top: 565, width: 950, height: 28 }, 15, '#D5E6E7', false, undefined, 'center');
  footer(slide, 5);
  slide.speakerNotes.text = 'Generar una propuesta y señalar tipo, datos consultados, acción, justificación, confianza, prioridad y riesgos. Demostrar que queda pendiente. Aprobar y mostrar Telegram simulado o real.';
}

// 6 Decision and close
{
  const slide = presentation.slides.add(); slide.background.fill = C.white; title(slide, 'Decisión tecnológica y cierre', '05 · Evaluación');
  const values = [['Alternativa', 'Puntuación / 5', 'Lectura'], ['Desarrollo propio', '4,60', 'Control alto, más esfuerzo'], ['SaaS / CRM', '3,45', 'Coste y dependencia'], ['Arquitectura híbrida', '4,60', 'Control con menor riesgo']];
  const table = slide.tables.add({ rows: 4, columns: 3, left: 72, top: 180, width: 710, height: 290, columnWidths: [260, 180, 270], values });
  table.styleOptions = { headerRow: true, bandedRows: true }; table.borders.assign({ style: 'solid', fill: C.line, width: 1 });
  for (let c = 0; c < 3; c++) { table.getCell(0, c).fill = C.navy; table.getCell(0, c).text.style = { typeface: FONT, fontSize: '14pt', bold: true, color: C.white }; }
  for (let r = 1; r < 4; r++) for (let c = 0; c < 3; c++) table.getCell(r, c).text.style = { typeface: FONT, fontSize: '14pt', color: C.ink, bold: r === 3 || c === 1 };
  for (let c = 0; c < 3; c++) table.getCell(3, c).fill = C.mint;
  addText(slide, '6 / 6', { left: 880, top: 190, width: 250, height: 80 }, 44, C.green, true, undefined, 'center');
  addText(slide, 'PRUEBAS SUPERADAS', { left: 865, top: 270, width: 280, height: 30 }, 12, C.teal, true, undefined, 'center');
  addText(slide, 'Pedido con productos\nRamas de éxito y error\nIdempotencia\nAgente con aprobación', { left: 865, top: 340, width: 300, height: 155 }, 17, C.ink, false, undefined, 'center');
  rect(slide, { left: 72, top: 535, width: 1136, height: 82 }, C.navy, true);
  addText(slide, 'Resultado: integración demostrable, métricas reales y control humano', { left: 120, top: 550, width: 1040, height: 50 }, 24, C.white, true, undefined, 'center');
  footer(slide, 6);
  slide.speakerNotes.text = 'Cerrar con la matriz. La híbrida reduce el riesgo de entrega y conserva el control. Mencionar 6 de 6 pruebas. Antes de entregar hay que completar las URL públicas de Operations y n8n.';
}

for (const [index, slide] of presentation.slides.items.entries()) {
  const blob = await presentation.export({ slide, format: 'png', scale: 1 });
  await fs.writeFile(path.join(previewDir, `slide-${String(index + 1).padStart(2, '0')}.png`), new Uint8Array(await blob.arrayBuffer()));
}
const montage = await presentation.export({ format: 'webp', montage: true, scale: 1 });
await fs.writeFile(path.join(buildDir, 'montage.webp'), new Uint8Array(await montage.arrayBuffer()));

const stagingDir = path.join(workspaceDir, '.codex-finalizer');
await fs.mkdir(stagingDir, { recursive: true });
const candidatePath = path.join(stagingDir, 'candidate.pptx');
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);

const requirements = {
  explicitTotalSlideCount: 6,
  requiredNativeTableOwnerSlides: [3, 6],
  requiredNativeChartOwnerSlides: [4],
  requiredEmbeddedWorkbookChartOwnerSlides: [],
  materializeLiteralChartWorkbooks: true,
  workspaceDir,
};
const result = await finalizePresentation({
  ...requirements,
  candidatePath,
  finalPath,
  pythonExecutable: runtimePython,
  integrityValidatorPath: '/root/.codex/skills/builtins/presentations/container_tools/inspect_presentation_package_integrity.py',
  layoutValidatorPath: '/root/.codex/skills/builtins/presentations/container_tools/inspect_presentation_layout_geometry.py',
  layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-bullet-geometry', '--validate-heading-fit', '--require-native-table-slide', '3', '--require-native-table-slide', '6'],
  fontPolicy: { basis: 'design', families: [FONT] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, 'Defensa_Sensoria_Tarea_2_FINAL.validation.json'),
});
console.log(JSON.stringify({ finalPath, validation: result }, null, 2));
