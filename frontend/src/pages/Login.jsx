import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Gavel, 
  TrendingUp, 
  Shield, 
  Users, 
  Eye, 
  EyeOff,
  Zap,
  Award,
  CheckCircle
} from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
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
    { 
      email: 'buyer@gocomet.test', 
      password: '123456', 
      role: 'Buyer', 
      description: 'Create RFQs & manage auctions',
      icon: Gavel,
      gradient: 'from-blue-500 to-blue-600'
    },
    { 
      email: 'supplier1@gocomet.test', 
      password: '123456', 
      role: 'Supplier', 
      description: 'Submit bids & track rankings',
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-emerald-600'
    },
    { 
      email: 'admin@gocomet.test', 
      password: '123456', 
      role: 'Admin', 
      description: 'Platform oversight & control',
      icon: Shield,
      gradient: 'from-purple-500 to-purple-600'
    },
  ];

  const stats = [
    { label: 'Real-time RFQs', value: 'Live', icon: Zap, color: 'text-blue-400' },
    { label: 'Live Auctions', value: 'Active', icon: Gavel, color: 'text-emerald-400' },
    { label: 'Supplier Ranking', value: 'L1/L2/L3', icon: Award, color: 'text-amber-400' },
    { label: 'Secure Bids', value: 'Protected', icon: Shield, color: 'text-purple-400' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Side - Premium Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-12">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <Gavel className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">RFQ Platform</h1>
              <p className="text-white/70 text-sm font-medium">British Auction System</p>
            </div>
          </div>
          
          <h2 className="text-5xl font-bold text-white mb-6 leading-tight tracking-tight">
            Modern RFQ & British Auction Platform
          </h2>
          <p className="text-white/90 text-xl mb-12 leading-relaxed max-w-xl">
            Create RFQs, invite suppliers, run live reverse bidding, track rankings, and award winners with confidence.
          </p>
          
          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-4 mb-12">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20"
              >
                <stat.icon className={`w-6 h-6 ${stat.color} mb-3`} />
                <p className="text-white/70 text-sm mb-1">{stat.label}</p>
                <p className="text-white font-semibold text-lg">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Feature List */}
          <div className="space-y-4">
            {[
              { icon: Zap, text: 'Live Auction Engine' },
              { icon: TrendingUp, text: 'Auto Extension Rules' },
              { icon: Award, text: 'L1/L2/L3 Supplier Ranking' },
              { icon: Shield, text: 'Secure Multi-role Access' },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-center space-x-4 text-white/90"
              >
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                  <feature.icon className="w-6 h-6" />
                </div>
                <span className="text-lg font-medium">{feature.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
        
        <div className="relative z-10 text-white/60 text-sm">
          © 2026 RFQ Platform. All rights reserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-slate-50 to-slate-100">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          {/* Login Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 p-8 lg:p-10">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Welcome back</h1>
              <p className="text-slate-600 text-lg">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@company.com"
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                loading={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/40"
                size="lg"
              >
                {loading ? 'Signing in...' : 'Sign in'}
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-slate-600">
                Don't have an account?{' '}
                <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
                  Sign up for free
                </Link>
              </p>
            </div>
          </div>

          {/* Demo Accounts Section */}
          <div className="mt-8">
            <div className="text-center mb-6">
              <p className="text-slate-600 text-sm font-medium">
                Use demo accounts to explore buyer and supplier flows
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {demoAccounts.map((account, index) => (
                <motion.button
                  key={index}
                  type="button"
                  onClick={() => handleDemoLogin(account.email, account.password)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative group bg-white rounded-2xl p-5 border border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-200"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${account.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity`}></div>
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${account.gradient} flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/20`}>
                      <account.icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="font-semibold text-slate-900 mb-1">{account.role}</p>
                    <p className="text-xs text-slate-500 mb-2">{account.description}</p>
                    <p className="text-xs text-slate-400 font-mono">{account.email}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
