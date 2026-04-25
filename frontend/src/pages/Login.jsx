import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Mail, Lock, ArrowRight, Gavel, TrendingUp, Shield, Users } from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      success('Welcome back! Login successful.');
      navigate('/dashboard');
    } else {
      error(result.message);
    }
    
    setLoading(false);
  };

  const handleDemoLogin = (email, password) => {
    setFormData({ email, password });
  };

  const demoAccounts = [
    { email: 'buyer@gocomet.test', password: '123456', role: 'Buyer', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { email: 'supplier1@gocomet.test', password: '123456', role: 'Supplier', color: 'bg-green-50 text-green-700 border-green-200' },
    { email: 'admin@gocomet.test', password: '123456', role: 'Admin', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-12 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Gavel className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">RFQ Platform</h1>
              <p className="text-white/70 text-sm">British Auction System</p>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
            Enterprise Procurement Made Simple
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Streamline your RFQ process with real-time British Auctions, automatic ranking, and intelligent bid management.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-white/90">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span>Real-time Auction Engine</span>
            </div>
            <div className="flex items-center space-x-3 text-white/90">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <span>Secure & Compliant</span>
            </div>
            <div className="flex items-center space-x-3 text-white/90">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <span>Multi-role Support</span>
            </div>
          </div>
        </div>
        
        <div className="text-white/60 text-sm">
          © 2024 British Auction RFQ Platform. All rights reserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back</h1>
            <p className="text-slate-600">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              icon={Mail}
              placeholder="you@company.com"
              required
            />

            <Input
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              icon={Lock}
              placeholder="••••••••"
              required
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm text-slate-600">
                <input type="checkbox" className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              Sign in
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold">
                Sign up for free
              </Link>
            </p>
          </div>

          {/* Demo Accounts */}
          <div className="mt-12 pt-8 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Demo Accounts</h3>
            <div className="space-y-3">
              {demoAccounts.map((account, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDemoLogin(account.email, account.password)}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border ${account.color} hover:opacity-80 transition-opacity`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-current/20 flex items-center justify-center">
                      <span className="text-xs font-bold">{account.role.charAt(0)}</span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">{account.role}</p>
                      <p className="text-xs opacity-70">{account.email}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
