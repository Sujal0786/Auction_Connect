import axios from '../lib/axios';

export const authApi = {
  login: async (credentials) => {
    const response = await axios.post('/api/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await axios.post('/api/auth/register', userData);
    return response.data;
  },

  getMe: async () => {
    const response = await axios.get('/api/auth/me');
    return response.data;
  },

  getSuppliers: async () => {
    const response = await axios.get('/api/auth/suppliers');
    return response.data;
  }
};
