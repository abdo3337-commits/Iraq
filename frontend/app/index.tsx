import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Types
interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  user_type: 'passenger' | 'driver';
  profile_image?: string;
  rating?: number;
  total_rides: number;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (phone: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

interface RegisterData {
  name: string;
  phone: string;
  email?: string;
  password: string;
  user_type: 'passenger' | 'driver';
}

// Auth Context
const AuthContext = createContext<AuthContextType | null>(null);

// API Base URL
const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://rideshare-iraq.preview.emergentagent.com';

// API Functions
const apiCall = async (endpoint: string, options: any = {}) => {
  const token = await AsyncStorage.getItem('auth_token');
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}/api${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(error.detail || 'Something went wrong');
  }
  
  return response.json();
};

// Auth Provider
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('user_data');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone: string, password: string) => {
    try {
      setLoading(true);
      const response = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      });

      await AsyncStorage.setItem('auth_token', response.access_token);
      await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
      
      setToken(response.access_token);
      setUser(response.user);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setLoading(true);
      const response = await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      await AsyncStorage.setItem('auth_token', response.access_token);
      await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
      
      setToken(response.access_token);
      setUser(response.user);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Welcome Screen Component
const WelcomeScreen: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
  return (
    <View style={styles.welcomeContainer}>
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>🚌</Text>
        </View>
        <Text style={styles.appTitle}>الباص البرتقالي</Text>
        <Text style={styles.appSubtitle}>Orange Bus</Text>
      </View>
      
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeTitle}>مرحباً بك في الباص البرتقالي</Text>
        <Text style={styles.welcomeDescription}>
          تطبيق النقل الذكي المخصص لمحافظة الأنبار{'\n'}
          رحلات آمنة ومريحة بين يديك
        </Text>
        
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📍</Text>
            <Text style={styles.featureText}>تتبع مباشر للرحلة</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>💬</Text>
            <Text style={styles.featureText}>محادثة مع السائق</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>⭐</Text>
            <Text style={styles.featureText}>نظام تقييم وأمان</Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity style={styles.getStartedBtn} onPress={onGetStarted}>
        <Text style={styles.getStartedText}>ابدأ الآن</Text>
      </TouchableOpacity>
    </View>
  );
};

// Login Screen Component
const LoginScreen: React.FC<{ onSwitchToRegister: () => void }> = ({ onSwitchToRegister }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول');
      return;
    }

    try {
      setLoading(true);
      await login(phone, password);
    } catch (error: any) {
      Alert.alert('خطأ في تسجيل الدخول', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.authContainer}>
          <Text style={styles.authTitle}>تسجيل الدخول</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>رقم الهاتف</Text>
            <TextInput
              style={styles.textInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="07xxxxxxxxx"
              keyboardType="phone-pad"
              textAlign="right"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>كلمة المرور</Text>
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              placeholder="كلمة المرور"
              secureTextEntry
              textAlign="right"
            />
          </View>

          <TouchableOpacity 
            style={[styles.authButton, loading && styles.authButtonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.authButtonText}>تسجيل الدخول</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onSwitchToRegister}>
            <Text style={styles.switchText}>
              ليس لديك حساب؟ <Text style={styles.switchLink}>سجل الآن</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Register Screen Component
const RegisterScreen: React.FC<{ onSwitchToLogin: () => void }> = ({ onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'passenger' | 'driver'>('passenger');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!name.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('خطأ', 'يرجى ملء الحقول المطلوبة');
      return;
    }

    try {
      setLoading(true);
      await register({
        name,
        phone,
        email: email.trim() || undefined,
        password,
        user_type: userType,
      });
    } catch (error: any) {
      Alert.alert('خطأ في التسجيل', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.authContainer}>
          <Text style={styles.authTitle}>إنشاء حساب جديد</Text>
          
          {/* User Type Selection */}
          <View style={styles.userTypeContainer}>
            <Text style={styles.inputLabel}>نوع الحساب</Text>
            <View style={styles.userTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'passenger' && styles.userTypeButtonActive,
                ]}
                onPress={() => setUserType('passenger')}
              >
                <Text style={[
                  styles.userTypeButtonText,
                  userType === 'passenger' && styles.userTypeButtonTextActive,
                ]}>
                  راكب
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'driver' && styles.userTypeButtonActive,
                ]}
                onPress={() => setUserType('driver')}
              >
                <Text style={[
                  styles.userTypeButtonText,
                  userType === 'driver' && styles.userTypeButtonTextActive,
                ]}>
                  سائق
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>الاسم الكامل *</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="أدخل اسمك الكامل"
              textAlign="right"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>رقم الهاتف *</Text>
            <TextInput
              style={styles.textInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="07xxxxxxxxx"
              keyboardType="phone-pad"
              textAlign="right"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>البريد الإلكتروني</Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              textAlign="right"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>كلمة المرور *</Text>
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              placeholder="كلمة المرور"
              secureTextEntry
              textAlign="right"
            />
          </View>

          <TouchableOpacity 
            style={[styles.authButton, loading && styles.authButtonDisabled]} 
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.authButtonText}>إنشاء الحساب</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onSwitchToLogin}>
            <Text style={styles.switchText}>
              لديك حساب بالفعل؟ <Text style={styles.switchLink}>سجل دخولك</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Dashboard Component
const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد من تسجيل الخروج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تسجيل الخروج', onPress: logout },
      ]
    );
  };

  return (
    <View style={styles.dashboardContainer}>
      <View style={styles.dashboardHeader}>
        <Text style={styles.welcomeMessage}>
          مرحباً، {user?.name}
        </Text>
        <Text style={styles.userType}>
          {user?.user_type === 'passenger' ? 'راكب' : 'سائق'}
        </Text>
        {user?.rating && (
          <Text style={styles.userRating}>
            التقييم: {user.rating} ⭐
          </Text>
        )}
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>إحصائياتك</Text>
        <Text style={styles.statsText}>
          إجمالي الرحلات: {user?.total_rides}
        </Text>
      </View>

      <View style={styles.dashboardActions}>
        {user?.user_type === 'passenger' ? (
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>طلب رحلة</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>بدء العمل</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                عرض الرحلات المتاحة
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>تسجيل الخروج</Text>
      </TouchableOpacity>
    </View>
  );
};

// Main App Component
const App: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  return (
    <AuthProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <AppContent 
          showWelcome={showWelcome}
          setShowWelcome={setShowWelcome}
          authMode={authMode}
          setAuthMode={setAuthMode}
        />
      </SafeAreaView>
    </AuthProvider>
  );
};

// App Content Component
const AppContent: React.FC<{
  showWelcome: boolean;
  setShowWelcome: (show: boolean) => void;
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
}> = ({ showWelcome, setShowWelcome, authMode, setAuthMode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>جارٍ التحميل...</Text>
      </View>
    );
  }

  if (user) {
    return <Dashboard />;
  }

  if (showWelcome) {
    return <WelcomeScreen onGetStarted={() => setShowWelcome(false)} />;
  }

  if (authMode === 'login') {
    return <LoginScreen onSwitchToRegister={() => setAuthMode('register')} />;
  }

  return <RegisterScreen onSwitchToLogin={() => setAuthMode('login')} />;
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    fontFamily: 'System',
  },
  // Welcome Screen Styles
  welcomeContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 48,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 18,
    color: '#666666',
    textAlign: 'center',
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featuresList: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  featureIcon: {
    fontSize: 24,
    marginLeft: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'right',
  },
  getStartedBtn: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Auth Screens Styles
  authContainer: {
    padding: 24,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'right',
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#F8F8F8',
  },
  userTypeContainer: {
    marginBottom: 24,
  },
  userTypeButtons: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  userTypeButtonActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F2',
  },
  userTypeButtonText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  userTypeButtonTextActive: {
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  authButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666666',
  },
  switchLink: {
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  // Dashboard Styles
  dashboardContainer: {
    flex: 1,
    padding: 24,
  },
  dashboardHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeMessage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  userType: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '500',
  },
  userRating: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  statsCard: {
    backgroundColor: '#F8F8F8',
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  statsText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  dashboardActions: {
    gap: 16,
    marginBottom: 32,
  },
  actionButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  secondaryButtonText: {
    color: '#FF6B35',
  },
  logoutButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default App;