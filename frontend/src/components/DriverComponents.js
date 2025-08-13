import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Driver Profile Setup
const DriverProfileSetup = ({ onSetupComplete }) => {
  const [profileData, setProfileData] = useState({
    vehicle_type: '',
    vehicle_model: '',
    vehicle_plate: '',
    license_number: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const vehicleTypes = [
    'سيدان',
    'هاتشباك',
    'SUV',
    'بيك أب',
    'فان',
    'أخرى'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post('/driver/register', profileData);
      onSetupComplete();
    } catch (error) {
      console.error('Error setting up driver profile:', error);
      setError(error.response?.data?.detail || 'حدث خطأ في إعداد ملف السائق');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <div className="text-4xl mb-4">🚗</div>
        <h2 className="text-2xl font-bold mb-2">إعداد ملف السائق</h2>
        <p className="text-gray-600">أدخل بيانات مركبتك لبدء العمل</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">نوع المركبة</label>
          <select
            name="vehicle_type"
            value={profileData.vehicle_type}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
            required
          >
            <option value="">اختر نوع المركبة</option>
            {vehicleTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">موديل المركبة</label>
          <input
            type="text"
            name="vehicle_model"
            value={profileData.vehicle_model}
            onChange={handleChange}
            placeholder="مثال: تويوتا كامري 2020"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">رقم اللوحة</label>
          <input
            type="text"
            name="vehicle_plate"
            value={profileData.vehicle_plate}
            onChange={handleChange}
            placeholder="مثال: ب ج د 123"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">رقم رخصة القيادة</label>
          <input
            type="text"
            name="license_number"
            value={profileData.license_number}
            onChange={handleChange}
            placeholder="رقم الرخصة"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 focus:outline-none focus:bg-orange-700 disabled:opacity-50"
        >
          {loading ? 'جاري الحفظ...' : 'حفظ وبدء العمل'}
        </button>
      </form>
    </div>
  );
};

// Availability Toggle
const AvailabilityToggle = ({ isAvailable, onToggle, loading }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg">حالة التوفر</h3>
          <p className="text-sm text-gray-600">
            {isAvailable ? 'متوفر لاستقبال الطلبات' : 'غير متوفر حالياً'}
          </p>
        </div>
        <button
          onClick={onToggle}
          disabled={loading}
          className={`px-6 py-3 rounded-full font-bold transition-colors ${
            isAvailable
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
          } disabled:opacity-50`}
        >
          {loading ? '...' : isAvailable ? '🟢 متوفر' : '🔴 غير متوفر'}
        </button>
      </div>
    </div>
  );
};

// Available Trips List
const AvailableTrips = ({ onAcceptTrip }) => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingTripId, setAcceptingTripId] = useState(null);

  useEffect(() => {
    fetchAvailableTrips();
    const interval = setInterval(fetchAvailableTrips, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAvailableTrips = async () => {
    try {
      const response = await axios.get('/trips/available');
      setTrips(response.data);
    } catch (error) {
      console.error('Error fetching available trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTrip = async (tripId) => {
    setAcceptingTripId(tripId);
    try {
      await axios.post(`/trips/${tripId}/accept`);
      onAcceptTrip();
      fetchAvailableTrips();
    } catch (error) {
      console.error('Error accepting trip:', error);
      alert('حدث خطأ في قبول الرحلة');
    } finally {
      setAcceptingTripId(null);
    }
  };

  const getTripTypeText = (type) => {
    const typeMap = {
      instant: 'مشوار فوري',
      hourly: 'حجز بالساعة',
      task: 'مهمة'
    };
    return typeMap[type] || type;
  };

  const getTripTypeIcon = (type) => {
    const iconMap = {
      instant: '🚗',
      hourly: '⏰',
      task: '📦'
    };
    return iconMap[type] || '🚗';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-lg shadow-sm">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-lg font-bold mb-2">لا توجد رحلات متاحة</h3>
        <p className="text-gray-600">سيتم إشعارك عند توفر رحلات جديدة</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">الرحلات المتاحة ({trips.length})</h3>
      {trips.map((trip) => (
        <div key={trip.id} className="bg-white border rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center">
              <span className="text-2xl mr-3">{getTripTypeIcon(trip.trip_type)}</span>
              <div>
                <div className="font-bold">{getTripTypeText(trip.trip_type)}</div>
                <div className="text-sm text-gray-600">{trip.district}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg text-orange-600">
                {trip.estimated_price.toLocaleString()} د.ع
              </div>
              <div className="text-sm text-gray-600">
                {new Date(trip.created_at).toLocaleTimeString('ar-IQ', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-4 space-y-1">
            <div><strong>من:</strong> {trip.pickup_location.address}</div>
            {trip.destination && (
              <div><strong>إلى:</strong> {trip.destination.address}</div>
            )}
            {trip.distance_km && (
              <div><strong>المسافة:</strong> {trip.distance_km} كم</div>
            )}
            {trip.hourly_duration && (
              <div><strong>المدة:</strong> {trip.hourly_duration} ساعة</div>
            )}
          </div>

          <button
            onClick={() => handleAcceptTrip(trip.id)}
            disabled={acceptingTripId === trip.id}
            className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg font-bold hover:bg-orange-700 disabled:opacity-50"
          >
            {acceptingTripId === trip.id ? (
              <div className="flex items-center justify-center">
                <div className="loading-spinner mr-2"></div>
                جاري قبول الرحلة...
              </div>
            ) : (
              'قبول الرحلة'
            )}
          </button>
        </div>
      ))}
    </div>
  );
};

// Current Trip Component
const CurrentTrip = ({ trip, onTripUpdate }) => {
  const [loading, setLoading] = useState(false);

  const handleStartTrip = async () => {
    setLoading(true);
    try {
      await axios.post(`/trips/${trip.id}/start`);
      onTripUpdate();
    } catch (error) {
      console.error('Error starting trip:', error);
      alert('حدث خطأ في بدء الرحلة');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTrip = async () => {
    const confirmed = window.confirm('هل أنت متأكد من إكمال الرحلة؟');
    if (!confirmed) return;

    setLoading(true);
    try {
      await axios.post(`/trips/${trip.id}/complete`);
      onTripUpdate();
    } catch (error) {
      console.error('Error completing trip:', error);
      alert('حدث خطأ في إكمال الرحلة: ' + (error.response?.data?.detail || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  };

  const getTripTypeText = (type) => {
    const typeMap = {
      instant: 'مشوار فوري',
      hourly: 'حجز بالساعة',
      task: 'مهمة'
    };
    return typeMap[type] || type;
  };

  const getStatusText = (status) => {
    const statusMap = {
      accepted: 'مقبولة - جاري التوجه',
      in_progress: 'قيد التنفيذ',
      completed: 'مكتملة'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      accepted: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold mb-1">رحلتك الحالية</h3>
          <span className={`px-2 py-1 rounded text-sm font-semibold ${getStatusColor(trip.status)}`}>
            {getStatusText(trip.status)}
          </span>
        </div>
        <div className="text-right">
          <div className="font-bold text-xl text-orange-600">
            {trip.estimated_price.toLocaleString()} د.ع
          </div>
          <div className="text-sm text-gray-600">{getTripTypeText(trip.trip_type)}</div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="bg-gray-50 p-3 rounded">
          <div className="font-bold text-sm text-gray-700">📍 نقطة الانطلاق</div>
          <div className="text-sm">{trip.pickup_location.address}</div>
        </div>
        
        {trip.destination && (
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-bold text-sm text-gray-700">🎯 الوجهة</div>
            <div className="text-sm">{trip.destination.address}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 p-3 rounded text-center">
            <div className="font-bold text-gray-700">القضاء</div>
            <div>{trip.district}</div>
          </div>
          {trip.distance_km && (
            <div className="bg-gray-50 p-3 rounded text-center">
              <div className="font-bold text-gray-700">المسافة</div>
              <div>{trip.distance_km} كم</div>
            </div>
          )}
          {trip.hourly_duration && (
            <div className="bg-gray-50 p-3 rounded text-center">
              <div className="font-bold text-gray-700">المدة</div>
              <div>{trip.hourly_duration} ساعة</div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {trip.status === 'accepted' && (
          <button
            onClick={handleStartTrip}
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'جاري البدء...' : '🚀 بدء الرحلة'}
          </button>
        )}

        {trip.status === 'in_progress' && (
          <button
            onClick={handleCompleteTrip}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'جاري إكمال الرحلة...' : '✅ إكمال الرحلة'}
          </button>
        )}
      </div>
    </div>
  );
};

// Driver Earnings Component
const DriverEarnings = () => {
  const [earnings, setEarnings] = useState({
    todayEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    totalTrips: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    try {
      const [balanceResponse, transactionsResponse] = await Promise.all([
        axios.get('/wallet/balance'),
        axios.get('/wallet/transactions')
      ]);
      
      const allTransactions = transactionsResponse.data;
      const earningTransactions = allTransactions.filter(t => t.transaction_type === 'trip_earning');
      
      // Calculate earnings
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const todayEarnings = earningTransactions
        .filter(t => new Date(t.created_at) >= todayStart)
        .reduce((sum, t) => sum + t.amount, 0);

      const weeklyEarnings = earningTransactions
        .filter(t => new Date(t.created_at) >= weekStart)
        .reduce((sum, t) => sum + t.amount, 0);

      const monthlyEarnings = earningTransactions
        .filter(t => new Date(t.created_at) >= monthStart)
        .reduce((sum, t) => sum + t.amount, 0);

      setEarnings({
        todayEarnings,
        weeklyEarnings,
        monthlyEarnings,
        totalTrips: earningTransactions.length
      });

      setTransactions(earningTransactions.slice(0, 10)); // Show last 10 transactions
    } catch (error) {
      console.error('Error fetching earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Earnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-500 text-white rounded-lg p-4">
          <div className="font-bold">💰 أرباح اليوم</div>
          <div className="text-2xl font-bold">{earnings.todayEarnings.toLocaleString()} د.ع</div>
        </div>
        
        <div className="bg-blue-500 text-white rounded-lg p-4">
          <div className="font-bold">📊 أرباح الأسبوع</div>
          <div className="text-2xl font-bold">{earnings.weeklyEarnings.toLocaleString()} د.ع</div>
        </div>
        
        <div className="bg-purple-500 text-white rounded-lg p-4">
          <div className="font-bold">📈 أرباح الشهر</div>
          <div className="text-2xl font-bold">{earnings.monthlyEarnings.toLocaleString()} د.ع</div>
        </div>
      </div>

      {/* Trip Stats */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="font-bold text-lg mb-2">📊 إحصائيات الرحلات</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-orange-600">{earnings.totalTrips}</div>
            <div className="text-sm text-gray-600">إجمالي الرحلات</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {earnings.totalTrips > 0 ? (earnings.monthlyEarnings / earnings.totalTrips).toFixed(0) : 0}
            </div>
            <div className="text-sm text-gray-600">متوسط الربح لكل رحلة</div>
          </div>
        </div>
      </div>

      {/* Recent Earnings */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="font-bold text-lg mb-4">💵 آخر الأرباح</h3>
        {transactions.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            لا توجد أرباح بعد
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <div className="font-semibold">ربح من رحلة</div>
                  <div className="text-sm text-gray-600">
                    {new Date(transaction.created_at).toLocaleDateString('ar-IQ')}
                  </div>
                </div>
                <div className="font-bold text-green-600">
                  +{transaction.amount.toLocaleString()} د.ع
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export {
  DriverProfileSetup,
  AvailabilityToggle,
  AvailableTrips,
  CurrentTrip,
  DriverEarnings
};