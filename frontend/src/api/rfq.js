import axios from '../lib/axios';

export const rfqApi = {
  getAll: async (params = {}) => {
    const response = await axios.get('/api/rfqs', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await axios.get(`/api/rfqs/${id}`);
    return response.data;
  },

  create: async (rfqData) => {
    const response = await axios.post('/api/rfqs', rfqData);
    return response.data;
  },

  getMyRFQs: async () => {
    const response = await axios.get('/api/rfqs/my-rfqs');
    return response.data;
  },

  update: async (id, rfqData) => {
    const response = await axios.put(`/api/rfqs/${id}`, rfqData);
    return response.data;
  },

  cancel: async (id, reason) => {
    const response = await axios.patch(`/api/rfqs/${id}/cancel`, { reason });
    return response.data;
  },

  selectWinner: async (id, winnerSupplierId) => {
    const response = await axios.patch(`/api/rfqs/${id}/select-winner`, { winnerSupplierId });
    return response.data;
  }
};
