import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import MapView from '../components/MapView';
import LocationSearchModal from '../components/LocationSearchModal';

const { width, height } = Dimensions.get('window');

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

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
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

// Welcome Screen Component (Careem/Uber Style)
const WelcomeScreen: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
  return (
    <View style={styles.welcomeContainer}>
      <View style={styles.welcomeHeader}>
        <View style={styles.logoContainer}>
          <Ionicons name="car" size={60} color="#00C853" />
        </View>
        <Text style={styles.appTitle}>مرحباً بك</Text>
        <Text style={styles.appSubtitle}>نقل آمن ومريح في الأنبار</Text>
      </View>
      
      <View style={styles.welcomeContent}>
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <MaterialIcons name="location-on" size={24} color="#00C853" />
            <Text style={styles.featureText}>تتبع مباشر للرحلة</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="chat" size={24} color="#00C853" />
            <Text style={styles.featureText}>تواصل مع السائق</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="star" size={24} color="#00C853" />
            <Text style={styles.featureText}>تقييمات موثقة</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="security" size={24} color="#00C853" />
            <Text style={styles.featureText}>رحلات آمنة</Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity style={styles.getStartedBtn} onPress={onGetStarted}>
        <Text style={styles.getStartedText}>ابدأ الآن</Text>
      </TouchableOpacity>
    </View>
  );
};

// Login Screen Component (Careem/Uber Style)
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
    <KeyboardAvoidingView style={styles.authContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.authContent} showsVerticalScrollIndicator={false}>
        <View style={styles.authHeader}>
          <Ionicons name="car" size={50} color="#00C853" />
          <Text style={styles.authTitle}>تسجيل الدخول</Text>
        </View>
        
        <View style={styles.authForm}>
          <View style={styles.inputContainer}>
            <Ionicons name="phone-portrait" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="رقم الهاتف"
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              placeholder="كلمة المرور"
              secureTextEntry
              placeholderTextColor="#999"
            />
          </View>

          <TouchableOpacity 
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>تسجيل الدخول</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onSwitchToRegister}>
            <Text style={styles.secondaryButtonText}>
              ليس لديك حساب؟ <Text style={styles.linkText}>سجل الآن</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Register Screen Component (Careem/Uber Style)
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
    <KeyboardAvoidingView style={styles.authContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.authContent} showsVerticalScrollIndicator={false}>
        <View style={styles.authHeader}>
          <Ionicons name="car" size={50} color="#00C853" />
          <Text style={styles.authTitle}>إنشاء حساب</Text>
        </View>
        
        <View style={styles.authForm}>
          {/* User Type Selection */}
          <View style={styles.userTypeContainer}>
            <Text style={styles.sectionTitle}>اختر نوع الحساب</Text>
            <View style={styles.userTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'passenger' && styles.userTypeButtonActive,
                ]}
                onPress={() => setUserType('passenger')}
              >
                <Ionicons 
                  name="person" 
                  size={24} 
                  color={userType === 'passenger' ? '#00C853' : '#666'} 
                />
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
                <Ionicons 
                  name="car-sport" 
                  size={24} 
                  color={userType === 'driver' ? '#00C853' : '#666'} 
                />
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
            <Ionicons name="person" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="الاسم الكامل *"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="phone-portrait" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="رقم الهاتف *"
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="البريد الإلكتروني (اختياري)"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              placeholder="كلمة المرور *"
              secureTextEntry
              placeholderTextColor="#999"
            />
          </View>

          <TouchableOpacity 
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} 
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>إنشاء الحساب</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onSwitchToLogin}>
            <Text style={styles.secondaryButtonText}>
              لديك حساب بالفعل؟ <Text style={styles.linkText}>سجل دخولك</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Passenger Dashboard with Interactive Map
const PassengerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [pickupLocation, setPickupLocation] = useState<LocationData | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<LocationData | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'pickup' | 'destination'>('pickup');
  const [rideRequested, setRideRequested] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const newLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: 'موقعك الحالي'
        };

        setCurrentLocation(newLocation);
        setPickupLocation(newLocation);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  const handleLocationSelect = (location: LocationData) => {
    if (modalType === 'pickup') {
      setPickupLocation(location);
    } else {
      setDestinationLocation(location);
    }
  };

  const handleRequestRide = async () => {
    if (!pickupLocation || !destinationLocation) {
      Alert.alert('تنبيه', 'يرجى تحديد نقطة الانطلاق والوجهة');
      return;
    }

    try {
      const response = await apiCall('/rides/request', {
        method: 'POST',
        body: JSON.stringify({
          pickup_location: pickupLocation,
          destination_location: destinationLocation,
        }),
      });

      setRideRequested(true);
      Alert.alert('تم بنجاح', 'تم طلب الرحلة بنجاح! سيتم إشعارك عند قبول السائق للرحلة');
    } catch (error: any) {
      Alert.alert('خطأ', error.message);
    }
  };

  const mapMarkers = [
    ...(pickupLocation ? [{
      id: 'pickup',
      latitude: pickupLocation.latitude,
      longitude: pickupLocation.longitude,
      title: 'نقطة الانطلاق',
      description: pickupLocation.address,
      color: '#2196F3',
    }] : []),
    ...(destinationLocation ? [{
      id: 'destination',
      latitude: destinationLocation.latitude,
      longitude: destinationLocation.longitude,
      title: 'الوجهة',
      description: destinationLocation.address,
      color: '#FF4444',
    }] : []),
  ];

  return (
    <View style={styles.dashboardContainer}>
      {/* Header */}
      <View style={styles.dashboardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>مرحباً</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <Ionicons name="person-circle" size={40} color="#00C853" />
        </TouchableOpacity>
      </View>

      {/* Interactive Map */}
      <View style={styles.mapContainer}>
        <MapView
          currentLocation={currentLocation}
          markers={mapMarkers}
          showUserLocation={true}
          height={height * 0.5}
        />
      </View>

      {/* Ride Options */}
      <View style={styles.rideOptionsContainer}>
        <Text style={styles.sectionTitle}>إلى أين تريد الذهاب؟</Text>
        
        {/* Pickup Location */}
        <TouchableOpacity 
          style={styles.locationInput}
          onPress={() => {
            setModalType('pickup');
            setLocationModalVisible(true);
          }}
        >
          <Ionicons name="radio-button-on" size={20} color="#2196F3" />
          <Text style={[styles.locationInputText, pickupLocation && styles.locationInputTextSelected]}>
            {pickupLocation ? pickupLocation.address : 'نقطة الانطلاق'}
          </Text>
        </TouchableOpacity>

        {/* Destination Location */}
        <TouchableOpacity 
          style={styles.locationInput}
          onPress={() => {
            setModalType('destination');
            setLocationModalVisible(true);
          }}
        >
          <Ionicons name="location" size={20} color="#FF4444" />
          <Text style={[styles.locationInputText, destinationLocation && styles.locationInputTextSelected]}>
            {destinationLocation ? destinationLocation.address : 'اختر الوجهة'}
          </Text>
        </TouchableOpacity>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="home" size={24} color="#00C853" />
            <Text style={styles.quickActionText}>المنزل</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="business" size={24} color="#00C853" />
            <Text style={styles.quickActionText}>العمل</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="time" size={24} color="#00C853" />
            <Text style={styles.quickActionText}>آخر رحلة</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.primaryButton, rideRequested && styles.primaryButtonDisabled]}
          onPress={handleRequestRide}
          disabled={rideRequested}
        >
          <Text style={styles.primaryButtonText}>
            {rideRequested ? 'تم طلب الرحلة' : 'طلب رحلة'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Location Selection Modal */}
      <LocationSearchModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onLocationSelect={handleLocationSelect}
        title={modalType === 'pickup' ? 'اختر نقطة الانطلاق' : 'اختر الوجهة'}
        currentLocation={currentLocation}
      />
    </View>
  );
};

// Driver Dashboard with Interactive Map
const DriverDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [availableRides, setAvailableRides] = useState([]);

  useEffect(() => {
    getCurrentLocation();
    if (isOnline) {
      fetchAvailableRides();
      const interval = setInterval(fetchAvailableRides, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: 'موقعك الحالي'
        });
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  const fetchAvailableRides = async () => {
    try {
      const response = await apiCall('/rides/available');
      setAvailableRides(response);
    } catch (error) {
      console.error('Error fetching available rides:', error);
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      await apiCall('/drivers/availability', {
        method: 'PUT',
        body: JSON.stringify({ is_available: !isOnline }),
      });
      setIsOnline(!isOnline);
    } catch (error: any) {
      Alert.alert('خطأ', error.message);
    }
  };

  const rideMarkers = availableRides.map((ride: any) => ({
    id: ride.id,
    latitude: ride.pickup_location.latitude,
    longitude: ride.pickup_location.longitude,
    title: 'طلب رحلة',
    description: `إلى: ${ride.destination_location.address}`,
    color: '#FF6B35',
  }));

  return (
    <View style={styles.dashboardContainer}>
      {/* Header */}
      <View style={styles.dashboardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>مرحباً كابتن</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <Ionicons name="person-circle" size={40} color="#00C853" />
        </TouchableOpacity>
      </View>

      {/* Interactive Map for Driver */}
      <View style={styles.mapContainer}>
        <MapView
          currentLocation={currentLocation}
          markers={rideMarkers}
          showUserLocation={true}
          height={height * 0.4}
        />
      </View>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>حالة العمل</Text>
          <TouchableOpacity 
            style={[styles.statusToggle, isOnline && styles.statusToggleActive]}
            onPress={toggleOnlineStatus}
          >
            <Text style={[styles.statusToggleText, isOnline && styles.statusToggleTextActive]}>
              {isOnline ? 'متصل' : 'غير متصل'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.statusDescription}>
          {isOnline ? `الرحلات المتاحة: ${availableRides.length}` : 'اضغط للاتصال واستقبال الرحلات'}
        </Text>
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{user?.total_rides || 0}</Text>
          <Text style={styles.statLabel}>إجمالي الرحلات</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{user?.rating || 'جديد'}</Text>
          <Text style={styles.statLabel}>التقييم</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{availableRides.length}</Text>
          <Text style={styles.statLabel}>رحلات متاحة</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.driverActions}>
        <TouchableOpacity style={styles.actionCard}>
          <Ionicons name="list" size={24} color="#00C853" />
          <Text style={styles.actionCardText}>رحلاتي</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard}>
          <Ionicons name="cash" size={24} color="#00C853" />
          <Text style={styles.actionCardText}>الأرباح</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard}>
          <Ionicons name="car" size={24} color="#00C853" />
          <Text style={styles.actionCardText}>معلومات السيارة</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Main Dashboard Component
const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (user?.user_type === 'passenger') {
    return <PassengerDashboard />;
  } else {
    return <DriverDashboard />;
  }
};

// Main App Component
const App: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  return (
    <AuthProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />
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
        <ActivityIndicator size="large" color="#00C853" />
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

// Styles (Enhanced for Maps)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  
  // Welcome Screen Styles
  welcomeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  welcomeHeader: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F9F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
  },
  featuresList: {
    paddingVertical: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#1A1A1A',
    marginLeft: 16,
    flex: 1,
  },
  getStartedBtn: {
    backgroundColor: '#00C853',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Auth Screens Styles
  authContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  authContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  authHeader: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 16,
  },
  authForm: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
    color: '#1A1A1A',
  },
  userTypeContainer: {
    marginBottom: 24,
  },
  userTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  userTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    backgroundColor: '#F8F8F8',
  },
  userTypeButtonActive: {
    borderColor: '#00C853',
    backgroundColor: '#F0F9F0',
  },
  userTypeButtonText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
    marginLeft: 8,
  },
  userTypeButtonTextActive: {
    color: '#00C853',
    fontWeight: 'bold',
  },
  primaryButton: {
    backgroundColor: '#00C853',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#666666',
  },
  linkText: {
    color: '#00C853',
    fontWeight: 'bold',
  },

  // Dashboard Styles
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#666666',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 2,
  },
  profileButton: {
    padding: 8,
  },

  // Map Container
  mapContainer: {
    backgroundColor: '#E8E8E8',
  },

  // Ride Options
  rideOptionsContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  locationInputText: {
    flex: 1,
    fontSize: 16,
    color: '#666666',
    marginLeft: 12,
  },
  locationInputTextSelected: {
    color: '#1A1A1A',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 12,
  },
  quickActionText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },

  // Driver Specific Styles
  statusCard: {
    backgroundColor: '#FFFFFF',
    margin: 24,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  statusToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E8E8E8',
  },
  statusToggleActive: {
    backgroundColor: '#00C853',
  },
  statusToggleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666666',
  },
  statusToggleTextActive: {
    color: '#FFFFFF',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00C853',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  driverActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionCardText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default App;