import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sku: text("sku").notNull().unique(), name: text("name").notNull(),
  category: text("category").notNull(), description: text("description").notNull(),
  price: real("price").notNull(), stock: integer("stock").notNull().default(20),
  imageUrl: text("image_url"),
  accent: text("accent").notNull().default("blue"), active: integer("active", { mode: "boolean" }).notNull().default(true),
});
export const coupons = sqliteTable("coupons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  discountPercent: integer("discount_percent").notNull(),
  minimumAmount: real("minimum_amount").notNull().default(0),
  maxUses: integer("max_uses").notNull().default(100),
  usedCount: integer("used_count").notNull().default(0),
  startsAt: text("starts_at").notNull(),
  endsAt: text("ends_at").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const users = sqliteTable("users", { id: integer("id").primaryKey({ autoIncrement: true }), alias: text("alias").notNull().unique(), role: text("role").notNull().default("test_customer"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`) });
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }), orderNumber: text("order_number").notNull().unique(), customerAlias: text("customer_alias").notNull(),
  customerEmail: text("customer_email"),
  subtotal: real("subtotal").notNull(), tax: real("tax").notNull(), shipping: real("shipping").notNull(), discount: real("discount").notNull(), total: real("total").notNull(),
  status: text("status").notNull().default("CREADO"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }), orderId: integer("order_id").notNull().references(() => orders.id), productId: integer("product_id").notNull().references(() => products.id),
  productName: text("product_name").notNull(), quantity: integer("quantity").notNull(), unitPrice: real("unit_price").notNull(),
});
export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }), orderId: integer("order_id").notNull().references(() => orders.id), method: text("method").notNull(),
  status: text("status").notNull().default("SIMULADO"), amount: real("amount").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }), eventType: text("event_type").notNull(), sessionId: text("session_id").notNull(), productId: integer("product_id"), orderId: integer("order_id"),
  payload: text("payload").notNull().default("{}"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const orderNotifications = sqliteTable("order_notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id),
  recipient: text("recipient").notNull(),
  template: text("template").notNull(),
  deliveryStatus: text("delivery_status").notNull().default("SIMULATED"),
  providerId: text("provider_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const returns = sqliteTable("returns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id),
  reason: text("reason").notNull(),
  details: text("details").notNull().default(""),
  status: text("status").notNull().default("SOLICITADA"),
  refundAmount: real("refund_amount").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const supportRequests = sqliteTable("support_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }), alias: text("alias").notNull(), subject: text("subject").notNull(), status: text("status").notNull().default("ABIERTO"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
