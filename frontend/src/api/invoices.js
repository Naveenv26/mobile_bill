// frontend/src/api/invoices.js
import client from "./axios";

// Normalize DRF paginated response → always returns a plain array
const toArray = (data) =>
  Array.isArray(data) ? data : (data?.results ?? []);

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

// Get all invoices — always returns a plain array
export const getInvoices = async (params = {}) => {
  const res = await client.get("/invoices/", { params });
  return toArray(res.data);
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