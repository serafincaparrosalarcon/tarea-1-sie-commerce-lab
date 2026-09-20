import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sku: text("sku").notNull().unique(), name: text("name").notNull(),
  category: text("category").notNull(), description: text("description").notNull(),
  price: real("price").notNull(), stock: integer("stock").notNull().default(20),
  accent: text("accent").notNull().default("blue"), active: integer("active", { mode: "boolean" }).notNull().default(true),
});
export const users = sqliteTable("users", { id: integer("id").primaryKey({ autoIncrement: true }), alias: text("alias").notNull().unique(), role: text("role").notNull().default("test_customer"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`) });
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }), orderNumber: text("order_number").notNull().unique(), customerAlias: text("customer_alias").notNull(),
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
export const supportRequests = sqliteTable("support_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }), alias: text("alias").notNull(), subject: text("subject").notNull(), status: text("status").notNull().default("ABIERTO"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
