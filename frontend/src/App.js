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

  const getRoleColor = () => {
    switch(role) {
      case 'driver': return 'bg-secondary-600';
      case 'admin': return 'bg-gray-800';
      default: return 'bg-primary-500';
    }
  };

  return (
    <div className="min-h-screen bg-brand-gradient relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 right-20 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Back to Home */}
          <div className="text-center mb-8">
            <a href="/" className="inline-flex items-center text-white hover:text-gray-200 transition-colors duration-200 text-sm">
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              العودة للصفحة الرئيسية
            </a>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 backdrop-blur-sm animate-fade-in">
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-20 h-20 ${getRoleColor()} rounded-3xl mb-6 text-4xl text-white shadow-lg`}>
                {getRoleIcon()}
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">{getRoleTitle()}</h2>
              <div className="flex items-center justify-center space-x-2 mb-4">
                <span className="text-2xl">🚍</span>
                <span className="text-lg font-semibold text-primary-500">الباص البرتقالي</span>
              </div>
              <p className="text-gray-600">أدخل بياناتك للدخول إلى حسابك</p>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6 animate-slide-in">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="form-label">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="example@orangebus.com"
                  required
                />
              </div>

              <div>
                <label className="form-label">كلمة المرور</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full ${getRoleColor()} text-white py-4 px-6 rounded-2xl font-bold text-lg hover:opacity-90 focus:outline-none transition-all duration-200 btn-float disabled:opacity-50 shadow-lg`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="loading-spinner mr-3"></div>
                    جاري تسجيل الدخول...
                  </div>
                ) : (
                  'دخول'
                )}
              </button>
            </form>

            {/* Quick Login for Demo */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-center text-sm text-gray-600 mb-4">حسابات تجريبية للاختبار:</p>
              <div className="space-y-2 text-xs text-gray-500">
                {role === 'admin' && (
                  <div className="text-center">admin@orangebus.com / admin123</div>
                )}
                {role === 'passenger' && (
                  <div className="text-center">passenger@test.com / test123</div>
                )}
                {role === 'driver' && (
                  <div className="text-center">driver@test.com / test123</div>
                )}
              </div>
            </div>
          </div>

          {/* Register Link */}
          <div className="mt-8 text-center">
            <p className="text-white mb-4">لا تملك حساب؟</p>
            <a 
              href="/register" 
              className="inline-flex items-center bg-white bg-opacity-20 text-white hover:bg-opacity-30 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 backdrop-blur-sm border border-white border-opacity-30"
            >
              إنشاء حساب جديد
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </a>
          </div>
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
      <div className="min-h-screen bg-brand-gradient relative overflow-hidden flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center animate-fade-in">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-3xl mb-6 text-4xl text-white shadow-lg animate-pulse">
              ✅
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">تم إنشاء الحساب بنجاح!</h2>
            <p className="text-gray-600 leading-relaxed">
              مرحباً بك في منصة الباص البرتقالي<br />
              يمكنك الآن تسجيل الدخول باستخدام بياناتك
            </p>
          </div>
          
          <div className="space-y-4">
            <a 
              href="/login" 
              className="btn-primary w-full inline-block"
            >
              تسجيل الدخول الآن
            </a>
            <a 
              href="/" 
              className="block text-gray-500 hover:text-primary-500 transition-colors duration-200"
            >
              العودة للصفحة الرئيسية
            </a>
          </div>
        </div>
      </div>
    );
  }

  const getRoleIcon = () => {
    switch(formData.role) {
      case 'driver': return '🚗';
      default: return '🚍';
    }
  };

  const getRoleColor = () => {
    switch(formData.role) {
      case 'driver': return 'bg-secondary-600';
      default: return 'bg-primary-500';
    }
  };

  return (
    <div className="min-h-screen bg-brand-gradient relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '3s'}}></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Back to Home */}
          <div className="text-center mb-8">
            <a href="/" className="inline-flex items-center text-white hover:text-gray-200 transition-colors duration-200 text-sm">
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              العودة للصفحة الرئيسية
            </a>
          </div>

          {/* Register Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 backdrop-blur-sm animate-fade-in">
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-20 h-20 ${getRoleColor()} rounded-3xl mb-6 text-4xl text-white shadow-lg`}>
                📝
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">إنشاء حساب جديد</h2>
              <div className="flex items-center justify-center space-x-2 mb-4">
                <span className="text-2xl">🚍</span>
                <span className="text-lg font-semibold text-primary-500">الباص البرتقالي</span>
              </div>
              <p className="text-gray-600">انضم إلى منصة النقل الذكية في الأنبار</p>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6 animate-slide-in">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="form-label">نوع الحساب</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`cursor-pointer flex items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${
                    formData.role === 'passenger' 
                      ? 'border-primary-500 bg-primary-50 text-primary-600' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="passenger"
                      checked={formData.role === 'passenger'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="text-2xl mr-3">🚍</span>
                    <div>
                      <div className="font-semibold">راكب</div>
                      <div className="text-xs text-gray-500">احجز رحلاتك</div>
                    </div>
                  </label>
                  
                  <label className={`cursor-pointer flex items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${
                    formData.role === 'driver' 
                      ? 'border-secondary-600 bg-secondary-50 text-secondary-600' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="driver"
                      checked={formData.role === 'driver'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="text-2xl mr-3">🚗</span>
                    <div>
                      <div className="font-semibold">سائق</div>
                      <div className="text-xs text-gray-500">ابدأ الكسب</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="form-label">الاسم الكامل</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="أدخل اسمك الكامل"
                  required
                />
              </div>

              <div>
                <label className="form-label">البريد الإلكتروني</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="example@gmail.com"
                  required
                />
              </div>

              <div>
                <label className="form-label">رقم الهاتف</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="07901234567"
                  required
                />
              </div>

              <div>
                <label className="form-label">كلمة المرور</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="form-label">تأكيد كلمة المرور</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full ${getRoleColor()} text-white py-4 px-6 rounded-2xl font-bold text-lg hover:opacity-90 focus:outline-none transition-all duration-200 btn-float disabled:opacity-50 shadow-lg`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="loading-spinner mr-3"></div>
                    جاري إنشاء الحساب...
                  </div>
                ) : (
                  'إنشاء حساب'
                )}
              </button>
            </form>
          </div>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-white mb-4">لديك حساب بالفعل؟</p>
            <a 
              href="/login" 
              className="inline-flex items-center bg-white bg-opacity-20 text-white hover:bg-opacity-30 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 backdrop-blur-sm border border-white border-opacity-30"
            >
              تسجيل الدخول
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </a>
          </div>
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