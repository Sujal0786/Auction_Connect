import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { dashboardApi } from '../api/dashboard';
import { 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Users, 
  Menu,
  FileText,
  Trophy
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import StatsCard from '../components/layout/StatsCard';
import Sidebar from '../components/layout/Sidebar';

const Analytics = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [recentBids, setRecentBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const { error } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      let data;
      if (user?.role === 'buyer') {
        data = await dashboardApi.getBuyerDashboard();
        setStats(data.data.stats);
        setRecentBids(data.data.recentBids || []);
      } else if (user?.role === 'supplier') {
        data = await dashboardApi.getSupplierDashboard();
        setStats(data.data.stats);
        setRecentBids(data.data.myBids || []);
      } else if (user?.role === 'admin') {
        data = await dashboardApi.getAdminDashboard();
        setStats(data.data.stats);
        setRecentBids([]);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      error('Failed to load analytics data');
      setStats(null);
      setRecentBids([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />
      
      <div className="flex-1 flex flex-col lg:pl-[260px]">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
              <p className="text-slate-600">Performance insights and statistics</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          {!stats || (stats.totalRFQs === 0 && stats.totalBids === 0) ? (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                <TrendingUp className="w-10 h-10 text-slate-400" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">No Analytics Data Yet</h2>
              <p className="text-slate-600 text-center max-w-md mb-6">
                Start by creating RFQs or participating in auctions to see your performance analytics here.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatsCard
                  title="Total RFQs"
                  value={stats?.totalRFQs || 0}
                  icon={FileText}
                />
                <StatsCard
                  title="Total Bids"
                  value={stats?.totalBids || 0}
                  icon={TrendingUp}
                  changeType="positive"
                />
                <StatsCard
                  title="L1 Positions"
                  value={stats?.l1Count || 0}
                  icon={Trophy}
                  changeType="positive"
                />
                <StatsCard
                  title="Avg Bid Amount"
                  value={`$${(stats?.avgBidAmount || 0).toFixed(2)}`}
                  icon={DollarSign}
                />
              </div>

              {/* Recent Activity */}
              <Card>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Bids</h2>
                {!recentBids || recentBids.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No bids submitted yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentBids.slice(0, 10).map((bid) => (
                      <div
                        key={bid._id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {bid.supplierId?.name || 'Unknown Supplier'} - {bid.rfqId?.referenceId || 'Unknown RFQ'}
                          </p>
                          <p className="text-sm text-slate-600">
                            {bid.supplierId?.companyName || ''} • {new Date(bid.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">
                            ${bid.totalAmount?.toFixed(2)}
                          </p>
                          <p className="text-sm text-slate-600">
                            {bid.transitTime ? `${bid.transitTime} days` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Analytics;
