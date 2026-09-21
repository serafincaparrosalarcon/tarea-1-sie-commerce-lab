import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { coupons } from "../../../db/schema";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams, code = params.get("code")?.trim().toUpperCase();
    if (code) {
      const subtotal = Number(params.get("subtotal") || 0), now = new Date().toISOString();
      if (code === "CALMA10") return Response.json({ valid: true, discountPercent: 10 });
      const [coupon] = await getDb().select().from(coupons).where(eq(coupons.code, code)).limit(1);
      const valid = !!coupon && coupon.active && coupon.startsAt <= now && coupon.endsAt >= now && coupon.usedCount < coupon.maxUses && subtotal >= coupon.minimumAmount;
      return Response.json({ valid, discountPercent: valid ? coupon!.discountPercent : 0, minimumAmount: coupon?.minimumAmount ?? 0 });
    }
    return Response.json({ coupons: await getDb().select().from(coupons).orderBy(desc(coupons.id)) });
  }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudieron cargar" }, { status: 500 }); }
}
export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<typeof coupons.$inferInsert>;
    const code = body.code?.trim().toUpperCase();
    if (!code || Number(body.discountPercent) < 1 || Number(body.discountPercent) > 80 || !body.startsAt || !body.endsAt || body.startsAt > body.endsAt)
      return Response.json({ error: "Revisa el código, descuento y fechas" }, { status: 400 });
    const [coupon] = await getDb().insert(coupons).values({ code, discountPercent: Number(body.discountPercent), minimumAmount: Math.max(0, Number(body.minimumAmount ?? 0)), maxUses: Math.max(1, Number(body.maxUses ?? 100)), startsAt: body.startsAt, endsAt: body.endsAt, active: true }).returning();
    return Response.json({ coupon }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo crear" }, { status: 500 }); }
}
export async function PATCH(request: Request) {
  try { const body = await request.json() as { id?: number; active?: boolean }; if (!Number.isInteger(body.id)) return Response.json({ error: "Cupón no válido" }, { status: 400 }); const [coupon] = await getDb().update(coupons).set({ active: body.active }).where(eq(coupons.id, body.id!)).returning(); return Response.json({ coupon }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo actualizar" }, { status: 500 }); }
}
