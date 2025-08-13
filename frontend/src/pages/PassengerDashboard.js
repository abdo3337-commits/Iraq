import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../App';
import {
  TripBookingForm,
  TripHistory,
  WalletComponent
} from '../components/PassengerComponents';

const PassengerDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('book');
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDistricts();
  }, []);

  const fetchDistricts = async () => {
    try {
      const response = await axios.get('/districts');
      setDistricts(response.data.districts);
    } catch (error) {
      console.error('Error fetching districts:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'book', name: 'طلب رحلة', icon: '🚗' },
    { id: 'history', name: 'رحلاتي', icon: '📋' },
    { id: 'wallet', name: 'المحفظة', icon: '💰' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex items-center bg-primary-500 text-white px-4 py-2 rounded-2xl mr-4 shadow-lg">
                <span className="text-2xl mr-2">🚍</span>
                <span className="text-xl font-bold">الباص البرتقالي</span>
              </div>
              <div>
                <div className="text-gray-600 text-sm">مرحباً،</div>
                <div className="font-semibold text-gray-800">{user?.name}</div>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center text-gray-600 hover:text-red-600 transition-colors duration-200 bg-gray-50 px-4 py-2 rounded-xl hover:bg-red-50"
            >
              <span className="mr-2">🚪</span>
              تسجيل الخروج
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
              <div className="bg-primary-500 text-white p-6">
                <div className="flex items-center">
                  <span className="text-3xl mr-3">🚍</span>
                  <div>
                    <h3 className="font-bold text-lg">لوحة الراكب</h3>
                    <p className="text-primary-100 text-sm">منصة النقل الذكية</p>
                  </div>
                </div>
              </div>
              <nav className="p-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-right px-4 py-3 rounded-xl mb-2 transition-all duration-200 font-semibold ${
                      activeTab === tab.id
                        ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-500 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600'
                    }`}
                  >
                    <span className="mr-3 text-lg">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* User Info Card */}
            <div className="bg-white rounded-2xl shadow-lg border p-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-4 text-white text-2xl shadow-lg">
                  👤
                </div>
                <h4 className="font-bold text-lg text-gray-800">{user?.name}</h4>
                <p className="text-sm text-gray-600 mb-2">{user?.email}</p>
                <p className="text-sm text-gray-600 mb-4">{user?.phone}</p>
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-4 rounded-2xl shadow-lg">
                  <div className="text-xs font-medium opacity-90 mb-1">رصيد المحفظة</div>
                  <div className="font-bold text-xl">
                    {user?.wallet_balance?.toLocaleString() || '0'} د.ع
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg border">
              {/* Tab Headers */}
              <div className="border-b p-6">
                <div className="flex flex-wrap gap-3">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-primary-500 text-white shadow-orange'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-primary-600'
                      }`}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      {tab.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-8">
                {activeTab === 'book' && (
                  <div className="animate-fade-in">
                    <div className="mb-8">
                      <h2 className="text-3xl font-bold text-gray-800 mb-2">🚗 طلب رحلة جديدة</h2>
                      <p className="text-gray-600">اختر نوع الخدمة والوجهة وسنجد لك أقرب سائق</p>
                    </div>
                    <TripBookingForm districts={districts} />
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="animate-fade-in">
                    <div className="mb-8">
                      <h2 className="text-3xl font-bold text-gray-800 mb-2">📋 تاريخ الرحلات</h2>
                      <p className="text-gray-600">استعرض جميع رحلاتك السابقة والحالية</p>
                    </div>
                    <TripHistory />
                  </div>
                )}

                {activeTab === 'wallet' && (
                  <div className="animate-fade-in">
                    <div className="mb-8">
                      <h2 className="text-3xl font-bold text-gray-800 mb-2">💰 إدارة المحفظة</h2>
                      <p className="text-gray-600">إدارة رصيدك ومعاملاتك المالية</p>
                    </div>
                    <WalletComponent />
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

export default PassengerDashboard;