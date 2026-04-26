import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { rfqApi } from '../api/rfq';
import { bidApi } from '../api/bid';
import { 
  ArrowLeft, 
  Calculator, 
  TrendingDown, 
  CheckCircle,
  AlertTriangle,
  Save,
  Menu
} from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Card from '../components/common/Card';
import PriceCard from '../components/auction/PriceCard';
import Sidebar from '../components/layout/Sidebar';

const SubmitBid = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rfq, setRfq] = useState(null);
  const [myPreviousBid, setMyPreviousBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { success, error } = useToast();

  const [formData, setFormData] = useState({
    carrierName: '',
    freightCharges: '',
    originCharges: '',
    destinationCharges: '',
    taxes: '',
    discount: '',
    transitTime: '',
    quoteValidity: '',
    remarks: ''
  });

  useEffect(() => {
    fetchRFQDetails();
  }, [id]);

  const fetchRFQDetails = async () => {
    try {
      const [rfqData, myBidsData] = await Promise.all([
        rfqApi.getById(id),
        bidApi.getMyBids()
      ]);
      setRfq(rfqData.data.rfq);
      
      const myBidForThisRFQ = myBidsData.data.bids.find(b => b.rfqId._id === id);
      if (myBidForThisRFQ) {
        setMyPreviousBid(myBidForThisRFQ);
      }
    } catch (err) {
      error('Failed to load RFQ details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const calculateTotal = () => {
    const freight = parseFloat(formData.freightCharges) || 0;
    const origin = parseFloat(formData.originCharges) || 0;
    const destination = parseFloat(formData.destinationCharges) || 0;
    const taxes = parseFloat(formData.taxes) || 0;
    const discount = parseFloat(formData.discount) || 0;
    return freight + origin + destination + taxes - discount;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const totalAmount = calculateTotal();

    try {
      const response = await bidApi.submitBid(id, {
        ...formData,
        freightCharges: parseFloat(formData.freightCharges) || 0,
        originCharges: parseFloat(formData.originCharges) || 0,
        destinationCharges: parseFloat(formData.destinationCharges) || 0,
        taxes: parseFloat(formData.taxes) || 0,
        discount: parseFloat(formData.discount) || 0,
        transitTime: parseInt(formData.transitTime) || 0,
        quoteValidity: formData.quoteValidity ? new Date(formData.quoteValidity) : null,
        totalAmount
      });

      if (response.success) {
        success('Bid submitted successfully!');
        navigate('/dashboard');
      } else {
        error(response.message);
      }
    } catch (err) {
      error(err.response?.data?.message || 'Error submitting bid');
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = calculateTotal();
  const isLowerThanPrevious = myPreviousBid ? totalAmount < myPreviousBid.totalAmount : true;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">RFQ not found</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Role-based access control: Only suppliers can submit bids
  if (user?.role !== 'supplier') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Only suppliers can submit bids</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />
      
      <div className="flex-1 flex flex-col lg:pl-[260px]">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Submit Your Bid</h1>
              <p className="text-slate-600">{rfq.rfqName}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
        {/* RFQ Summary */}
        <Card className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">{rfq.rfqName}</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-600">Route</p>
                  <p className="font-medium">{rfq.pickupLocation} → {rfq.deliveryLocation}</p>
                </div>
                <div>
                  <p className="text-slate-600">Close Time</p>
                  <p className="font-medium">{new Date(rfq.currentCloseTime).toLocaleString()}</p>
                </div>
                {rfq.estimatedValue && (
                  <div>
                    <p className="text-slate-600">Estimated Value</p>
                    <p className="font-medium">${rfq.estimatedValue?.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          {rfq.lowestBid && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-800">
                <TrendingDown className="w-5 h-5" />
                <span className="font-medium">Current Lowest Bid: ${rfq.lowestBid?.toFixed(2)}</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">You need to bid lower than this to become L1</p>
            </div>
          )}
          {myPreviousBid && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 text-yellow-800">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Your previous bid: ${myPreviousBid.totalAmount?.toFixed(2)}</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">New bid must be lower than your previous bid</p>
            </div>
          )}
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Charges Section */}
          <Card>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Quote Details</h2>
                <p className="text-sm text-slate-600">Enter your pricing breakdown</p>
              </div>
            </div>

            <div className="space-y-6">
              <Input
                label="Carrier Name"
                name="carrierName"
                value={formData.carrierName}
                onChange={handleChange}
                placeholder="Maersk, Hapag-Lloyd, etc."
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Freight Charges ($)"
                  name="freightCharges"
                  type="number"
                  value={formData.freightCharges}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  required
                />

                <Input
                  label="Origin Charges ($)"
                  name="originCharges"
                  type="number"
                  value={formData.originCharges}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />

                <Input
                  label="Destination Charges ($)"
                  name="destinationCharges"
                  type="number"
                  value={formData.destinationCharges}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />

                <Input
                  label="Taxes ($)"
                  name="taxes"
                  type="number"
                  value={formData.taxes}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />

                <Input
                  label="Discount ($)"
                  name="discount"
                  type="number"
                  value={formData.discount}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />

                <Input
                  label="Transit Time (days)"
                  name="transitTime"
                  type="number"
                  value={formData.transitTime}
                  onChange={handleChange}
                  min="0"
                  placeholder="15"
                  required
                />
              </div>

              <Input
                label="Quote Validity"
                name="quoteValidity"
                type="date"
                value={formData.quoteValidity}
                onChange={handleChange}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Remarks</label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Additional information about your bid..."
                />
              </div>
            </div>
          </Card>

          {/* Total Calculation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <PriceCard
              label="Total Quote Amount"
              amount={totalAmount}
              change={myPreviousBid ? `Previous: $${myPreviousBid.totalAmount?.toFixed(2)}` : null}
              changeType={isLowerThanPrevious ? 'positive' : 'negative'}
              icon={Calculator}
            />
          </motion.div>

          {/* Validation Message */}
          {!isLowerThanPrevious && myPreviousBid && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-red-800 font-medium">
                Your bid must be lower than your previous bid of ${myPreviousBid.totalAmount?.toFixed(2)}
              </p>
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex items-center justify-end space-x-4 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
              disabled={!isLowerThanPrevious}
              size="lg"
            >
              <Save className="w-4 h-4 mr-2" />
              Submit Bid
            </Button>
          </div>
        </form>
      </main>
      </div>
    </div>
  );
};

export default SubmitBid;
