import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { dashboardApi } from '../api/dashboard';
import { rfqApi } from '../api/rfq';
import {
  FileText,
  Plus,
  TrendingUp,
  Clock,
  DollarSign,
  CheckCircle,
  ArrowRight,
  Menu,
  Search,
  Filter,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import StatsCard from '../components/layout/StatsCard';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import StatusBadge from '../components/auction/StatusBadge';
import Sidebar from '../components/layout/Sidebar';

const BuyerDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [rfqs, setRfqs] = useState([]);
  const [filteredRfqs, setFilteredRfqs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const { error } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    // Apply search, filter, and sort
    let result = [...rfqs];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(rfq =>
        rfq.rfqName?.toLowerCase().includes(term) ||
        rfq.referenceId?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(rfq => rfq.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'lowestBid') {
        aVal = aVal || Infinity;
        bVal = bVal || Infinity;
      } else if (sortBy === 'createdAt' || sortBy === 'currentCloseTime' || sortBy === 'forcedCloseTime') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredRfqs(result);
  }, [rfqs, searchTerm, statusFilter, sortBy, sortOrder]);

  const fetchDashboardData = async () => {
    try {
      const [dashboardData, rfqsData] = await Promise.all([
        dashboardApi.getBuyerDashboard(),
        rfqApi.getAll()
      ]);
      setStats(dashboardData.data.stats);
      setRfqs(rfqsData.data.rfqs);
    } catch (err) {
      error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const columns = [
    { header: 'Reference ID', key: 'referenceId' },
    { header: 'RFQ Name', key: 'rfqName' },
    {
      header: 'Status',
      key: 'status',
      render: (status) => <StatusBadge status={status} />
    },
    {
      header: 'Lowest Bid',
      key: 'lowestBid',
      render: (bid) => bid ? `$${bid.toFixed(2)}` : 'No bids'
    },
    {
      header: 'Close Time',
      key: 'currentCloseTime',
      render: (time) => new Date(time).toLocaleDateString()
    },
    {
      header: 'Forced Close',
      key: 'forcedCloseTime',
      render: (time) => time ? new Date(time).toLocaleDateString() : 'N/A'
    },
    {
      header: 'Actions',
      key: '_id',
      render: (id, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/auctions/${id}`)}
        >
          View
        </Button>
      )
    }
  ];

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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
              >
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Buyer Dashboard</h1>
                <p className="text-slate-600">Welcome back, {user?.name}</p>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={() => navigate('/create-rfq')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create RFQ
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total RFQs"
              value={stats?.totalRFQs || 0}
              icon={FileText}
            />
            <StatsCard
              title="Active Auctions"
              value={stats?.activeAuctions || 0}
              icon={Clock}
              changeType="positive"
            />
            <StatsCard
              title="Total Bids"
              value={stats?.totalBids || 0}
              icon={TrendingUp}
              changeType="positive"
            />
            <StatsCard
              title="Total Savings"
              value={`$${stats?.totalSavings?.toFixed(2) || '0.00'}`}
              icon={DollarSign}
              changeType="positive"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="hover:shadow-medium transition-shadow cursor-pointer" onClick={() => navigate('/create-rfq')}>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Create New RFQ</h3>
                  <p className="text-sm text-slate-600">Start a new auction</p>
                </div>
              </div>
            </Card>
            <Card className="hover:shadow-medium transition-shadow cursor-pointer" onClick={() => navigate('/rfqs')}>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">View All RFQs</h3>
                  <p className="text-sm text-slate-600">Manage your requests</p>
                </div>
              </div>
            </Card>
            <Card className="hover:shadow-medium transition-shadow cursor-pointer" onClick={() => navigate('/analytics')}>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">View Analytics</h3>
                  <p className="text-sm text-slate-600">Track performance</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent RFQs */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Recent RFQs</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/rfqs')}
              >
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Search, Filter, Sort Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search RFQ name or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="ACTIVE">Active</option>
                <option value="CLOSED">Closed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="createdAt">Sort by Date</option>
                <option value="rfqName">Sort by Name</option>
                <option value="lowestBid">Sort by Lowest Bid</option>
                <option value="currentCloseTime">Sort by Close Time</option>
              </select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              </Button>
            </div>

            <Table
              columns={columns}
              data={filteredRfqs.slice(0, 5)}
              emptyMessage="No RFQs created yet"
            />
          </Card>
        </main>
      </div>
    </div>
  );
};

export default BuyerDashboard;
