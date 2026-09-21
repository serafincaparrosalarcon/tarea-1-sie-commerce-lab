import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { events, orders, returns } from "../../../db/schema";

export async function GET() {
  try {
    const db = getDb(); const rows = await db.select().from(returns).orderBy(desc(returns.id)); const orderRows = await db.select().from(orders);
    return Response.json({ returns: rows.map((r) => ({ ...r, order: orderRows.find((o) => o.id === r.orderId) ?? null })) });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudieron cargar" }, { status: 500 }); }
}
export async function POST(request: Request) {
  try {
    const body = await request.json() as { orderId?: number; reason?: string; details?: string };
    if (!Number.isInteger(body.orderId) || !body.reason?.trim()) return Response.json({ error: "Selecciona un motivo" }, { status: 400 });
    const db = getDb(); const [order] = await db.select().from(orders).where(eq(orders.id, body.orderId!)); if (!order) return Response.json({ error: "Pedido no encontrado" }, { status: 404 });
    const [row] = await db.insert(returns).values({ orderId: order.id, reason: body.reason.trim(), details: body.details?.trim() || "", refundAmount: order.total }).returning();
    await db.insert(events).values({ eventType: "return.requested", sessionId: "SES-CLIENTE", orderId: order.id, payload: JSON.stringify({ returnId: row.id, reason: row.reason }) });
    return Response.json({ return: row }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo solicitar" }, { status: 500 }); }
}
export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { id?: number; status?: string }; const valid = ["SOLICITADA", "APROBADA", "RECHAZADA", "REEMBOLSO_SIMULADO"];
    if (!Number.isInteger(body.id) || !valid.includes(body.status || "")) return Response.json({ error: "Estado no válido" }, { status: 400 });
    const [row] = await getDb().update(returns).set({ status: body.status!, updatedAt: new Date().toISOString() }).where(eq(returns.id, body.id!)).returning();
    return row ? Response.json({ return: row }) : Response.json({ error: "Solicitud no encontrada" }, { status: 404 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo actualizar" }, { status: 500 }); }
}
