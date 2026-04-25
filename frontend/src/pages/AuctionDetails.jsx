import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { rfqApi } from '../api/rfq';
import { bidApi } from '../api/bid';
import { 
  ArrowLeft, 
  Clock, 
  MapPin, 
  Calendar, 
  DollarSign,
  Trophy,
  Activity,
  Settings,
  CheckCircle,
  Menu,
  Users
} from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import StatusBadge from '../components/auction/StatusBadge';
import AuctionTimer from '../components/auction/AuctionTimer';
import RankingTable from '../components/auction/RankingTable';
import PriceCard from '../components/auction/PriceCard';
import Sidebar from '../components/layout/Sidebar';

const AuctionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rfq, setRfq] = useState(null);
  const [bids, setBids] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const { user } = useAuth();
  const { error, success } = useToast();

  useEffect(() => {
    fetchAuctionDetails();
  }, [id]);

  const fetchAuctionDetails = async () => {
    try {
      const rfqData = await rfqApi.getById(id);
      setRfq(rfqData.data.rfq);
      
      // Only fetch bids and rankings if RFQ is not in DRAFT status
      if (rfqData.data.rfq.status !== 'DRAFT') {
        try {
          const [bidsData, rankingData] = await Promise.all([
            bidApi.getBidsForRFQ(id),
            bidApi.getRankings(id)
          ]);
          setBids(bidsData.data?.bids || []);
          setRanking(rankingData.data?.ranking || []);
        } catch (err) {
          setBids([]);
          setRanking([]);
        }
      } else {
        setBids([]);
        setRanking([]);
      }
    } catch (err) {
      error('Failed to load auction details');
      setRfq(null);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'rankings', label: 'Rankings', icon: Trophy },
    { id: 'bids', label: 'Bid History', icon: DollarSign },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handlePublishAuction = async () => {
    setPublishing(true);
    try {
      await rfqApi.update(id, { status: 'UPCOMING' });
      success('Auction published successfully!');
      fetchAuctionDetails();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to publish auction');
    } finally {
      setPublishing(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />
      
      <div className="flex-1 flex flex-col lg:pl-[260px]">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
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
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{rfq.rfqName}</h1>
                <p className="text-slate-600">{rfq.referenceId}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {rfq.status === 'DRAFT' && (user?.role === 'buyer' || user?.role === 'admin') && (
                <Button
                  variant="primary"
                  onClick={handlePublishAuction}
                  loading={publishing}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Publish Auction
                </Button>
              )}
              <StatusBadge status={rfq.status} />
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
        {/* Key Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <PriceCard
            label="Estimated Value"
            amount={rfq.estimatedValue}
            icon={DollarSign}
          />
          <Card>
            <div className="flex items-center space-x-3 mb-2">
              <MapPin className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-600">Route</span>
            </div>
            <p className="font-semibold text-slate-900">{rfq.pickupLocation}</p>
            <p className="text-sm text-slate-500">→ {rfq.deliveryLocation}</p>
          </Card>
          <Card>
            <div className="flex items-center space-x-3 mb-2">
              <Users className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-600">Participation</span>
            </div>
            <p className="font-semibold text-slate-900">{rfq.supplierCount || 0} Suppliers</p>
            <p className="text-sm text-slate-500">{rfq.bidCount || 0} Bids</p>
          </Card>
          <Card>
            <div className="flex items-center space-x-3 mb-2">
              <Clock className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-600">Time Remaining</span>
            </div>
            <AuctionTimer closeTime={rfq.currentCloseTime} isExtended={rfq.extensionCount > 0} />
          </Card>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <Card>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">RFQ Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Service Type</p>
                    <p className="font-medium text-slate-900">{rfq.serviceType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Status</p>
                    <StatusBadge status={rfq.status} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Bid Start Time</p>
                    <p className="font-medium text-slate-900">
                      {new Date(rfq.bidStartTime).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Close Time</p>
                    <p className="font-medium text-slate-900">
                      {new Date(rfq.currentCloseTime).toLocaleString()}
                    </p>
                  </div>
                </div>
                {rfq.description && (
                  <div className="mt-6">
                    <p className="text-sm text-slate-600 mb-1">Description</p>
                    <p className="text-slate-900">{rfq.description}</p>
                  </div>
                )}
              </Card>

              {rfq.auctionEnabled && (
                <Card>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">British Auction Settings</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Trigger Window</p>
                      <p className="font-medium text-slate-900">{rfq.triggerWindowMinutes} min</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Extension Duration</p>
                      <p className="font-medium text-slate-900">{rfq.extensionDurationMinutes} min</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Trigger Type</p>
                      <p className="font-medium text-slate-900">{rfq.triggerType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Extensions</p>
                      <p className="font-medium text-slate-900">{rfq.extensionCount}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'rankings' && (
            <Card>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Current Rankings</h3>
              <RankingTable rankings={ranking} />
            </Card>
          )}

          {activeTab === 'bids' && (
            <Card>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Bid History</h3>
              {bids.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No bids submitted yet
                </div>
              ) : (
                <div className="space-y-3">
                  {bids.map((bid) => (
                    <div
                      key={bid._id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{bid.supplierId?.name}</p>
                        <p className="text-sm text-slate-600">{bid.carrierName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">${bid.totalAmount?.toFixed(2)}</p>
                        <p className="text-sm text-slate-600">{bid.transitTime} days</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {activeTab === 'settings' && (
            <Card>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Auction Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Auction Enabled</p>
                    <p className="text-sm text-slate-600">British auction extension rules</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    rfq.auctionEnabled ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {rfq.auctionEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                {rfq.status === 'CLOSED' && !rfq.winnerSupplier && (
                  <Button className="w-full">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Select Winner
                  </Button>
                )}
              </div>
            </Card>
          )}
        </motion.div>
      </main>
      </div>
    </div>
  );
};

export default AuctionDetails;
