import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Login from './pages/Login';
import Register from './pages/Register';
import BuyerDashboard from './pages/BuyerDashboard';
import SupplierDashboard from './pages/SupplierDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CreateRFQ from './pages/CreateRFQ';
import AuctionDetails from './pages/AuctionDetails';
import SubmitBid from './pages/SubmitBid';
import Analytics from './pages/Analytics';
import MyRFQs from './pages/MyRFQs';
import ActiveAuctions from './pages/ActiveAuctions';
import Settings from './pages/Settings';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Role-based Dashboard Redirect
const DashboardRedirect = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  switch (user?.role) {
    case 'buyer':
      return <Navigate to="/dashboard/buyer" replace />;
    case 'supplier':
      return <Navigate to="/dashboard/supplier" replace />;
    case 'admin':
      return <Navigate to="/dashboard/admin" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardRedirect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/buyer"
              element={
                <ProtectedRoute allowedRoles={['buyer', 'admin']}>
                  <BuyerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/supplier"
              element={
                <ProtectedRoute allowedRoles={['supplier', 'admin']}>
                  <SupplierDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* RFQ Routes */}
            <Route
              path="/create-rfq"
              element={
                <ProtectedRoute allowedRoles={['buyer', 'admin']}>
                  <CreateRFQ />
                </ProtectedRoute>
              }
            />
            <Route
              path="/auctions/:id"
              element={
                <ProtectedRoute>
                  <AuctionDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bid/:id"
              element={
                <ProtectedRoute allowedRoles={['supplier', 'admin']}>
                  <SubmitBid />
                </ProtectedRoute>
              }
            />

            {/* Additional Routes */}
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rfqs"
              element={
                <ProtectedRoute>
                  <MyRFQs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/auctions"
              element={
                <ProtectedRoute>
                  <ActiveAuctions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* Default Route */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Catch all - redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
