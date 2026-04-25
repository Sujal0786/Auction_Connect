import axios from '../lib/axios';

export const rfqApi = {
  getAll: async (params = {}) => {
    const response = await axios.get('/rfqs', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await axios.get(`/rfqs/${id}`);
    return response.data;
  },

  create: async (rfqData) => {
    const response = await axios.post('/rfqs', rfqData);
    return response.data;
  },

  getMyRFQs: async () => {
    const response = await axios.get('/rfqs/my-rfqs');
    return response.data;
  },

  update: async (id, rfqData) => {
    const response = await axios.put(`/rfqs/${id}`, rfqData);
    return response.data;
  },

  cancel: async (id, reason) => {
    const response = await axios.patch(`/rfqs/${id}/cancel`, { reason });
    return response.data;
  },

  selectWinner: async (id, winnerSupplierId) => {
    const response = await axios.patch(`/rfqs/${id}/select-winner`, { winnerSupplierId });
    return response.data;
  }
};
