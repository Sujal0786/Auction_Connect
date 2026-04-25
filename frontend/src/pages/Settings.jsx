import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Menu, User, Bell, Shield, LogOut } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Sidebar from '../components/layout/Sidebar';

const Settings = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    success('Profile updated successfully');
  };

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
              <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
              <p className="text-slate-600">Manage your account preferences</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Profile Header */}
            <Card>
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-slate-900">{user?.name || 'User'}</h2>
                  <p className="text-slate-600">{user?.email}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700 capitalize">
                      {user?.role}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Profile Settings */}
            <Card>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Profile Settings</h2>
                  <p className="text-sm text-slate-600">Update your personal information</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    name="name"
                    defaultValue={user?.name}
                    placeholder="John Doe"
                  />
                  <Input
                    label="Email"
                    name="email"
                    defaultValue={user?.email}
                    disabled
                  />
                  <Input
                    label="Company Name"
                    name="companyName"
                    defaultValue={user?.companyName}
                    placeholder="Acme Logistics"
                  />
                  <Input
                    label="Phone"
                    name="phone"
                    defaultValue={user?.phone}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <Button type="submit">Save Changes</Button>
              </form>
            </Card>

            {/* Notification Settings */}
            <Card>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Notification Settings</h2>
                  <p className="text-sm text-slate-600">Configure your notification preferences</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-primary-600" />
                  <span className="text-slate-700">Email notifications for new RFQs</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-primary-600" />
                  <span className="text-slate-700">Email notifications for bid updates</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-primary-600" />
                  <span className="text-slate-700">Email notifications for auction extensions</span>
                </label>
              </div>
            </Card>

            {/* Security Settings */}
            <Card>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Security</h2>
                  <p className="text-sm text-slate-600">Manage your account security</p>
                </div>
              </div>

              <div className="space-y-4">
                <Button variant="secondary">Change Password</Button>
                <Button variant="secondary">Enable Two-Factor Authentication</Button>
              </div>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
                  <p className="text-sm text-red-600">Irreversible actions</p>
                </div>
                <Button
                  variant="danger"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
