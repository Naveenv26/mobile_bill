// frontend/src/api/invoices.js
import client from "./axios";

// Normalize DRF paginated response → always returns a plain array
const toArray = (data) =>
  Array.isArray(data) ? data : (data?.results ?? []);

// ── fetchAll: walks all pages and returns the complete flat array ──────────
// Use this for totals / reports. For paginated lists use getInvoices().
export const fetchAllInvoices = async (params = {}) => {
  let results = [];
  let page = 1;
  while (true) {
    const res = await client.get("/invoices/", { params: { ...params, page, page_size: 100 } });
    const data = res.data;
    const pageResults = Array.isArray(data) ? data : (data?.results ?? []);
    results = results.concat(pageResults);
    // Stop when no next page
    if (!data?.next || pageResults.length === 0) break;
    page++;
  }
  return results;
};

// Create invoice
export const createInvoice = async (data) => {
  const payload = {
    shop: data.shop,
    customer_name: data.customer_name || "Walk-in",
    customer_mobile: data.customer_mobile || "",
    items: data.items.map((c) => ({
      product: c.product,
      qty: c.qty,
      unit_price: c.unit_price,
      tax_rate: c.tax_rate,
    })),
    subtotal: data.subtotal || 0,
    tax_total: data.tax_total || 0,
    discount_total: data.discount_total || 0,
    grand_total: data.grand_total,
  };
  const res = await client.post("/invoices/", payload);
  return res.data;
};

// Get invoices (one page — use for list views with pagination UI)
export const getInvoices = async (params = {}) => {
  const res = await client.get("/invoices/", { params });
  const data = res.data;
  // Return both results and pagination meta for list UIs
  if (Array.isArray(data)) return { results: data, count: data.length, next: null };
  return { results: data?.results ?? [], count: data?.count ?? 0, next: data?.next ?? null };
};

// Get single invoice
export const getInvoice = async (id) => {
  const res = await client.get(`/invoices/${id}/`);
  return res.data;
};

// Delete invoice
export const deleteInvoice = async (id) => {
  const res = await client.delete(`/invoices/${id}/`);
  return res.data;
};

// Update invoice (Edit)
export const updateInvoice = async (id, data) => {
  const payload = {
    shop: data.shop,
    customer_name: data.customer_name,
    customer_mobile: data.customer_mobile,
    items: data.items.map((c) => ({
      product: c.product,
      qty: c.qty,
      unit_price: c.unit_price,
      tax_rate: c.tax_rate,
    })),
    subtotal: data.subtotal || 0,
    tax_total: data.tax_total || 0,
    discount_total: data.discount_total || 0,
    grand_total: data.grand_total,
    payment_mode: data.payment_mode || "cash",
  };
  const res = await client.put(`/invoices/${id}/`, payload);
  return res.data;
};