import axios from './axios';

export const fetchAllCustomers = () => axios.get('/api/customers/');
export const createCustomer = (data) => axios.post('/api/customers/', data);
export const updateCustomer = (id, data) => axios.put(`/api/customers/${id}/`, data);
export const deleteCustomer = (id) => axios.delete(`/api/customers/${id}/`);
