import axios from '../lib/axios';

export const bidApi = {
  submitBid: async (rfqId, bidData) => {
    const endpoint = `/api/bids/${rfqId}/bids`;
    console.log('Submitting bid to:', endpoint, 'with data:', bidData);
    const response = await axios.post(endpoint, bidData);
    return response.data;
  },

  getBidsForRFQ: async (rfqId) => {
    const response = await axios.get(`/api/bids/${rfqId}/bids`);
    return response.data;
  },

  getRankings: async (rfqId) => {
    const response = await axios.get(`/api/bids/${rfqId}/rankings`);
    return response.data;
  },

  getMyBids: async () => {
    const response = await axios.get('/api/bids/my-bids');
    return response.data;
  }
};
