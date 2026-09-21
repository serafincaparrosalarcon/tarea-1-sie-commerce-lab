import { desc, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { orderItems, orders } from "../../../db/schema";

export async function GET() {
  try {
    const db = getDb(); const rows = await db.select().from(orders).orderBy(desc(orders.id)); const ids = rows.map((o) => o.id); const items = ids.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, ids)) : [];
    const map = new Map<string, { email: string; name: string; orders: number; spend: number; lastOrder: string; products: Record<string, number> }>();
    rows.forEach((o) => { const email = o.customerEmail || `${o.customerAlias}@demo.local`; const c = map.get(email) || { email, name: o.customerAlias, orders: 0, spend: 0, lastOrder: o.createdAt, products: {} }; c.orders += 1; c.spend += o.total; if (o.createdAt > c.lastOrder) c.lastOrder = o.createdAt; items.filter((i) => i.orderId === o.id).forEach((i) => c.products[i.productName] = (c.products[i.productName] || 0) + i.quantity); map.set(email, c); });
    const customers = [...map.values()].map((c) => ({ ...c, favoriteProduct: Object.entries(c.products).sort((a,b) => b[1]-a[1])[0]?.[0] || "—", segment: c.spend >= 500 || c.orders >= 4 ? "VIP" : c.orders >= 2 ? "Recurrente" : "Nuevo" })).sort((a,b) => b.spend-a.spend);
    return Response.json({ customers });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo generar el CRM" }, { status: 500 }); }
}
