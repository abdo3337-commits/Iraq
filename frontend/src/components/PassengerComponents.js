import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Mock Map Component (placeholder for Google Maps)
const MockMap = ({ center, markers = [], onLocationSelect }) => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert click position to mock coordinates
    const lat = center.lat + (y - 200) * -0.001;
    const lng = center.lng + (x - 300) * 0.001;
    
    const location = {
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      address: `موقع تقريبي: ${lat.toFixed(4)}, ${lng.toFixed(4)}`
    };
    
    setSelectedLocation(location);
    onLocationSelect && onLocationSelect(location);
  };

  return (
    <div className="relative bg-green-100 rounded-lg overflow-hidden border-2 border-dashed border-green-300">
      <div 
        className="w-full h-64 cursor-pointer flex items-center justify-center"
        onClick={handleMapClick}
      >
        <div className="text-center">
          <div className="text-4xl mb-2">🗺️</div>
          <p className="text-gray-600 font-bold">خريطة تجريبية</p>
          <p className="text-sm text-gray-500">اضغط لاختيار موقع</p>
          {selectedLocation && (
            <div className="mt-2 p-2 bg-white rounded shadow">
              <p className="text-xs">📍 {selectedLocation.address}</p>
            </div>
          )}
        </div>
      </div>
      
      {markers.map((marker, index) => (
        <div
          key={index}
          className="absolute w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold transform -translate-x-3 -translate-y-3"
          style={{
            left: `${50 + (marker.lng - center.lng) * 1000}px`,
            top: `${50 - (marker.lat - center.lat) * 1000}px`
          }}
        >
          📍
        </div>
      ))}
    </div>
  );
};

// District Selector Component
const DistrictSelector = ({ selectedDistrict, onSelect, districts }) => {
  return (
    <div className="mb-4">
      <label className="block text-gray-700 text-sm font-bold mb-2">اختر القضاء</label>
      <select
        value={selectedDistrict}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
      >
        <option value="">-- اختر القضاء --</option>
        {districts.map((district) => (
          <option key={district} value={district}>{district}</option>
        ))}
      </select>
    </div>
  );
};

// Trip Type Selector
const TripTypeSelector = ({ selectedType, onSelect }) => {
  const tripTypes = [
    { id: 'instant', name: 'مشوار فوري', icon: '🚗', description: 'احجز سيارة الآن' },
    { id: 'hourly', name: 'حجز بالساعة', icon: '⏰', description: 'احجز لساعات محددة' },
    { id: 'task', name: 'مهمة', icon: '📦', description: 'مهام وتوصيل طرود' }
  ];

  return (
    <div className="mb-6">
      <label className="block text-gray-700 text-sm font-bold mb-2">نوع الخدمة</label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {tripTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => onSelect(type.id)}
            className={`p-4 rounded-lg border-2 transition-colors ${
              selectedType === type.id
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 bg-white hover:border-orange-300'
            }`}
          >
            <div className="text-2xl mb-2">{type.icon}</div>
            <h3 className="font-bold mb-1">{type.name}</h3>
            <p className="text-sm text-gray-600">{type.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

// Location Input Component
const LocationInput = ({ label, location, onLocationChange, placeholder }) => {
  return (
    <div className="mb-4">
      <label className="block text-gray-700 text-sm font-bold mb-2">{label}</label>
      <input
        type="text"
        value={location?.address || ''}
        onChange={(e) => onLocationChange({ 
          ...location, 
          address: e.target.value 
        })}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
      />
      {location && location.lat && (
        <p className="text-xs text-gray-500 mt-1">
          📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
        </p>
      )}
    </div>
  );
};

// Fare Estimator
const FareEstimator = ({ district, tripType, distance, duration, hourlyDuration }) => {
  const [fare, setFare] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (district && tripType) {
      calculateFare();
    }
  }, [district, tripType, distance, duration, hourlyDuration]);

  const calculateFare = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/calculate-fare', {
        trip_type: tripType,
        district,
        distance_km: distance || 0,
        duration_minutes: duration || 0,
        hourly_duration: hourlyDuration || 0
      });
      setFare(response.data.estimated_price);
    } catch (error) {
      console.error('Error calculating fare:', error);
      setFare(null);
    } finally {
      setLoading(false);
    }
  };

  if (!district || !tripType) return null;

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
      <h3 className="font-bold mb-2">💰 التكلفة المتوقعة</h3>
      {loading ? (
        <div className="flex items-center">
          <div className="loading-spinner mr-2"></div>
          <span>جاري الحساب...</span>
        </div>
      ) : fare ? (
        <div className="text-2xl font-bold text-orange-600">
          {fare.toLocaleString()} دينار عراقي
        </div>
      ) : (
        <div className="text-gray-500">غير متاح</div>
      )}
    </div>
  );
};

// Trip Booking Form
const TripBookingForm = ({ districts }) => {
  const [formData, setFormData] = useState({
    tripType: '',
    district: '',
    pickupLocation: null,
    destination: null,
    distance: 5,
    duration: 15,
    hourlyDuration: 1
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.tripType || !formData.district || !formData.pickupLocation) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const tripData = {
        trip_type: formData.tripType,
        district: formData.district,
        pickup_location: formData.pickupLocation,
        destination: formData.destination,
        distance_km: formData.distance,
        duration_minutes: formData.duration,
        hourly_duration: formData.hourlyDuration
      };

      const response = await axios.post('/trips', tripData);
      setSuccess(true);
      
      // Reset form
      setFormData({
        tripType: '',
        district: '',
        pickupLocation: null,
        destination: null,
        distance: 5,
        duration: 15,
        hourlyDuration: 1
      });
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error creating trip:', error);
      setError(error.response?.data?.detail || 'حدث خطأ في إنشاء الرحلة');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-xl font-bold mb-2">تم طلب الرحلة بنجاح!</h3>
        <p className="text-gray-600">سيتم إشعارك عند قبول أحد السائقين للرحلة</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <TripTypeSelector 
        selectedType={formData.tripType}
        onSelect={(type) => setFormData({...formData, tripType: type})}
      />

      <DistrictSelector
        selectedDistrict={formData.district}
        onSelect={(district) => setFormData({...formData, district})}
        districts={districts}
      />

      <div className="space-y-4">
        <h3 className="font-bold">📍 تحديد المواقع</h3>
        
        <MockMap
          center={{ lat: 33.4242, lng: 43.3003 }} // Ramadi coordinates
          markers={[
            ...(formData.pickupLocation ? [formData.pickupLocation] : []),
            ...(formData.destination ? [formData.destination] : [])
          ]}
          onLocationSelect={(location) => {
            if (!formData.pickupLocation) {
              setFormData({...formData, pickupLocation: location});
            } else {
              setFormData({...formData, destination: location});
            }
          }}
        />
        
        <LocationInput
          label="نقطة الانطلاق *"
          location={formData.pickupLocation}
          onLocationChange={(location) => setFormData({...formData, pickupLocation: location})}
          placeholder="اضغط على الخريطة لتحديد نقطة الانطلاق"
        />

        {formData.tripType !== 'hourly' && (
          <LocationInput
            label="الوجهة"
            location={formData.destination}
            onLocationChange={(location) => setFormData({...formData, destination: location})}
            placeholder="اضغط على الخريطة لتحديد الوجهة"
          />
        )}
      </div>

      {formData.tripType === 'instant' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">المسافة (كم)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.distance}
              onChange={(e) => setFormData({...formData, distance: parseFloat(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">الوقت المتوقع (دقيقة)</label>
            <input
              type="number"
              min="5"
              max="180"
              value={formData.duration}
              onChange={(e) => setFormData({...formData, duration: parseFloat(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
      )}

      {formData.tripType === 'hourly' && (
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">عدد الساعات</label>
          <select
            value={formData.hourlyDuration}
            onChange={(e) => setFormData({...formData, hourlyDuration: parseInt(e.target.value)})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
          >
            {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(hours => (
              <option key={hours} value={hours}>{hours} ساعة</option>
            ))}
          </select>
        </div>
      )}

      <FareEstimator
        district={formData.district}
        tripType={formData.tripType}
        distance={formData.distance}
        duration={formData.duration}
        hourlyDuration={formData.hourlyDuration}
      />

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-orange-700 focus:outline-none focus:bg-orange-700 disabled:opacity-50"
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="loading-spinner mr-2"></div>
            جاري إنشاء الطلب...
          </div>
        ) : (
          'طلب الرحلة'
        )}
      </button>
    </form>
  );
};

// Trip History Component
const TripHistory = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const response = await axios.get('/trips');
      setTrips(response.data);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      requested: 'مطلوبة',
      accepted: 'مقبولة',
      in_progress: 'قيد التنفيذ',
      completed: 'مكتملة',
      cancelled: 'ملغية'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    return `status-${status.replace('_', '-')}`;
  };

  const getTripTypeText = (type) => {
    const typeMap = {
      instant: 'مشوار فوري',
      hourly: 'حجز بالساعة',
      task: 'مهمة'
    };
    return typeMap[type] || type;
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
      <div className="text-center py-8">
        <div className="text-4xl mb-4">🚗</div>
        <h3 className="text-lg font-bold mb-2">لا توجد رحلات</h3>
        <p className="text-gray-600">لم تقم بأي رحلات بعد</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {trips.map((trip) => (
        <div key={trip.id} className="bg-white border rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className={`${getStatusClass(trip.status)} mr-2`}>
                {getStatusText(trip.status)}
              </span>
              <span className="text-sm text-gray-600">
                {getTripTypeText(trip.trip_type)}
              </span>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg">
                {(trip.final_price || trip.estimated_price).toLocaleString()} د.ع
              </div>
              <div className="text-sm text-gray-600">
                {new Date(trip.created_at).toLocaleDateString('ar-IQ')}
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            <p><strong>القضاء:</strong> {trip.district}</p>
            <p><strong>من:</strong> {trip.pickup_location.address}</p>
            {trip.destination && (
              <p><strong>إلى:</strong> {trip.destination.address}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Wallet Component
const WalletComponent = () => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [depositAmount, setDepositAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const [balanceResponse, transactionsResponse] = await Promise.all([
        axios.get('/wallet/balance'),
        axios.get('/wallet/transactions')
      ]);
      
      setBalance(balanceResponse.data.balance);
      setTransactions(transactionsResponse.data);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    
    setLoading(true);
    try {
      await axios.post('/wallet/deposit', {
        amount: parseFloat(depositAmount),
        payment_method: 'cash'
      });
      
      setDepositAmount('');
      setShowDeposit(false);
      fetchWalletData();
    } catch (error) {
      console.error('Error depositing:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type) => {
    const icons = {
      deposit: '💰',
      withdrawal: '💸',
      trip_payment: '🚗',
      trip_earning: '💵'
    };
    return icons[type] || '💳';
  };

  const getTransactionText = (type) => {
    const texts = {
      deposit: 'إيداع',
      withdrawal: 'سحب',
      trip_payment: 'دفع رحلة',
      trip_earning: 'ربح رحلة'
    };
    return texts[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="bg-orange-600 text-white rounded-xl p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold mb-2">💰 رصيد المحفظة</h3>
            <div className="text-3xl font-bold">
              {balance.toLocaleString()} د.ع
            </div>
          </div>
          <button
            onClick={() => setShowDeposit(true)}
            className="bg-white text-orange-600 px-4 py-2 rounded-lg font-bold hover:bg-gray-100"
          >
            إيداع
          </button>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">إيداع في المحفظة</h3>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">المبلغ (د.ع)</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="أدخل المبلغ"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleDeposit}
                disabled={loading}
                className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {loading ? 'جاري الإيداع...' : 'إيداع'}
              </button>
              <button
                onClick={() => setShowDeposit(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div>
        <h3 className="text-lg font-bold mb-4">تاريخ المعاملات</h3>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            لا توجد معاملات
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">
                      {getTransactionIcon(transaction.transaction_type)}
                    </span>
                    <div>
                      <div className="font-bold">
                        {getTransactionText(transaction.transaction_type)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {transaction.description}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()} د.ع
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(transaction.created_at).toLocaleDateString('ar-IQ')}
                    </div>
                  </div>
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
  MockMap,
  DistrictSelector,
  TripTypeSelector,
  LocationInput,
  FareEstimator,
  TripBookingForm,
  TripHistory,
  WalletComponent
};