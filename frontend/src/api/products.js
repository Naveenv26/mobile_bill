// frontend/src/api/products.js
import client from "./axios";

// Normalize DRF paginated response → always returns a plain array
const toArray = (data) =>
  Array.isArray(data) ? data : (data?.results ?? []);

// Get all products
export const getProducts = async (params = {}) => {
  const res = await client.get("/products/", { params });
  return toArray(res.data);
};

// Create a new product
export const createProduct = async (product) => {
  const res = await client.post("/products/", product);
  return res.data;
};

// Update a product by ID
export const updateProduct = async (id, product) => {
  const res = await client.put(`/products/${id}/`, product);
  return res.data;
};

// Soft delete a product by ID
export const deleteProduct = async (id) => {
  const res = await client.delete(`/products/${id}/`);
  return res.data;
};