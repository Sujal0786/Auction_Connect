import axios from '../lib/axios';

export const dashboardApi = {
  getBuyerDashboard: async () => {
    const response = await axios.get('/api/dashboard/buyer');
    return response.data;
  },

  getSupplierDashboard: async () => {
    const response = await axios.get('/api/dashboard/supplier');
    return response.data;
  },

  getAdminDashboard: async () => {
    const response = await axios.get('/api/dashboard/admin');
    return response.data;
  }
};
