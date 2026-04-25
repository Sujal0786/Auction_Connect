import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import { rfqApi } from '../api/rfq';
import { authApi } from '../api/auth';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  Settings,
  Save,
  ChevronRight,
  Users,
  X
} from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Card from '../components/common/Card';

const CreateRFQ = () => {
  const [formData, setFormData] = useState({
    rfqName: '',
    description: '',
    serviceType: 'FREIGHT',
    pickupLocation: '',
    deliveryLocation: '',
    pickupDate: '',
    bidStartTime: '',
    originalCloseTime: '',
    forcedCloseTime: '',
    triggerWindowMinutes: 10,
    extensionDurationMinutes: 10,
    triggerType: 'BID_RECEIVED',
    auctionEnabled: true,
    estimatedValue: '',
    invitedSuppliers: [],
    visibility: 'PUBLIC'
  });
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const { success, error } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await authApi.getSuppliers();
      setSuppliers(response.data.suppliers);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value
    });
  };

  const toggleSupplier = (supplierId) => {
    setFormData(prev => ({
      ...prev,
      invitedSuppliers: prev.invitedSuppliers.includes(supplierId)
        ? prev.invitedSuppliers.filter(id => id !== supplierId)
        : [...prev.invitedSuppliers, supplierId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await rfqApi.create({
        ...formData,
        pickupDate: new Date(formData.pickupDate),
        bidStartTime: new Date(formData.bidStartTime),
        originalCloseTime: new Date(formData.originalCloseTime),
        forcedCloseTime: formData.forcedCloseTime ? new Date(formData.forcedCloseTime) : null,
        estimatedValue: parseFloat(formData.estimatedValue) || 0
      });

      if (response.success) {
        success('RFQ created successfully!');
        navigate('/dashboard');
      } else {
        error(response.message);
      }
    } catch (err) {
      error(err.response?.data?.message || 'Error creating RFQ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Create New RFQ</h1>
            <p className="text-slate-600">Set up a new Request for Quotation with British Auction</p>
          </div>
        </div>
      </header>

      <main className="px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Basic Information</h2>
                  <p className="text-sm text-slate-600">Provide the basic details of your RFQ</p>
                </div>
              </div>

              <div className="space-y-6">
                <Input
                  label="RFQ Name"
                  name="rfqName"
                  value={formData.rfqName}
                  onChange={handleChange}
                  placeholder="Shanghai to Los Angeles Freight"
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="Describe your RFQ requirements..."
                  />
                </div>

                <Select
                  label="Service Type"
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select service type</option>
                  <option value="FCL">FCL (Full Container Load)</option>
                  <option value="LCL">LCL (Less than Container Load)</option>
                  <option value="AIR">Air Freight</option>
                  <option value="ROAD">Road Transport</option>
                  <option value="RAIL">Rail Transport</option>
                </Select>

                <Select
                  label="Visibility"
                  name="visibility"
                  value={formData.visibility}
                  onChange={handleChange}
                  required
                >
                  <option value="PUBLIC">Public (All suppliers can see)</option>
                  <option value="PRIVATE">Private (Only invited suppliers)</option>
                </Select>
              </div>
            </Card>
          </motion.div>

          {/* Logistics Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Logistics Details</h2>
                  <p className="text-sm text-slate-600">Specify pickup and delivery locations</p>
                </div>
              </div>

              <div className="space-y-6">
                <Input
                  label="Pickup Location"
                  name="pickupLocation"
                  value={formData.pickupLocation}
                  onChange={handleChange}
                  placeholder="Shanghai, China"
                  required
                />

                <Input
                  label="Delivery Location"
                  name="deliveryLocation"
                  value={formData.deliveryLocation}
                  onChange={handleChange}
                  placeholder="Los Angeles, USA"
                  required
                />

                <Input
                  label="Pickup Date"
                  name="pickupDate"
                  type="date"
                  value={formData.pickupDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </Card>
          </motion.div>

          {/* Invite Suppliers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Invite Suppliers</h2>
                  <p className="text-sm text-slate-600">Select suppliers to participate in this auction</p>
                </div>
              </div>

              <div className="space-y-3">
                {suppliers.length === 0 ? (
                  <p className="text-slate-500">No suppliers available</p>
                ) : (
                  suppliers.map(supplier => (
                    <div
                      key={supplier.id}
                      onClick={() => toggleSupplier(supplier.id)}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.invitedSuppliers.includes(supplier.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-slate-900">{supplier.name}</p>
                        <p className="text-sm text-slate-600">{supplier.companyName || supplier.email}</p>
                      </div>
                      {formData.invitedSuppliers.includes(supplier.id) && (
                        <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </motion.div>

          {/* Auction Timing */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Auction Timing</h2>
                  <p className="text-sm text-slate-600">Set the auction schedule</p>
                </div>
              </div>

              <div className="space-y-6">
                <Input
                  label="Bid Start Time"
                  name="bidStartTime"
                  type="datetime-local"
                  value={formData.bidStartTime}
                  onChange={handleChange}
                  required
                />

                <Input
                  label="Original Close Time"
                  name="originalCloseTime"
                  type="datetime-local"
                  value={formData.originalCloseTime}
                  onChange={handleChange}
                  required
                />

                <Input
                  label="Forced Close Time (Optional)"
                  name="forcedCloseTime"
                  type="datetime-local"
                  value={formData.forcedCloseTime}
                  onChange={handleChange}
                  helperText="The auction will close at this time regardless of extensions"
                />
              </div>
            </Card>
          </motion.div>

          {/* British Auction Configuration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">British Auction Configuration</h2>
                  <p className="text-sm text-slate-600">Configure automatic extension rules</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="auctionEnabled"
                    id="auctionEnabled"
                    checked={formData.auctionEnabled}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="auctionEnabled" className="text-sm text-slate-700">
                    Enable British Auction (automatic extension on late bids)
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Trigger Window (minutes)"
                    name="triggerWindowMinutes"
                    type="number"
                    value={formData.triggerWindowMinutes}
                    onChange={handleChange}
                    min="1"
                    helperText="Time before close when extensions can trigger"
                  />

                  <Input
                    label="Extension Duration (minutes)"
                    name="extensionDurationMinutes"
                    type="number"
                    value={formData.extensionDurationMinutes}
                    onChange={handleChange}
                    min="1"
                    helperText="How long to extend when triggered"
                  />
                </div>

                <Select
                  label="Trigger Type"
                  name="triggerType"
                  value={formData.triggerType}
                  onChange={handleChange}
                >
                  <option value="BID_RECEIVED">Any Bid Received</option>
                  <option value="ANY_RANK_CHANGE">Any Rank Change</option>
                  <option value="L1_CHANGE">L1 Change Only</option>
                </Select>

                <Input
                  label="Estimated Value ($)"
                  name="estimatedValue"
                  type="number"
                  value={formData.estimatedValue}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="5000"
                />
              </div>
            </Card>
          </motion.div>

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
              loading={loading}
              size="lg"
            >
              <Save className="w-4 h-4 mr-2" />
              Create RFQ
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateRFQ;
