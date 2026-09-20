import { asc, count } from "drizzle-orm";
import { getDb } from "../../../db";
import { products } from "../../../db/schema";
import { seedProducts } from "../../../lib/store-data";
export async function GET() {
  try { const db = getDb(); const [{ total }] = await db.select({ total: count() }).from(products); if (total === 0) await db.insert(products).values(seedProducts); return Response.json({ products: await db.select().from(products).orderBy(asc(products.id)) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo cargar el catálogo" }, { status: 500 }); }
}
