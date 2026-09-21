import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { products } from "../../../db/schema";
import { seedProducts } from "../../../lib/store-data";
export async function GET(request: Request) {
  try { const db = getDb(); for (const product of seedProducts) await db.insert(products).values(product).onConflictDoNothing(); const all = new URL(request.url).searchParams.get("all") === "1"; const rows = await db.select().from(products).orderBy(asc(products.id)); return Response.json({ products: all ? rows : rows.filter((p) => p.active) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo cargar el catálogo" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<typeof products.$inferInsert>;
    if (!body.sku?.trim() || !body.name?.trim() || !body.category?.trim() || !body.description?.trim() || Number(body.price) <= 0)
      return Response.json({ error: "Completa SKU, nombre, categoría, descripción y precio" }, { status: 400 });
    const [product] = await getDb().insert(products).values({ sku: body.sku.trim().toUpperCase(), name: body.name.trim(), category: body.category.trim(), description: body.description.trim(), price: Number(body.price), stock: Math.max(0, Number(body.stock ?? 0)), accent: body.accent || "blue", imageUrl: body.imageUrl?.trim() || null, active: true }).returning();
    return Response.json({ product }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo crear el producto" }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as Partial<typeof products.$inferSelect>;
    if (!Number.isInteger(body.id)) return Response.json({ error: "Producto no válido" }, { status: 400 });
    const [product] = await getDb().update(products).set({ name: body.name?.trim(), category: body.category?.trim(), description: body.description?.trim(), price: body.price == null ? undefined : Number(body.price), stock: body.stock == null ? undefined : Math.max(0, Number(body.stock)), imageUrl: body.imageUrl?.trim() || null, active: body.active }).where(eq(products.id, body.id!)).returning();
    return product ? Response.json({ product }) : Response.json({ error: "Producto no encontrado" }, { status: 404 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo actualizar" }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id)) return Response.json({ error: "Producto no válido" }, { status: 400 });
    const [product] = await getDb().update(products).set({ active: false }).where(eq(products.id, id)).returning();
    return product ? Response.json({ product }) : Response.json({ error: "Producto no encontrado" }, { status: 404 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo ocultar" }, { status: 500 }); }
}
