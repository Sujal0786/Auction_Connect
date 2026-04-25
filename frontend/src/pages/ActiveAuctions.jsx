import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { rfqApi } from '../api/rfq';
import { Gavel, Menu, ArrowRight } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import StatusBadge from '../components/auction/StatusBadge';
import Sidebar from '../components/layout/Sidebar';

const ActiveAuctions = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { error } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    try {
      let response;
      if (user?.role === 'supplier') {
        response = await rfqApi.getMyRFQs();
        // Suppliers can see UPCOMING and ACTIVE auctions
        setRfqs(response.data?.rfqs?.filter(rfq => 
          rfq.status === 'ACTIVE' || rfq.status === 'UPCOMING'
        ) || []);
      } else {
        response = await rfqApi.getAll();
        // Buyers see only ACTIVE auctions
        setRfqs(response.data?.rfqs?.filter(rfq => 
          rfq.status === 'ACTIVE'
        ) || []);
      }
    } catch (err) {
      console.error('Error loading auctions:', err);
      setRfqs([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: 'Reference ID', key: 'referenceId' },
    { header: 'RFQ Name', key: 'rfqName' },
    { 
      header: 'Route', 
      key: '_id',
      render: (_, row) => `${row.pickupLocation} → ${row.deliveryLocation}`
    },
    { 
      header: 'Status', 
      key: 'status',
      render: (status) => <StatusBadge status={status} />
    },
    { 
      header: 'Close Time', 
      key: 'currentCloseTime',
      render: (time) => new Date(time).toLocaleDateString()
    },
    {
      header: 'Actions',
      key: '_id',
      render: (id, row) => {
        if (user?.role === 'buyer') {
          // Buyer: View or Monitor only, never Submit Bid
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/auctions/${id}`)}
            >
              View
            </Button>
          );
        } else if (user?.role === 'supplier') {
          // Supplier: Submit Bid for ACTIVE, View for UPCOMING, Closed for CLOSED
          if (row.status === 'ACTIVE') {
            return (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/bid/${id}`)}
              >
                Submit Bid
              </Button>
            );
          } else if (row.status === 'UPCOMING') {
            return (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/auctions/${id}`)}
              >
                View
              </Button>
            );
          } else {
            return (
              <span className="text-xs text-slate-500">Closed</span>
            );
          }
        } else {
          // Admin: View or Inspect
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/auctions/${id}`)}
            >
              View
            </Button>
          );
        }
      }
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
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Active Auctions</h1>
              <p className="text-slate-600">Participate in ongoing British Auctions</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          {rfqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                <Gavel className="w-10 h-10 text-slate-400" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">No Active Auctions</h2>
              <p className="text-slate-600 text-center max-w-md mb-6">
                {user?.role === 'supplier' 
                  ? 'There are no active or upcoming auctions at the moment. Check back later for new opportunities.'
                  : 'There are no active auctions right now. Your upcoming auctions will appear here when they start.'}
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          ) : (
            <Card>
              <Table
                columns={columns}
                data={rfqs}
                emptyMessage="No active auctions at the moment"
              />
            </Card>
          )}
        </main>
      </div>
    </div>
  );
};

export default ActiveAuctions;
