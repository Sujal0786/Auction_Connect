import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { rfqApi } from '../api/rfq';
import { FileText, Menu, Plus } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import StatusBadge from '../components/auction/StatusBadge';
import Sidebar from '../components/layout/Sidebar';

const MyRFQs = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { error } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRFQs();
  }, []);

  const fetchRFQs = async () => {
    try {
      let response;
      if (user?.role === 'supplier') {
        response = await rfqApi.getMyRFQs();
      } else {
        response = await rfqApi.getAll();
      }
      setRfqs(response.data?.rfqs || []);
    } catch (err) {
      console.error('Error loading RFQs:', err);
      setRfqs([]);
    } finally {
      setLoading(false);
    }
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
      header: 'Close Time', 
      key: 'currentCloseTime',
      render: (time) => new Date(time).toLocaleDateString()
    },
    {
      header: 'Actions',
      key: '_id',
      render: (id) => (
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
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">My RFQs</h1>
              <p className="text-slate-600">Manage your requests for quotation</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          {rfqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-slate-400" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">No RFQs Yet</h2>
              <p className="text-slate-600 text-center max-w-md mb-6">
                {user?.role === 'buyer' 
                  ? 'Create your first RFQ to start receiving quotes from suppliers.'
                  : 'You haven\'t been invited to any RFQs yet.'}
              </p>
              {user?.role === 'buyer' && (
                <Button onClick={() => navigate('/create-rfq')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create RFQ
                </Button>
              )}
            </div>
          ) : (
            <Card>
              <Table
                columns={columns}
                data={rfqs}
                emptyMessage="No RFQs found"
              />
            </Card>
          )}
        </main>
      </div>
    </div>
  );
};

export default MyRFQs;
