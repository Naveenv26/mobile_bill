// frontend/src/api/products.js
import client from "./axios";

const toArray = (data) =>
  Array.isArray(data) ? data : (data?.results ?? []);

// ── fetchAllProducts: walks all pages — use for billing / stock totals ────
export const fetchAllProducts = async (params = {}) => {
  let results = [];
  let page = 1;
  while (true) {
    const res = await client.get("/products/", { params: { ...params, page, page_size: 100 } });
    const data = res.data;
    const pageResults = Array.isArray(data) ? data : (data?.results ?? []);
    results = results.concat(pageResults);
    if (!data?.next || pageResults.length === 0) break;
    page++;
  }
  return results;
};

// Get products (one page — use for list views)
export const getProducts = async (params = {}) => {
  const res = await client.get("/products/", { params });
  return toArray(res.data);
};

export const createProduct = async (product) => {
  const res = await client.post("/products/", product);
  return res.data;
};

export const updateProduct = async (id, product) => {
  const res = await client.put(`/products/${id}/`, product);
  return res.data;
};

export const deleteProduct = async (id) => {
  const res = await client.delete(`/products/${id}/`);
  return res.data;
};