import { getToken } from "./api-client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export function reportKairaFeedback(detail: { variant: "success" | "error" | "info"; title: string; message: string }) {
  if (typeof window !== "undefined") {
    const message = readableApiMessage(detail.message) ||
      (detail.variant === "error"
        ? "Kaira Africa received an unreadable error response. Please try again."
        : "Kaira Africa completed the action, but there was no readable response detail.");
    window.dispatchEvent(new CustomEvent("kaira:feedback", { detail: { ...detail, message } }));
  }
}

function readableApiMessage(value: unknown, depth = 0): string | null {
  if (depth > 3 || value == null) return null;
  if (typeof value === "string") {
    const message = value.trim();
    if (!message || /^\[object object\]$/i.test(message) || message.startsWith("<!DOCTYPE") || message.startsWith("<html")) return null;
    if (message.startsWith("{") || message.startsWith("[")) {
      try {
        const parsedMessage = readableApiMessage(JSON.parse(message), depth + 1);
        if (parsedMessage) return parsedMessage;
      } catch {
        // Keep ordinary text if it was not actually JSON.
      }
      if (/^[{[]/.test(message)) return null;
    }
    return message.slice(0, 500);
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const messages = value.map((item) => readableApiMessage(item, depth + 1)).filter(Boolean);
    return messages.length ? messages.join(" · ") : null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["message", "error_description", "detail", "details", "error", "title"]) {
      const message = readableApiMessage(record[key], depth + 1);
      if (message) return message;
    }
  }
  return null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  let response: Response;
  try {
    response = await fetch(API_BASE_URL + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    const message = "Kaira Africa could not reach the server. Check your connection and try again.";
    reportKairaFeedback({ variant: "error", title: "Connection problem", message });
    throw new Error(message);
  }
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (response.ok) throw new Error("The server returned an unreadable response. Please try again.");
      data = { message: text };
    }
  }
  if (!response.ok) {
    const message = readableApiMessage(data) || "Request failed with status " + response.status + ". Please try again.";
    reportKairaFeedback({ variant: "error", title: "Kaira Africa couldn't complete that request", message });
    throw new Error(message);
  }

  const method = (options.method || "GET").toUpperCase();
  if (path.endsWith("/receipt-settings") && method === "PATCH") {
    reportKairaFeedback({
      variant: "success",
      title: "Receipt branding saved",
      message: "Your business details and print preferences were saved successfully.",
    });
  } else if (path.endsWith("/receipt-logo") && method === "POST") {
    const branding = data as Partial<ReceiptBrandingSettings> | null;
    if (!branding?.hasLogo || !branding.logoUrl) {
      const message = branding?.hasLogo
        ? "The logo may be stored, but its secure preview link could not be verified. Refresh the page and retry."
        : "The server did not confirm that your logo was saved. Please try uploading it again.";
      reportKairaFeedback({ variant: "error", title: "Logo upload could not be verified", message });
      throw new Error(message);
    }
    reportKairaFeedback({
      variant: "success",
      title: "Logo uploaded successfully",
      message: "Kaira Africa verified the saved logo and secure preview link. It is ready for printouts.",
    });
  } else if (path.endsWith("/receipt-logo") && method === "DELETE") {
    reportKairaFeedback({
      variant: "success",
      title: "Logo removed",
      message: "The custom logo was removed from your receipt branding.",
    });
  }
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
  reorderLevel: number; unitCost: number; salePrice: number; active: boolean; imageUrl?: string | null; currency: "GMD" | "NGN" | "USD";
}
export const getInventoryProducts = () => request<InventoryProduct[]>("/api/inventory/products");
export const createInventoryProduct = (input: {
  name: string; sku: string; category?: string; unit?: string; quantity?: number;
  reorderLevel?: number; unitCost?: number; salePrice?: number; currency?: "GMD" | "NGN" | "USD";
}) => request<InventoryProduct>("/api/inventory/products", { method: "POST", body: JSON.stringify(input) });
export const uploadInventoryProductImage = (id: string, dataUrl: string) =>
  request<InventoryProduct>("/api/inventory/products/" + encodeURIComponent(id) + "/image", { method: "POST", body: JSON.stringify({ dataUrl }) });
export const adjustInventory = (id: string, input: { quantityDelta: number; type: string; reason?: string }) =>
  request<InventoryProduct>("/api/inventory/products/" + id + "/adjust", { method: "POST", body: JSON.stringify(input) });

export interface AiInsight {
  id: string; kind: string; title: string; summary: string;
  payload: Record<string, unknown> | null; generatedAt: string; createdAt: string;
}
export const getAiInsights = () => request<AiInsight[]>("/api/ai/insights");
export const generateAiInsights = () => request<AiInsight[]>("/api/ai/insights/generate", { method: "POST", body: "{}" });

export interface AdminOverview {
  metrics: {
    users: number;
    businesses: number;
    customers: number;
    transactions: number;
    revenue: number;
    products: number;
    lowStockProducts: number;
  };
  transactionsByStatus: { label: string; value: number }[];
  businessesByCountry: { label: string; value: number }[];
  revenueTrend: { label: string; value: number }[];
  userGrowthTrend: { label: string; value: number }[];
  customerGrowthTrend: { label: string; value: number }[];
  productsByStockStatus: { label: string; value: number }[];
}
export const getAdminOverview = () => request<AdminOverview>("/api/admin/platform/overview");
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface AdminCrmRow {
  customerId: string; customerName: string; businessName: string; phone: string | null; email: string | null;
  customerStatus: string; interactionCount: number; createdAt: string;
}
export interface AdminCrmResponse { data: AdminCrmRow[]; pagination: PaginationMeta }
export const getAdminCrm = (page = 1, pageSize = 50) =>
  request<AdminCrmResponse>("/api/admin/platform/crm?" + new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString());
export interface AdminInventoryRow {
  id: string; name: string; sku: string; businessName: string;
  quantity: number; reorderLevel: number; inventoryValue: number;
}
export interface AdminInventoryResponse {
  data: AdminInventoryRow[];
  pagination: PaginationMeta;
  summary: { totalProducts: number; lowStockProducts: number; totalValue: number };
}
export const getAdminInventory = (page = 1, pageSize = 50) =>
  request<AdminInventoryResponse>("/api/admin/platform/inventory?" + new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString());


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
  recordedTime?: string | null;
  paymentMethod?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface DailyLedgerResponse {
  startDate: string;
  endDate: string;
  entries: DailyLedgerEntry[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
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
export const getDailyLedger = (startDate: string, endDate: string, page = 1, pageSize = 50) =>
  request<DailyLedgerResponse>("/api/daily-ledger?" + new URLSearchParams({
    startDate, endDate, page: String(page), pageSize: String(pageSize),
  }).toString());
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
  recordedTime?: string;
  paymentMethod?: "cash" | "bank_transfer" | "mobile_money" | "card" | "credit" | "other";
  remarks?: string;
}) => request<DailyLedgerEntry>("/api/daily-ledger", { method: "POST", body: JSON.stringify(input) });
export const updateDailyLedgerStatus = (id: string, status: "paid" | "unpaid") =>
  request<DailyLedgerEntry>("/api/daily-ledger/" + encodeURIComponent(id) + "/status", { method: "PATCH", body: JSON.stringify({ status }) });

export interface AdminDailyLedgerRow extends DailyLedgerEntry {
  businessName: string;
}
export interface AdminDailyLedgerResponse {
  data: AdminDailyLedgerRow[];
  pagination: PaginationMeta;
  summary: { sales: number; expenses: number; unpaidDebt: number };
}
export const getAdminDailyLedger = (page = 1, pageSize = 50) =>
  request<AdminDailyLedgerResponse>("/api/admin/platform/daily-ledger?" + new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString());


export interface AdminPlatformRecords {
  users: { id: string; name: string; email: string | null; phone: string; role: string; status: string; businessName: string | null; createdAt: string }[];
  businesses: { id: string; name: string; type: string; industry: string; country: string; city: string; phone: string | null; email: string | null; status: string; createdAt: string }[];
  customers: { id: string; name: string; firstName: string; lastName: string; email: string | null; phone: string | null; company: string | null; status: string; businessName: string; createdAt: string }[];
  transactions: { id: string; reference: string; amount: number; currency: string; type: string; status: string; description: string | null; businessName: string; createdAt: string }[];
  pagination: {
    users: PaginationMeta;
    businesses: PaginationMeta;
    customers: PaginationMeta;
    transactions: PaginationMeta;
  };
}
export interface AdminPlatformPageParams {
  usersPage: number;
  businessesPage: number;
  customersPage: number;
  transactionsPage: number;
  pageSize?: number;
}
export const getAdminPlatformRecords = (params: AdminPlatformPageParams) =>
  request<AdminPlatformRecords>("/api/admin/platform/records?" + new URLSearchParams({
    usersPage: String(params.usersPage),
    businessesPage: String(params.businessesPage),
    customersPage: String(params.customersPage),
    transactionsPage: String(params.transactionsPage),
    pageSize: String(params.pageSize ?? 50),
  }).toString());

export interface CrmProfileData {
  dateOfBirth?: string; preferredName?: string; gender?: string; maritalStatus?: string;
  occupation?: string; customerType?: string; preferredContactMethod?: string;
  preferredLanguage?: string; addressLine1?: string; addressLine2?: string;
  postalCode?: string; region?: string; source?: string; tags?: string[];
  interests?: string; preferences?: string; consentNotes?: string; internalNotes?: string;
  emergencyContactName?: string; emergencyContactPhone?: string;
  organizationSpecific?: Record<string, string>;
}
export interface ManagedCrmCustomer extends CrmCustomer {
  country: string | null; city: string | null; avatarUrl: string | null;
  updatedAt: string; profileData: CrmProfileData;
}
export interface ManagedCrmCustomerInput {
  firstName: string; lastName: string; email?: string; phone?: string; company?: string;
  country?: string; city?: string; status?: "active" | "inactive"; profileData?: CrmProfileData;
}
export const searchCrmCustomers = (search = "") =>
  request<{ customers: ManagedCrmCustomer[]; total: number }>(
    "/api/crm/customers" + (search ? "?" + new URLSearchParams({ search }).toString() : "")
  );
export const createManagedCrmCustomer = (input: ManagedCrmCustomerInput) =>
  request<ManagedCrmCustomer>("/api/crm/customers", { method: "POST", body: JSON.stringify(input) });
export const updateManagedCrmCustomer = (id: string, input: Partial<ManagedCrmCustomerInput>) =>
  request<ManagedCrmCustomer>("/api/crm/customers/" + encodeURIComponent(id), { method: "PUT", body: JSON.stringify(input) });
export const uploadCrmCustomerPhoto = (id: string, dataUrl: string) =>
  request<ManagedCrmCustomer>("/api/crm/customers/" + encodeURIComponent(id) + "/photo", { method: "POST", body: JSON.stringify({ dataUrl }) });
export const removeCrmCustomerPhoto = (id: string) =>
  request<ManagedCrmCustomer>("/api/crm/customers/" + encodeURIComponent(id) + "/photo", { method: "DELETE" });
export const uploadProfileAvatar = (dataUrl: string) =>
  request<{ avatarUrl: string | null }>("/api/auth/profile/avatar", { method: "POST", body: JSON.stringify({ dataUrl }) });
export const removeProfileAvatar = () =>
  request<{ avatarUrl: string | null }>("/api/auth/profile/avatar", { method: "DELETE" });
export type TransactionCurrency = "GMD" | "NGN" | "USD" | "EUR" | "GBP";
export type TransactionPaymentMethod = "manual_entry" | "cash" | "bank_transfer" | "mobile_money" | "card" | "paypal" | "cheque" | "other";
export type ManagedTransactionStatus = "completed" | "pending" | "failed" | "cancelled";
export interface ManagedTransaction {
  id: string; reference: string; amount: number; currency: TransactionCurrency;
  type: "payment" | "refund" | "transfer" | "withdrawal" | "deposit";
  status: ManagedTransactionStatus; customerId?: string | null; customerName?: string | null;
  description?: string | null; paymentMethod?: TransactionPaymentMethod | null;
  notes?: string | null; attachmentUrl?: string | null; createdAt: string;
  completedAt?: string | null; updatedAt?: string;
}
export interface CreateManagedTransactionInput {
  amount: number; currency: TransactionCurrency;
  type: ManagedTransaction["type"]; customerId?: string; description?: string;
  paymentMethod?: TransactionPaymentMethod; notes?: string;
}
export const createManagedTransaction = (input: CreateManagedTransactionInput) =>
  request<ManagedTransaction>("/api/transactions", { method: "POST", body: JSON.stringify(input) });
export const updateManagedTransaction = (id: string, input: {
  status?: ManagedTransactionStatus; description?: string | null; paymentMethod?: TransactionPaymentMethod | null; notes?: string | null;
}) => request<ManagedTransaction>("/api/transactions/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify(input) });
export const uploadManagedTransactionAttachment = (id: string, dataUrl: string) =>
  request<ManagedTransaction>("/api/transactions/" + encodeURIComponent(id) + "/attachment", { method: "POST", body: JSON.stringify({ dataUrl }) });
export const removeManagedTransactionAttachment = (id: string) =>
  request<ManagedTransaction>("/api/transactions/" + encodeURIComponent(id) + "/attachment", { method: "DELETE" });

export interface ReceiptBrandingSettings {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  footerNote: string;
  showReceiptNumber: boolean;
  showCustomerDetails: boolean;
  logoUrl: string | null;
  hasLogo: boolean;
  /** True only when the API has both the project URL and its server-only Storage key. */
  storageConfigured?: boolean;
}
export type ReceiptBrandingInput = Partial<Pick<ReceiptBrandingSettings,
  "companyName" | "address" | "phone" | "email" | "website" | "footerNote" | "showReceiptNumber" | "showCustomerDetails"
>>;
export const getReceiptBranding = () =>
  request<ReceiptBrandingSettings>("/api/businesses/me/receipt-settings");
export const updateReceiptBranding = (input: ReceiptBrandingInput) =>
  request<ReceiptBrandingSettings>("/api/businesses/me/receipt-settings", { method: "PATCH", body: JSON.stringify(input) });
export const uploadReceiptLogo = (dataUrl: string) =>
  request<ReceiptBrandingSettings>("/api/businesses/me/receipt-logo", { method: "POST", body: JSON.stringify({ dataUrl }) });
export const removeReceiptLogo = () =>
  request<ReceiptBrandingSettings>("/api/businesses/me/receipt-logo", { method: "DELETE" });
