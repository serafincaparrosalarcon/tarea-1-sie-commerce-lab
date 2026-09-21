import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  events,
  orderItems,
  orderNotifications,
  orders,
  payments,
  products,
  coupons,
} from "../../../db/schema";
import { sendOrderEmail } from "../../../lib/email";
import { orderStatuses } from "../../../lib/store-data";

type IncomingItem = { productId?: number; quantity?: number };
const money = (value: number) => Math.round(value * 100) / 100;
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function GET(request: Request) {
  try {
    const db = getDb();
    const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
    const orderRows = email
      ? await db.select().from(orders).where(eq(orders.customerEmail, email)).orderBy(desc(orders.id)).limit(50)
      : await db.select().from(orders).orderBy(desc(orders.id)).limit(50);
    const ids = orderRows.map((row) => row.id);
    const [itemRows, paymentRows, notificationRows] = ids.length
      ? await Promise.all([
          db.select().from(orderItems).where(inArray(orderItems.orderId, ids)),
          db.select().from(payments).where(inArray(payments.orderId, ids)),
          db.select().from(orderNotifications).where(inArray(orderNotifications.orderId, ids)),
        ])
      : [[], [], []];
    return Response.json({
      orders: orderRows.map((order) => ({
        ...order,
        items: itemRows.filter((item) => item.orderId === order.id),
        payment: paymentRows.find((payment) => payment.orderId === order.id) ?? null,
        notifications: notificationRows.filter((notice) => notice.orderId === order.id),
      })),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudieron cargar los pedidos" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      customerAlias?: string;
      customerEmail?: string;
      sessionId?: string;
      coupon?: string;
      paymentMethod?: string;
      shippingMethod?: string;
      items?: IncomingItem[];
    };
    const alias = body.customerAlias?.trim().slice(0, 60) || "CLIENTE-PRUEBA";
    const customerEmail = body.customerEmail?.trim().toLowerCase() ?? "";
    if (!validEmail(customerEmail))
      return Response.json({ error: "El correo electrónico no es válido" }, { status: 400 });
    const sessionId = body.sessionId?.trim().slice(0, 80) || "session-demo";
    const incoming = (body.items ?? []).filter(
      (item) =>
        Number.isInteger(item.productId) &&
        Number.isInteger(item.quantity) &&
        Number(item.quantity) > 0 &&
        Number(item.quantity) <= 10,
    );
    if (!incoming.length)
      return Response.json({ error: "El carrito está vacío" }, { status: 400 });

    const db = getDb();
    const ids = incoming.map((item) => Number(item.productId));
    const productRows = await db.select().from(products).where(inArray(products.id, ids));
    if (productRows.length !== new Set(ids).size)
      return Response.json({ error: "Hay productos no válidos" }, { status: 400 });

    const lines = incoming.map((item) => {
      const product = productRows.find((row) => row.id === item.productId)!;
      const quantity = Number(item.quantity);
      if (quantity > product.stock) throw new Error(`Stock insuficiente para ${product.name}`);
      return { product, quantity, lineTotal: product.price * quantity };
    });
    const subtotal = money(lines.reduce((sum, line) => sum + line.lineTotal, 0));
    const couponCode = body.coupon?.trim().toUpperCase();
    let couponRow: typeof coupons.$inferSelect | undefined;
    if (couponCode && couponCode !== "CALMA10") {
      [couponRow] = await db.select().from(coupons).where(and(eq(coupons.code, couponCode), eq(coupons.active, true))).limit(1);
      const now = new Date().toISOString();
      if (!couponRow || couponRow.startsAt > now || couponRow.endsAt < now || couponRow.usedCount >= couponRow.maxUses || subtotal < couponRow.minimumAmount)
        return Response.json({ error: "El cupón no es válido para este pedido" }, { status: 400 });
    }
    const discountPercent = couponCode === "CALMA10" ? 10 : couponRow?.discountPercent ?? 0;
    const discount = money(subtotal * discountPercent / 100);
    const shipping = body.shippingMethod === "express" ? 8.95 : subtotal >= 80 ? 0 : 4.95;
    const taxableBase = money(subtotal - discount + shipping);
    const tax = money(taxableBase * 0.21);
    const total = money(taxableBase + tax);
    const orderNumber = `SEN-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const [order] = await db
      .insert(orders)
      .values({
        orderNumber,
        customerAlias: alias,
        customerEmail,
        subtotal,
        tax,
        shipping,
        discount,
        total,
        status: "PAGO_SIMULADO",
      })
      .returning();
    await db.insert(orderItems).values(
      lines.map((line) => ({
        orderId: order.id,
        productId: line.product.id,
        productName: line.product.name,
        quantity: line.quantity,
        unitPrice: line.product.price,
      })),
    );
    await db.insert(payments).values({
      orderId: order.id,
      method: (body.paymentMethod ?? "Tarjeta de prueba").slice(0, 40),
      status: "SIMULADO_ACEPTADO",
      amount: total,
    });
    await db.insert(events).values([
      {
        eventType: "order.created",
        sessionId,
        orderId: order.id,
        payload: JSON.stringify({ orderNumber, total, itemCount: lines.length }),
      },
      {
        eventType: "payment.simulated",
        sessionId,
        orderId: order.id,
        payload: JSON.stringify({ method: body.paymentMethod ?? "Tarjeta de prueba", status: "accepted" }),
      },
    ]);
    if (couponRow) await db.update(coupons).set({ usedCount: couponRow.usedCount + 1 }).where(eq(coupons.id, couponRow.id));

    const email = await sendOrderEmail({
      to: customerEmail,
      customerName: alias,
      orderNumber,
      status: "PAGO_SIMULADO",
      total,
    });
    await db.insert(orderNotifications).values({
      orderId: order.id,
      recipient: customerEmail,
      template: "PAGO_SIMULADO",
      deliveryStatus: email.status.toUpperCase(),
      providerId: email.providerId,
    });
    await db.insert(events).values({
      eventType: `email.${email.status}`,
      sessionId,
      orderId: order.id,
      payload: JSON.stringify({ template: "PAGO_SIMULADO", recipient: customerEmail }),
    });

    return Response.json(
      { order: { ...order, orderNumber, total, status: "PAGO_SIMULADO" }, emailStatus: email.status },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo generar el pedido" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { orderId?: number; status?: string };
    if (
      !Number.isInteger(body.orderId) ||
      !orderStatuses.includes(body.status as (typeof orderStatuses)[number])
    )
      return Response.json({ error: "Datos no válidos" }, { status: 400 });

    const db = getDb();
    const [order] = await db
      .update(orders)
      .set({ status: body.status! })
      .where(eq(orders.id, body.orderId!))
      .returning();
    if (!order) return Response.json({ error: "Pedido no encontrado" }, { status: 404 });

    let emailStatus: "sent" | "simulated" | "failed" = "simulated";
    if (order.customerEmail) {
      const email = await sendOrderEmail({
        to: order.customerEmail,
        customerName: order.customerAlias,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
      });
      emailStatus = email.status;
      await db.insert(orderNotifications).values({
        orderId: order.id,
        recipient: order.customerEmail,
        template: order.status,
        deliveryStatus: email.status.toUpperCase(),
        providerId: email.providerId,
      });
      await db.insert(events).values({
        eventType: `email.${email.status}`,
        sessionId: "SES-ADMIN",
        orderId: order.id,
        payload: JSON.stringify({ template: order.status, recipient: order.customerEmail }),
      });
    }
    return Response.json({ order, emailStatus });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar" },
      { status: 500 },
    );
  }
}
