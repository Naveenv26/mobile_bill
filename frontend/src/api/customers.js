import axios from './axios';

export const fetchAllCustomers = () => axios.get('/customers/');
export const createCustomer = (data) => axios.post('/customers/', data);
export const updateCustomer = (id, data) => axios.put(`/customers/${id}/`);
export const deleteCustomer = (id) => axios.delete(`/customers/${id}/`);
