import { pgTable, uuid, text, integer, bigint, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businesses } from "./businesses";
import { users } from "./users";

export const inventoryProducts = pgTable(
  "inventory_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sku: text("sku").notNull(),
    category: text("category"),
    unit: text("unit").notNull().default("unit"),
    quantity: integer("quantity").notNull().default(0),
    reorderLevel: integer("reorder_level").notNull().default(5),
    unitCostMinor: bigint("unit_cost_minor", { mode: "number" }).notNull().default(0),
    salePriceMinor: bigint("sale_price_minor", { mode: "number" }).notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("inventory_products_business_idx").on(table.businessId),
    uniqueIndex("inventory_products_business_sku_unique").on(table.businessId, table.sku),
  ],
);

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull().references(() => inventoryProducts.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    quantityDelta: integer("quantity_delta").notNull(),
    type: text("type").notNull().default("adjustment"),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("inventory_movements_business_idx").on(table.businessId),
    index("inventory_movements_product_idx").on(table.productId),
    index("inventory_movements_created_idx").on(table.businessId, table.createdAt),
  ],
);

export const insertInventoryProductSchema = createInsertSchema(inventoryProducts).omit({
  id: true, createdAt: true, updatedAt: true,
});
export const selectInventoryProductSchema = createSelectSchema(inventoryProducts);
export type InsertInventoryProduct = z.infer<typeof insertInventoryProductSchema>;
export type InventoryProduct = typeof inventoryProducts.$inferSelect;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
