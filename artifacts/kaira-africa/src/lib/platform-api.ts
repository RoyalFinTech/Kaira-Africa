import { getToken } from "./api-client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.error || "Request failed with status " + response.status);
  return data as T;
}

export interface CrmCustomer {
  id: string; firstName: string; lastName: string; email: string | null; phone: string | null;
  company: string | null; status: string; totalSpend: number; transactionCount: number; createdAt: string;
}
export interface CrmInteraction {
  id: string; customerId: string; customerName: string; userName: string; type: string;
  title: string; note: string; nextActionAt: string | null; completedAt: string | null; createdAt: string;
}
export interface CrmOverview {
  customers: CrmCustomer[]; interactions: CrmInteraction[];
  metrics: { totalCustomers: number; activeCustomers: number; openFollowUps: number };
}
export const getCrmOverview = () => request<CrmOverview>("/api/crm/overview");
export const createCrmInteraction = (input: { customerId: string; type: string; title: string; note: string; nextActionAt?: string }) =>
  request<CrmInteraction>("/api/crm/interactions", { method: "POST", body: JSON.stringify(input) });
export const completeCrmInteraction = (id: string) =>
  request<{ id: string; completedAt: string | null }>("/api/crm/interactions/" + id + "/complete", { method: "PATCH" });

export interface InventoryProduct {
  id: string; name: string; sku: string; category: string | null; unit: string; quantity: number;
  reorderLevel: number; unitCost: number; salePrice: number; active: boolean;
}
export const getInventoryProducts = () => request<InventoryProduct[]>("/api/inventory/products");
export const createInventoryProduct = (input: {
  name: string; sku: string; category?: string; unit?: string; quantity?: number;
  reorderLevel?: number; unitCost?: number; salePrice?: number;
}) => request<InventoryProduct>("/api/inventory/products", { method: "POST", body: JSON.stringify(input) });
export const adjustInventory = (id: string, input: { quantityDelta: number; type: string; reason?: string }) =>
  request<InventoryProduct>("/api/inventory/products/" + id + "/adjust", { method: "POST", body: JSON.stringify(input) });

export interface AiInsight {
  id: string; kind: string; title: string; summary: string;
  payload: Record<string, unknown> | null; generatedAt: string; createdAt: string;
}
export const getAiInsights = () => request<AiInsight[]>("/api/ai/insights");
export const generateAiInsights = () => request<AiInsight[]>("/api/ai/insights/generate", { method: "POST", body: "{}" });

export interface AdminOverview {
  metrics: { users: number; businesses: number; customers: number; transactions: number; revenue: number };
  transactionsByStatus: { label: string; value: number }[];
  businessesByCountry: { label: string; value: number }[];
  revenueTrend: { label: string; value: number }[];
}
export const getAdminOverview = () => request<AdminOverview>("/api/admin/platform/overview");
export interface AdminCrmRow {
  customerId: string; customerName: string; businessName: string; phone: string | null; email: string | null;
  customerStatus: string; interactionCount: number; createdAt: string;
}
export const getAdminCrm = () => request<AdminCrmRow[]>("/api/admin/platform/crm");
export interface AdminInventoryRow {
  id: string; name: string; sku: string; businessName: string;
  quantity: number; reorderLevel: number; inventoryValue: number;
}
export const getAdminInventory = () => request<AdminInventoryRow[]>("/api/admin/platform/inventory");


export type DailyLedgerType = "sale" | "expense" | "debt" | "debt_payment" | "other_income";
export interface DailyLedgerEntry {
  id: string;
  entryType: DailyLedgerType;
  description: string;
  category: string | null;
  amount: number;
  balance: number | null;
  currency: string;
  customerName: string | null;
  productId?: string | null;
  quantity?: number | null;
  dueDate: string | null;
  status: string;
  recordedDate: string;
  createdAt: string;
  updatedAt: string;
}
export interface DailyLedgerResponse {
  startDate: string;
  endDate: string;
  entries: DailyLedgerEntry[];
  summary: {
    sales: number;
    expenses: number;
    outstandingDebt: number;
    debtPayments: number;
    otherIncome: number;
    salesLessExpenses: number;
    totalRecords: number;
  };
  dailyTrend: { date: string; sales: number; expenses: number }[];
  expensesByCategory: { label: string; value: number }[];
}
export const getDailyLedger = (startDate: string, endDate: string) =>
  request<DailyLedgerResponse>("/api/daily-ledger?" + new URLSearchParams({ startDate, endDate }).toString());
export const createDailyLedgerEntry = (input: {
  entryType: DailyLedgerType;
  description: string;
  category?: string;
  amount: number;
  currency?: "GMD";
  customerName?: string;
  productId?: string;
  quantity?: number;
  dueDate?: string;
  recordedDate: string;
}) => request<DailyLedgerEntry>("/api/daily-ledger", { method: "POST", body: JSON.stringify(input) });
export const updateDailyLedgerStatus = (id: string, status: "paid" | "unpaid") =>
  request<DailyLedgerEntry>("/api/daily-ledger/" + encodeURIComponent(id) + "/status", { method: "PATCH", body: JSON.stringify({ status }) });

export interface AdminDailyLedgerRow extends DailyLedgerEntry {
  businessName: string;
}
export const getAdminDailyLedger = () => request<AdminDailyLedgerRow[]>("/api/admin/platform/daily-ledger");


export interface AdminPlatformRecords {
  users: { id: string; name: string; email: string | null; phone: string; role: string; status: string; businessName: string | null; createdAt: string }[];
  businesses: { id: string; name: string; type: string; industry: string; country: string; city: string; phone: string | null; email: string | null; status: string; createdAt: string }[];
  customers: { id: string; name: string; firstName: string; lastName: string; email: string | null; phone: string | null; company: string | null; status: string; businessName: string; createdAt: string }[];
  transactions: { id: string; reference: string; amount: number; currency: string; type: string; status: string; description: string | null; businessName: string; createdAt: string }[];
}
export const getAdminPlatformRecords = () => request<AdminPlatformRecords>("/api/admin/platform/records");
