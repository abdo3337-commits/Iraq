import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import {
  AdminStats,
  UsersManagement,
  DriversManagement,
  TripsManagement,
  PricingConfig
} from '../components/AdminComponents';

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('stats');

  const tabs = [
    { id: 'stats', name: 'الإحصائيات', icon: '📊' },
    { id: 'users', name: 'المستخدمين', icon: '👥' },
    { id: 'drivers', name: 'السائقين', icon: '🚗' },
    { id: 'trips', name: 'الرحلات', icon: '🎯' },
    { id: 'pricing', name: 'الأسعار', icon: '💰' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-orange-600 mr-4">🚍 الباص البرتقالي</h1>
              <span className="text-gray-600">لوحة الإدارة - مرحباً، {user?.name}</span>
            </div>
            <button
              onClick={logout}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              تسجيل الخروج 🚪
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="p-4 bg-purple-600 text-white">
                <h3 className="font-bold">👨‍💼 لوحة الإدارة</h3>
              </div>
              <nav className="p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-right px-4 py-3 rounded-lg mb-2 transition-colors ${
                      activeTab === tab.id
                        ? 'bg-purple-50 text-purple-600 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-3">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Admin Info Card */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
              <div className="text-center">
                <div className="text-4xl mb-3">👨‍💼</div>
                <h4 className="font-bold">{user?.name}</h4>
                <p className="text-sm text-gray-600">{user?.email}</p>
                <div className="mt-3 p-2 bg-purple-50 rounded">
                  <div className="text-xs text-purple-600">صلاحية</div>
                  <div className="font-bold text-purple-800">مدير النظام</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
              <h4 className="font-bold mb-3">🚀 إجراءات سريعة</h4>
              <div className="space-y-2 text-sm">
                <button className="w-full text-right px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors">
                  📢 إرسال إشعار عام
                </button>
                <button className="w-full text-right px-3 py-2 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors">
                  📊 تصدير التقارير
                </button>
                <button className="w-full text-right px-3 py-2 bg-orange-50 text-orange-700 rounded hover:bg-orange-100 transition-colors">
                  ⚙️ إعدادات النظام
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-lg shadow-sm border">
              {/* Tab Headers */}
              <div className="border-b p-4">
                <div className="flex flex-wrap gap-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        activeTab === tab.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tab.icon} {tab.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'stats' && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">📊 إحصائيات النظام</h2>
                    <AdminStats />
                  </div>
                )}

                {activeTab === 'users' && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">👥 إدارة المستخدمين</h2>
                    <UsersManagement />
                  </div>
                )}

                {activeTab === 'drivers' && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">🚗 إدارة السائقين</h2>
                    <DriversManagement />
                  </div>
                )}

                {activeTab === 'trips' && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">🎯 إدارة الرحلات</h2>
                    <TripsManagement />
                  </div>
                )}

                {activeTab === 'pricing' && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">💰 إعدادات الأسعار</h2>
                    <PricingConfig />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;