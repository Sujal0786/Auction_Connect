import axios from '../lib/axios';

export const authApi = {
  login: async (credentials) => {
    const response = await axios.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await axios.post('/auth/register', userData);
    return response.data;
  },

  getMe: async () => {
    const response = await axios.get('/auth/me');
    return response.data;
  },

  getSuppliers: async () => {
    const response = await axios.get('/auth/suppliers');
    return response.data;
  }
};
