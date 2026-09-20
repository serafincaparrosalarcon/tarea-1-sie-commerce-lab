import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { events } from "../../../db/schema";
import { allowedEvents } from "../../../lib/store-data";
export async function GET() { try { return Response.json({ events: await getDb().select().from(events).orderBy(desc(events.id)).limit(80) }); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudieron cargar los eventos" }, { status: 500 }); } }
export async function POST(request: Request) {
  try { const body = await request.json() as { eventType?: string; sessionId?: string; productId?: number; orderId?: number; payload?: unknown };
    if (!body.eventType || !allowedEvents.has(body.eventType) || !body.sessionId?.trim()) return Response.json({ error: "Evento o sesión no válidos" }, { status: 400 });
    const [event] = await getDb().insert(events).values({ eventType: body.eventType, sessionId: body.sessionId.trim().slice(0,80), productId: Number.isInteger(body.productId) ? body.productId : null, orderId: Number.isInteger(body.orderId) ? body.orderId : null, payload: JSON.stringify(body.payload ?? {}).slice(0,1500) }).returning();
    return Response.json({ event }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo registrar el evento" }, { status: 500 }); }
}
