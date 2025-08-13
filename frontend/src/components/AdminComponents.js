import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Stats Dashboard
const AdminStats = () => {
  const [stats, setStats] = useState({
    total_users: 0,
    total_drivers: 0,
    active_drivers: 0,
    total_trips: 0,
    trip_stats: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
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

  const getStatusColor = (status) => {
    const colorMap = {
      requested: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
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
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-500 text-white rounded-lg p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">👥</div>
            <div>
              <div className="text-2xl font-bold">{stats.total_users}</div>
              <div className="text-blue-100">إجمالي المستخدمين</div>
            </div>
          </div>
        </div>
        
        <div className="bg-green-500 text-white rounded-lg p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">🚗</div>
            <div>
              <div className="text-2xl font-bold">{stats.total_drivers}</div>
              <div className="text-green-100">إجمالي السائقين</div>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-500 text-white rounded-lg p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">⚡</div>
            <div>
              <div className="text-2xl font-bold">{stats.active_drivers}</div>
              <div className="text-orange-100">سائقين متاحين</div>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-500 text-white rounded-lg p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">🎯</div>
            <div>
              <div className="text-2xl font-bold">{stats.total_trips}</div>
              <div className="text-purple-100">إجمالي الرحلات</div>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Status Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-bold mb-4">📊 إحصائيات الرحلات حسب الحالة</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(stats.trip_stats).map(([status, count]) => (
            <div key={status} className="text-center">
              <div className={`px-3 py-2 rounded-lg ${getStatusColor(status)}`}>
                <div className="text-xl font-bold">{count}</div>
                <div className="text-sm">{getStatusText(status)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-bold mb-4">⚡ إجراءات سريعة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => fetchStats()}
            className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 تحديث البيانات
          </button>
          <button className="bg-gray-600 text-white p-4 rounded-lg hover:bg-gray-700 transition-colors">
            📈 تقرير يومي
          </button>
          <button className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors">
            💰 تقرير الأرباح
          </button>
          <button className="bg-orange-600 text-white p-4 rounded-lg hover:bg-orange-700 transition-colors">
            📱 إشعارات جماعية
          </button>
        </div>
      </div>
    </div>
  );
};

// Users Management
const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleText = (role) => {
    const roleMap = {
      passenger: 'راكب',
      driver: 'سائق',
      admin: 'مدير'
    };
    return roleMap[role] || role;
  };

  const getRoleColor = (role) => {
    const colorMap = {
      passenger: 'bg-blue-100 text-blue-800',
      driver: 'bg-green-100 text-green-800',
      admin: 'bg-purple-100 text-purple-800'
    };
    return colorMap[role] || 'bg-gray-100 text-gray-800';
  };

  const filteredUsers = users.filter(user => {
    if (filter === 'all') return true;
    return user.role === filter;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'الكل', count: users.length },
            { key: 'passenger', label: 'الركاب', count: users.filter(u => u.role === 'passenger').length },
            { key: 'driver', label: 'السائقين', count: users.filter(u => u.role === 'driver').length },
            { key: 'admin', label: 'المدراء', count: users.filter(u => u.role === 'admin').length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === tab.key
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-bold">👥 قائمة المستخدمين ({filteredUsers.length})</h3>
        </div>
        
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            لا يوجد مستخدمين
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المستخدم</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رصيد المحفظة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold">{user.name}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                        <div className="text-sm text-gray-600">{user.phone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getRoleColor(user.role)}`}>
                        {getRoleText(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold">
                        {user.wallet_balance.toLocaleString()} د.ع
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString('ar-IQ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Drivers Management
const DriversManagement = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await axios.get('/admin/drivers');
      setDrivers(response.data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-500 text-white rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">🚗</div>
            <div>
              <div className="text-xl font-bold">{drivers.length}</div>
              <div className="text-green-100">إجمالي السائقين</div>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-500 text-white rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">✅</div>
            <div>
              <div className="text-xl font-bold">
                {drivers.filter(d => d.is_verified).length}
              </div>
              <div className="text-blue-100">سائقين موثقين</div>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-500 text-white rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">⚡</div>
            <div>
              <div className="text-xl font-bold">
                {drivers.filter(d => d.is_available).length}
              </div>
              <div className="text-orange-100">سائقين متاحين</div>
            </div>
          </div>
        </div>
      </div>

      {/* Drivers List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-bold">🚗 قائمة السائقين ({drivers.length})</h3>
        </div>
        
        {drivers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            لا يوجد سائقين مسجلين
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">السائق</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المركبة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التقييم</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الرحلات</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التوثيق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold">سائق #{driver.user_id.slice(-6)}</div>
                        <div className="text-sm text-gray-600">رخصة: {driver.license_number}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold">{driver.vehicle_type}</div>
                        <div className="text-sm text-gray-600">{driver.vehicle_model}</div>
                        <div className="text-sm text-gray-600">لوحة: {driver.vehicle_plate}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-yellow-500 mr-1">⭐</span>
                        <span className="font-semibold">{driver.rating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold">{driver.total_trips}</div>
                      <div className="text-sm text-gray-600">رحلة</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        driver.is_available 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {driver.is_available ? 'متاح' : 'غير متاح'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        driver.is_verified 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {driver.is_verified ? 'موثق' : 'بانتظار التوثيق'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Trips Management
const TripsManagement = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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

  const getStatusColor = (status) => {
    const colorMap = {
      requested: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getTripTypeText = (type) => {
    const typeMap = {
      instant: 'مشوار فوري',
      hourly: 'حجز بالساعة',
      task: 'مهمة'
    };
    return typeMap[type] || type;
  };

  const filteredTrips = trips.filter(trip => {
    if (filter === 'all') return true;
    return trip.status === filter;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'الكل' },
            { key: 'requested', label: 'مطلوبة' },
            { key: 'accepted', label: 'مقبولة' },
            { key: 'in_progress', label: 'قيد التنفيذ' },
            { key: 'completed', label: 'مكتملة' },
            { key: 'cancelled', label: 'ملغية' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === tab.key
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label} ({tab.key === 'all' ? trips.length : trips.filter(t => t.status === tab.key).length})
            </button>
          ))}
        </div>
      </div>

      {/* Trips List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-bold">🎯 قائمة الرحلات ({filteredTrips.length})</h3>
        </div>
        
        {filteredTrips.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            لا توجد رحلات
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {filteredTrips.map((trip) => (
              <div key={trip.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(trip.status)} mr-2`}>
                      {getStatusText(trip.status)}
                    </span>
                    <span className="text-sm text-gray-600">{getTripTypeText(trip.trip_type)}</span>
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
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <strong>القضاء:</strong> {trip.district}
                  </div>
                  <div>
                    <strong>راكب:</strong> #{trip.passenger_id.slice(-6)}
                  </div>
                  {trip.driver_id && (
                    <div>
                      <strong>سائق:</strong> #{trip.driver_id.slice(-6)}
                    </div>
                  )}
                </div>
                
                <div className="mt-2 text-sm text-gray-600">
                  <div><strong>من:</strong> {trip.pickup_location.address}</div>
                  {trip.destination && (
                    <div><strong>إلى:</strong> {trip.destination.address}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Pricing Configuration
const PricingConfig = () => {
  const [districts, setDistricts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDistricts();
  }, []);

  const fetchDistricts = async () => {
    try {
      const response = await axios.get('/districts');
      setDistricts(response.data.pricing);
    } catch (error) {
      console.error('Error fetching districts:', error);
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
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-bold mb-4">💰 تكوين الأسعار</h3>
        <p className="text-gray-600 mb-6">إعدادات الأسعار لجميع الأقضية</p>
        
        <div className="space-y-6">
          {Object.entries(districts).map(([district, pricing]) => (
            <div key={district} className="border rounded-lg p-4">
              <h4 className="font-bold text-lg mb-4">📍 {district}</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Instant Trip Pricing */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h5 className="font-bold mb-2">🚗 مشوار فوري</h5>
                  <div className="space-y-2 text-sm">
                    <div>سعر الأساس: <strong>{pricing.instant.base} د.ع</strong></div>
                    <div>سعر الكيلومتر: <strong>{pricing.instant.per_km} د.ع</strong></div>
                    <div>سعر الدقيقة: <strong>{pricing.instant.per_minute} د.ع</strong></div>
                  </div>
                </div>

                {/* Hourly Trip Pricing */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h5 className="font-bold mb-2">⏰ حجز بالساعة</h5>
                  <div className="space-y-2 text-sm">
                    <div>سعر الساعة: <strong>{pricing.hourly.base} د.ع</strong></div>
                    <div>كيلومترات مشمولة: <strong>{pricing.hourly.included_km} كم</strong></div>
                    <div>سعر الكيلومتر الإضافي: <strong>{pricing.hourly.extra_km} د.ع</strong></div>
                  </div>
                </div>

                {/* Task Trip Pricing */}
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h5 className="font-bold mb-2">📦 مهمة</h5>
                  <div className="space-y-2 text-sm">
                    <div>سعر ثابت: <strong>{pricing.task.base} د.ع</strong></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <div className="font-bold">ملاحظة</div>
              <div className="text-sm text-gray-600">
                تعديل الأسعار يتطلب إعادة تشغيل النظام. يُنصح بالتنسيق مع الفريق التقني.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export {
  AdminStats,
  UsersManagement,
  DriversManagement,
  TripsManagement,
  PricingConfig
};