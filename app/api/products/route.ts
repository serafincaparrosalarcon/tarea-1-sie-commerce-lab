import { asc } from "drizzle-orm";
import { getDb } from "../../../db";
import { products } from "../../../db/schema";
import { seedProducts } from "../../../lib/store-data";
export async function GET() {
  try { const db = getDb(); for (const product of seedProducts) await db.insert(products).values(product).onConflictDoUpdate({target:products.sku,set:product}); return Response.json({ products: await db.select().from(products).orderBy(asc(products.id)) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo cargar el catálogo" }, { status: 500 }); }
}
