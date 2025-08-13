import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../App';
import {
  DriverProfileSetup,
  AvailabilityToggle,
  AvailableTrips,
  CurrentTrip,
  DriverEarnings
} from '../components/DriverComponents';

const DriverDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('trips');
  const [driverProfile, setDriverProfile] = useState(null);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [availability, setAvailability] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    fetchDriverData();
  }, []);

  const fetchDriverData = async () => {
    try {
      const [profileResponse, tripsResponse] = await Promise.all([
        axios.get('/driver/profile').catch(() => null),
        axios.get('/trips')
      ]);

      if (profileResponse) {
        setDriverProfile(profileResponse.data);
        setAvailability(profileResponse.data.is_available);
      }

      // Find current trip
      const currentTrip = tripsResponse.data.find(
        trip => trip.status === 'accepted' || trip.status === 'in_progress'
      );
      setCurrentTrip(currentTrip);

    } catch (error) {
      console.error('Error fetching driver data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSetup = () => {
    fetchDriverData();
  };

  const handleAvailabilityToggle = async () => {
    setProfileLoading(true);
    try {
      await axios.post('/driver/availability', { is_available: !availability });
      setAvailability(!availability);
    } catch (error) {
      console.error('Error toggling availability:', error);
      alert('حدث خطأ في تغيير حالة التوفر');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleTripUpdate = () => {
    fetchDriverData();
  };

  const tabs = [
    { id: 'trips', name: 'الرحلات', icon: '🚗' },
    { id: 'earnings', name: 'الأرباح', icon: '💰' },
    { id: 'profile', name: 'الملف الشخصي', icon: '👤' }
  ];

  // Show profile setup if driver profile doesn't exist
  if (!loading && !driverProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <DriverProfileSetup onSetupComplete={handleProfileSetup} />
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold text-orange-600 mr-4">🚍 الباص البرتقالي</h1>
              <span className="text-gray-600">مرحباً، {user?.name}</span>
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="p-4 bg-green-600 text-white">
                <h3 className="font-bold">لوحة السائق</h3>
              </div>
              <nav className="p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-right px-4 py-3 rounded-lg mb-2 transition-colors ${
                      activeTab === tab.id
                        ? 'bg-green-50 text-green-600 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-3">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Driver Info Card */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
              <div className="text-center">
                <div className="text-4xl mb-3">🚗</div>
                <h4 className="font-bold">{user?.name}</h4>
                <p className="text-sm text-gray-600">{user?.phone}</p>
                {driverProfile && (
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="p-2 bg-blue-50 rounded">
                      <div className="font-semibold">{driverProfile.vehicle_type}</div>
                      <div className="text-gray-600">{driverProfile.vehicle_model}</div>
                      <div className="text-gray-600">لوحة: {driverProfile.vehicle_plate}</div>
                    </div>
                    <div className="flex items-center justify-center mt-2">
                      <span className="text-yellow-500 mr-1">⭐</span>
                      <span className="font-semibold">{driverProfile.rating.toFixed(1)}</span>
                      <span className="text-gray-600 mr-2">({driverProfile.total_trips} رحلة)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Availability Toggle */}
            <div className="mt-4">
              <AvailabilityToggle
                isAvailable={availability}
                onToggle={handleAvailabilityToggle}
                loading={profileLoading}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Current Trip Alert */}
            {currentTrip && (
              <div className="mb-6">
                <CurrentTrip trip={currentTrip} onTripUpdate={handleTripUpdate} />
              </div>
            )}

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
                          ? 'bg-green-600 text-white'
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
                {activeTab === 'trips' && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">🚗 الرحلات المتاحة</h2>
                    {currentTrip ? (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-4">⏳</div>
                        <h3 className="text-xl font-bold mb-2">لديك رحلة حالياً</h3>
                        <p className="text-gray-600">أكمل رحلتك الحالية لرؤية الرحلات الجديدة</p>
                      </div>
                    ) : availability ? (
                      <AvailableTrips onAcceptTrip={handleTripUpdate} />
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-4">⚠️</div>
                        <h3 className="text-xl font-bold mb-2">غير متاح للعمل</h3>
                        <p className="text-gray-600">فعل حالة التوفر لرؤية الرحلات المتاحة</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'earnings' && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">💰 تقرير الأرباح</h2>
                    <DriverEarnings />
                  </div>
                )}

                {activeTab === 'profile' && driverProfile && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">👤 الملف الشخصي</h2>
                    <div className="space-y-6">
                      {/* Personal Info */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-bold mb-3">المعلومات الشخصية</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>الاسم:</strong> {user.name}
                          </div>
                          <div>
                            <strong>البريد الإلكتروني:</strong> {user.email}
                          </div>
                          <div>
                            <strong>الهاتف:</strong> {user.phone}
                          </div>
                          <div>
                            <strong>رقم الرخصة:</strong> {driverProfile.license_number}
                          </div>
                        </div>
                      </div>

                      {/* Vehicle Info */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-bold mb-3">معلومات المركبة</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>نوع المركبة:</strong> {driverProfile.vehicle_type}
                          </div>
                          <div>
                            <strong>الموديل:</strong> {driverProfile.vehicle_model}
                          </div>
                          <div>
                            <strong>رقم اللوحة:</strong> {driverProfile.vehicle_plate}
                          </div>
                          <div>
                            <strong>حالة التوثيق:</strong> 
                            <span className={`mr-2 px-2 py-1 rounded text-xs ${
                              driverProfile.is_verified 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {driverProfile.is_verified ? 'موثق' : 'بانتظار التوثيق'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Performance Stats */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-bold mb-3">الإحصائيات</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                          <div className="bg-white p-3 rounded">
                            <div className="text-2xl font-bold text-green-600">{driverProfile.total_trips}</div>
                            <div className="text-sm text-gray-600">إجمالي الرحلات</div>
                          </div>
                          <div className="bg-white p-3 rounded">
                            <div className="text-2xl font-bold text-yellow-600">{driverProfile.rating.toFixed(1)}</div>
                            <div className="text-sm text-gray-600">متوسط التقييم</div>
                          </div>
                          <div className="bg-white p-3 rounded">
                            <div className="text-2xl font-bold text-blue-600">
                              {user.wallet_balance.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600">رصيد المحفظة (د.ع)</div>
                          </div>
                        </div>
                      </div>
                    </div>
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

export default DriverDashboard;