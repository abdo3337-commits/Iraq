import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Import Dashboard Components
import PassengerDashboard from './pages/PassengerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';

// Create and Export AuthContext
export const AuthContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Configure axios defaults
axios.defaults.baseURL = API;

// Authentication Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('/auth/login', { email, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/auth/register', userData);
      return { success: true, user: response.data };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Landing Page Component
const LandingPage = () => {
  return (
    <div className="min-h-screen bg-brand-gradient relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-20 left-1/2 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-6xl mx-auto text-center text-white">
          {/* Hero Section */}
          <div className="mb-16 animate-fade-in">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white bg-opacity-20 rounded-3xl mb-6 backdrop-blur-sm animate-pulse-orange">
                <span className="text-5xl">🚍</span>
              </div>
              <h1 className="text-7xl lg:text-8xl font-bold mb-4 bg-clip-text">
                الباص البرتقالي
              </h1>
              <div className="w-32 h-1 bg-white bg-opacity-50 mx-auto mb-6 rounded-full"></div>
              <h2 className="text-2xl lg:text-3xl font-light mb-4 text-gray-100">
                منصة النقل الذكية في الأنبار
              </h2>
              <p className="text-lg lg:text-xl text-gray-200 max-w-2xl mx-auto leading-relaxed">
                احجز رحلتك بكل سهولة ووصل لوجهتك بأمان وسرعة
              </p>
            </div>
          </div>
          
          {/* Services Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16 animate-slide-in">
            <div className="hero-card group">
              <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">🚗</div>
              <h3 className="text-2xl font-bold mb-4 text-white">مشاوير فورية</h3>
              <p className="text-gray-200 leading-relaxed">
                احجز سيارة فوراً واستمتع بخدمة سريعة وموثوقة
              </p>
              <div className="mt-4 text-sm text-gray-300">
                متاح على مدار الساعة
              </div>
            </div>
            
            <div className="hero-card group">
              <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">⏰</div>
              <h3 className="text-2xl font-bold mb-4 text-white">حجز بالساعة</h3>
              <p className="text-gray-200 leading-relaxed">
                احجز سائق لساعات محددة لإنجاز مهامك بكل راحة
              </p>
              <div className="mt-4 text-sm text-gray-300">
                مرونة في الوقت والمسار
              </div>
            </div>
            
            <div className="hero-card group">
              <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">📦</div>
              <h3 className="text-2xl font-bold mb-4 text-white">مهام سريعة</h3>
              <p className="text-gray-200 leading-relaxed">
                توصيل الطرود والمهام الخاصة بأسعار ثابتة ومناسبة
              </p>
              <div className="mt-4 text-sm text-gray-300">
                أسعار ثابتة وشفافة
              </div>
            </div>
          </div>
          
          {/* CTA Section */}
          <div className="space-y-8 animate-fade-in">
            {/* Primary Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a 
                href="/login?role=passenger" 
                className="group bg-white text-primary-500 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all duration-300 btn-float shadow-lg hover:shadow-xl min-w-[200px]"
              >
                <span className="mr-3">🚍</span>
                دخول كراكب
                <div className="text-sm font-normal text-gray-500 mt-1">احجز رحلتك الآن</div>
              </a>
              
              <a 
                href="/login?role=driver" 
                className="group bg-secondary-600 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-secondary-700 transition-all duration-300 btn-float shadow-lg hover:shadow-xl min-w-[200px]"
              >
                <span className="mr-3">🚗</span>
                دخول كسائق
                <div className="text-sm font-normal text-secondary-200 mt-1">ابدأ الكسب معنا</div>
              </a>
            </div>

            {/* Admin Access */}
            <div className="flex justify-center">
              <a 
                href="/login?role=admin" 
                className="bg-gray-800 bg-opacity-50 text-white px-6 py-3 rounded-xl font-semibold text-base hover:bg-opacity-70 transition-all duration-300 backdrop-blur-sm border border-white border-opacity-20"
              >
                <span className="mr-2">👨‍💼</span>
                لوحة الإدارة
              </a>
            </div>

            {/* Register Link */}
            <div className="text-center">
              <p className="text-gray-200 mb-4">
                لا تملك حساب؟
              </p>
              <a 
                href="/register" 
                className="inline-flex items-center text-white hover:text-gray-200 transition-colors duration-200 font-semibold border-b-2 border-white border-opacity-30 hover:border-opacity-60 pb-1"
              >
                إنشاء حساب جديد
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>

          {/* Features Footer */}
          <div className="mt-20 pt-12 border-t border-white border-opacity-20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="space-y-2">
                <div className="text-3xl">🛡️</div>
                <div className="text-sm font-semibold text-gray-200">أمان وحماية</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl">💰</div>
                <div className="text-sm font-semibold text-gray-200">أسعار عادلة</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl">📱</div>
                <div className="text-sm font-semibold text-gray-200">سهولة الاستخدام</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl">⚡</div>
                <div className="text-sm font-semibold text-gray-200">خدمة سريعة</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Login Component
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, user } = useAuth();
  
  const urlParams = new URLSearchParams(window.location.search);
  const role = urlParams.get('role') || 'passenger';

  useEffect(() => {
    if (user) {
      if (user.role === 'passenger') window.location.href = '/passenger';
      else if (user.role === 'driver') window.location.href = '/driver';
      else if (user.role === 'admin') window.location.href = '/admin';
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, password);
    
    if (result.success) {
      // Redirect will happen via useEffect
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const getRoleTitle = () => {
    switch(role) {
      case 'driver': return 'دخول السائقين';
      case 'admin': return 'دخول الإدارة';
      default: return 'دخول الركاب';
    }
  };

  const getRoleIcon = () => {
    switch(role) {
      case 'driver': return '🚗';
      case 'admin': return '👨‍💼';
      default: return '🚍';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{getRoleIcon()}</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{getRoleTitle()}</h2>
          <p className="text-gray-600">الباص البرتقالي</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 focus:outline-none focus:bg-orange-700 disabled:opacity-50"
          >
            {loading ? 'جاري تسجيل الدخول...' : 'دخول'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-orange-600 hover:underline">العودة للصفحة الرئيسية</a>
        </div>
      </div>
    </div>
  );
};

// Register Component
const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'passenger'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      setLoading(false);
      return;
    }

    const result = await register({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      role: formData.role
    });
    
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">تم إنشاء الحساب بنجاح!</h2>
          <p className="text-gray-600 mb-6">يمكنك الآن تسجيل الدخول باستخدام بياناتك</p>
          <a href="/login" className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700">
            تسجيل الدخول
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">إنشاء حساب جديد</h2>
          <p className="text-gray-600">الباص البرتقالي</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">نوع الحساب</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
            >
              <option value="passenger">راكب</option>
              <option value="driver">سائق</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">الاسم الكامل</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">رقم الهاتف</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">كلمة المرور</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">تأكيد كلمة المرور</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 focus:outline-none focus:bg-orange-700 disabled:opacity-50"
          >
            {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/login" className="text-orange-600 hover:underline">لديك حساب بالفعل؟ دخول</a>
        </div>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">جاري التحميل...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">غير مصرح لك بالدخول</h2>
          <a href="/" className="text-orange-600 hover:underline">العودة للصفحة الرئيسية</a>
        </div>
      </div>
    );
  }

  return children;
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route 
              path="/passenger" 
              element={
                <ProtectedRoute requiredRole="passenger">
                  <PassengerDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/driver" 
              element={
                <ProtectedRoute requiredRole="driver">
                  <DriverDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;