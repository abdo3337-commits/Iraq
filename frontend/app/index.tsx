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
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import MapView from '../components/MapView';
import LocationSearchModal from '../components/LocationSearchModal';
import ChatModal from '../components/ChatModal';
import DeliveryRequestModal from '../components/DeliveryRequestModal';
import PaymentSelectionModal from '../components/PaymentSelectionModal';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from '../components/styles';

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
  total_deliveries: number;
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
const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://aburide.preview.emergentagent.com';

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

// Welcome Screen Component (Updated with new branding)
const WelcomeScreen: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
  return (
    <View style={styles.welcomeContainer}>
      <View style={styles.welcomeHeader}>
        <View style={styles.logoContainer}>
          {/* Logo placeholder - we'll add the actual logo here */}
          <Text style={styles.logoText}>أبو الغربية</Text>
          <Text style={styles.logoSubtext}>Abu Al-Gharbiya</Text>
        </View>
        <Text style={styles.appTitle}>مرحباً بك</Text>
        <Text style={styles.appSubtitle}>نقل وتوصيل آمن ومريح في الأنبار</Text>
      </View>
      
      <View style={styles.welcomeContent}>
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <MaterialIcons name="directions-car" size={24} color="#00C853" />
            <Text style={styles.featureText}>خدمة النقل والمشاوير</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="local-shipping" size={24} color="#00C853" />
            <Text style={styles.featureText}>توصيل الطرود والمواد</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="location-on" size={24} color="#00C853" />
            <Text style={styles.featureText}>تتبع مباشر للرحلة</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="star" size={24} color="#00C853" />
            <Text style={styles.featureText}>تقييمات موثقة</Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity style={styles.getStartedBtn} onPress={onGetStarted}>
        <Text style={styles.getStartedText}>ابدأ الآن</Text>
      </TouchableOpacity>
    </View>
  );
};

// Service Selection Component
const ServiceSelection: React.FC<{ onServiceSelect: (service: 'ride' | 'delivery') => void }> = ({ onServiceSelect }) => {
  return (
    <View style={styles.serviceContainer}>
      <Text style={styles.serviceTitle}>كيف يمكننا مساعدتك؟</Text>
      
      <View style={styles.serviceOptions}>
        <TouchableOpacity 
          style={styles.serviceOption}
          onPress={() => onServiceSelect('ride')}
        >
          <View style={styles.serviceIconContainer}>
            <Ionicons name="car" size={40} color="#00C853" />
          </View>
          <Text style={styles.serviceOptionTitle}>طلب رحلة</Text>
          <Text style={styles.serviceOptionDesc}>انتقل من مكان إلى آخر بأمان</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.serviceOption}
          onPress={() => onServiceSelect('delivery')}
        >
          <View style={styles.serviceIconContainer}>
            <MaterialIcons name="local-shipping" size={40} color="#FF6B35" />
          </View>
          <Text style={styles.serviceOptionTitle}>طلب توصيل</Text>
          <Text style={styles.serviceOptionDesc}>توصيل طرودك ومشترياتك</Text>
        </TouchableOpacity>
      </View>
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
    <KeyboardAvoidingView style={styles.authContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.authContent} showsVerticalScrollIndicator={false}>
        <View style={styles.authHeader}>
          <Text style={styles.logoText}>أبو الغربية</Text>
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
    <KeyboardAvoidingView style={styles.authContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.authContent} showsVerticalScrollIndicator={false}>
        <View style={styles.authHeader}>
          <Text style={styles.logoText}>أبو الغربية</Text>
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
                  عميل
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

// Enhanced Dashboard with Service Selection
const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedService, setSelectedService] = useState<'ride' | 'delivery' | null>(null);

  if (!selectedService && user?.user_type === 'passenger') {
    return <ServiceSelection onServiceSelect={setSelectedService} />;
  }

  if (user?.user_type === 'passenger') {
    if (selectedService === 'ride') {
      return <PassengerDashboard onBack={() => setSelectedService(null)} />;
    } else {
      return <DeliveryDashboard onBack={() => setSelectedService(null)} />;
    }
  } else {
    return <DriverDashboard />;
  }
};

// Passenger Dashboard for Rides
const PassengerDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const [pickupLocation, setPickupLocation] = useState<LocationData | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<LocationData | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'pickup' | 'destination'>('pickup');
  const [rideRequested, setRideRequested] = useState(false);
  const [vehicleType, setVehicleType] = useState<'standard' | 'vip'>('standard');
  const [rideType, setRideType] = useState<'immediate' | 'scheduled' | 'open_ride'>('immediate');

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
    if (!pickupLocation || (!destinationLocation && rideType !== 'open_ride')) {
      Alert.alert('تنبيه', 'يرجى تحديد نقطة الانطلاق والوجهة');
      return;
    }

    try {
      const rideData: any = {
        pickup_location: pickupLocation,
        ride_type: rideType,
        vehicle_type: vehicleType,
      };

      if (rideType !== 'open_ride') {
        rideData.destination_location = destinationLocation;
      }

      if (rideType === 'open_ride') {
        rideData.max_duration_minutes = 480; // 8 hours max
      }

      const response = await apiCall('/rides/request', {
        method: 'POST',
        body: JSON.stringify(rideData),
      });

      setRideRequested(true);
      Alert.alert('تم بنجاح', 'تم طلب الرحلة بنجاح!');
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
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>طلب رحلة</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <Ionicons name="person-circle" size={32} color="#00C853" />
        </TouchableOpacity>
      </View>

      {/* Interactive Map */}
      <View style={styles.mapContainer}>
        <MapView
          currentLocation={currentLocation}
          markers={mapMarkers}
          showUserLocation={true}
          height={height * 0.4}
        />
      </View>

      {/* Ride Options */}
      <View style={styles.rideOptionsContainer}>
        {/* Ride Type Selection */}
        <View style={styles.rideTypeContainer}>
          <View style={styles.rideTypeButtons}>
            <TouchableOpacity
              style={[styles.rideTypeButton, rideType === 'immediate' && styles.rideTypeButtonActive]}
              onPress={() => setRideType('immediate')}
            >
              <Text style={[styles.rideTypeButtonText, rideType === 'immediate' && styles.rideTypeButtonTextActive]}>
                فوري
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rideTypeButton, rideType === 'scheduled' && styles.rideTypeButtonActive]}
              onPress={() => setRideType('scheduled')}
            >
              <Text style={[styles.rideTypeButtonText, rideType === 'scheduled' && styles.rideTypeButtonTextActive]}>
                مجدول
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rideTypeButton, rideType === 'open_ride' && styles.rideTypeButtonActive]}
              onPress={() => setRideType('open_ride')}
            >
              <Text style={[styles.rideTypeButtonText, rideType === 'open_ride' && styles.rideTypeButtonTextActive]}>
                مفتوح
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Vehicle Type Selection */}
        <View style={styles.vehicleTypeContainer}>
          <TouchableOpacity
            style={[styles.vehicleOption, vehicleType === 'standard' && styles.vehicleOptionActive]}
            onPress={() => setVehicleType('standard')}
          >
            <Ionicons name="car" size={24} color={vehicleType === 'standard' ? '#00C853' : '#666'} />
            <View style={styles.vehicleInfo}>
              <Text style={[styles.vehicleTitle, vehicleType === 'standard' && styles.vehicleTextActive]}>
                سيارة عادية
              </Text>
              <Text style={styles.vehicleDesc}>الخيار الاقتصادي</Text>
            </View>
            <Text style={[styles.vehiclePrice, vehicleType === 'standard' && styles.vehicleTextActive]}>
              من 1500 د.ع
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.vehicleOption, vehicleType === 'vip' && styles.vehicleOptionActive]}
            onPress={() => setVehicleType('vip')}
          >
            <Ionicons name="car-sport" size={24} color={vehicleType === 'vip' ? '#00C853' : '#666'} />
            <View style={styles.vehicleInfo}>
              <Text style={[styles.vehicleTitle, vehicleType === 'vip' && styles.vehicleTextActive]}>
                سيارة VIP
              </Text>
              <Text style={styles.vehicleDesc}>راحة وخدمة مميزة</Text>
            </View>
            <Text style={[styles.vehiclePrice, vehicleType === 'vip' && styles.vehicleTextActive]}>
              من 3000 د.ع
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Location Inputs */}
        <TouchableOpacity 
          style={styles.locationInput}
          onPress={() => {
            setModalType('pickup');
            setLocationModalVisible(true);
          }}
        >
          <Ionicons name="radio-button-on" size={20} color="#2196F3" />
          <Text style={[styles.locationInputText, pickupLocation && styles.locationInputTextSelected]}>
            {pickupLocation ? pickupLocation.address : 'من'}
          </Text>
        </TouchableOpacity>

        {rideType !== 'open_ride' && (
          <TouchableOpacity 
            style={styles.locationInput}
            onPress={() => {
              setModalType('destination');
              setLocationModalVisible(true);
            }}
          >
            <Ionicons name="location" size={20} color="#FF4444" />
            <Text style={[styles.locationInputText, destinationLocation && styles.locationInputTextSelected]}>
              {destinationLocation ? destinationLocation.address : 'إلى'}
            </Text>
          </TouchableOpacity>
        )}

        {rideType === 'open_ride' && (
          <View style={styles.openRideInfo}>
            <MaterialIcons name="timer" size={20} color="#FF6B35" />
            <Text style={styles.openRideText}>
              رحلة مفتوحة - ادفع بناءً على الوقت المستغرق
            </Text>
          </View>
        )}

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

// Delivery Dashboard
const DeliveryDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const [deliveryModalVisible, setDeliveryModalVisible] = useState(false);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);

  useEffect(() => {
    getCurrentLocation();
    loadMyDeliveries();
  }, []);

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

  const loadMyDeliveries = async () => {
    try {
      const deliveries = await apiCall('/delivery/my-deliveries');
      setMyDeliveries(deliveries);
    } catch (error) {
      console.error('Error loading deliveries:', error);
    }
  };

  const handleDeliveryRequested = (deliveryData: any) => {
    loadMyDeliveries();
  };

  const getDeliveryStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'requested': 'في انتظار السائق',
      'accepted': 'تم قبول الطلب',
      'picked_up': 'تم استلام الطرد',
      'in_transit': 'في الطريق',
      'delivered': 'تم التسليم',
      'cancelled': 'ملغي'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      'requested': '#FF9800',
      'accepted': '#2196F3',
      'picked_up': '#00C853',
      'in_transit': '#00C853',
      'delivered': '#4CAF50',
      'cancelled': '#F44336'
    };
    return colorMap[status] || '#666666';
  };

  const renderDeliveryItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.deliveryItem}>
      <View style={styles.deliveryHeader}>
        <Text style={styles.deliveryDescription}>{item.package_info.description}</Text>
        <Text style={[styles.deliveryStatus, { color: getStatusColor(item.status) }]}>
          {getDeliveryStatusText(item.status)}
        </Text>
      </View>
      
      <View style={styles.deliveryDetails}>
        <Text style={styles.deliveryLocation}>
          من: {item.pickup_location.address}
        </Text>
        <Text style={styles.deliveryLocation}>
          إلى: {item.delivery_location.address}
        </Text>
      </View>

      <View style={styles.deliveryInfo}>
        <Text style={styles.trackingCode}>
          كود التتبع: {item.tracking_code}
        </Text>
        <Text style={styles.deliveryDate}>
          {new Date(item.created_at).toLocaleDateString('ar-IQ')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.dashboardContainer}>
      {/* Header */}
      <View style={styles.dashboardHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>خدمة التوصيل</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <Ionicons name="person-circle" size={32} color="#00C853" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.deliveryContent} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity 
            style={styles.primaryActionButton}
            onPress={() => setDeliveryModalVisible(true)}
          >
            <MaterialIcons name="add-box" size={24} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>طلب توصيل جديد</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.secondaryActionButton}>
              <MaterialIcons name="search" size={20} color="#00C853" />
              <Text style={styles.secondaryActionText}>تتبع طرد</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryActionButton}>
              <MaterialIcons name="history" size={20} color="#00C853" />
              <Text style={styles.secondaryActionText}>السجل</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Deliveries */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>طلبات التوصيل الأخيرة</Text>
          {myDeliveries.length > 0 ? (
            <FlatList
              data={myDeliveries}
              renderItem={renderDeliveryItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="local-shipping" size={48} color="#ccc" />
              <Text style={styles.emptyText}>لا توجد طلبات توصيل بعد</Text>
              <Text style={styles.emptySubtext}>اطلب أول توصيل لك الآن!</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Delivery Request Modal */}
      <DeliveryRequestModal
        visible={deliveryModalVisible}
        onClose={() => setDeliveryModalVisible(false)}
        onDeliveryRequested={handleDeliveryRequested}
        currentLocation={currentLocation}
      />
    </View>
  );
};

// Driver Dashboard with both services
const DriverDashboard: React.FC = () => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [availableRides, setAvailableRides] = useState([]);
  const [availableDeliveries, setAvailableDeliveries] = useState([]);
  const [activeTab, setActiveTab] = useState<'rides' | 'deliveries'>('rides');
  const [deliveryModalVisible, setDeliveryModalVisible] = useState(false);

  useEffect(() => {
    getCurrentLocation();
    if (isOnline) {
      fetchAvailableServices();
      const interval = setInterval(fetchAvailableServices, 10000);
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

  const fetchAvailableServices = async () => {
    try {
      const [ridesResponse, deliveriesResponse] = await Promise.all([
        apiCall('/rides/available'),
        apiCall('/delivery/available')
      ]);
      setAvailableRides(ridesResponse);
      setAvailableDeliveries(deliveriesResponse);
    } catch (error) {
      console.error('Error fetching available services:', error);
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

  const acceptRide = async (rideId: string) => {
    try {
      await apiCall(`/rides/${rideId}/accept`, { method: 'PUT' });
      Alert.alert('تم بنجاح', 'تم قبول الرحلة!');
      fetchAvailableServices();
    } catch (error: any) {
      Alert.alert('خطأ', error.message);
    }
  };

  const acceptDelivery = async (deliveryId: string) => {
    try {
      const response = await apiCall(`/delivery/${deliveryId}/accept`, { method: 'PUT' });
      Alert.alert('تم بنجاح', `تم قبول طلب التوصيل!\nكود التتبع: ${response.tracking_code}`);
      fetchAvailableServices();
    } catch (error: any) {
      Alert.alert('خطأ', error.message);
    }
  };

  const handleDeliveryRequested = (deliveryData: any) => {
    fetchAvailableServices();
  };

  const allMarkers = [
    ...availableRides.map((ride: any) => ({
      id: `ride-${ride.id}`,
      latitude: ride.pickup_location.latitude,
      longitude: ride.pickup_location.longitude,
      title: 'طلب رحلة',
      description: ride.destination_location ? `إلى: ${ride.destination_location.address}` : 'رحلة مفتوحة',
      color: '#2196F3',
    })),
    ...availableDeliveries.map((delivery: any) => ({
      id: `delivery-${delivery.id}`,
      latitude: delivery.pickup_location.latitude,
      longitude: delivery.pickup_location.longitude,
      title: 'طلب توصيل',
      description: `إلى: ${delivery.delivery_location.address}`,
      color: '#FF6B35',
    })),
  ];

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

      {/* Interactive Map */}
      <View style={styles.mapContainer}>
        <MapView
          currentLocation={currentLocation}
          markers={allMarkers}
          showUserLocation={true}
          height={height * 0.35}
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
          {isOnline ? `الرحلات: ${availableRides.length} | التوصيل: ${availableDeliveries.length}` : 'اضغط للاتصال واستقبال الطلبات'}
        </Text>
      </View>

      {/* Service Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rides' && styles.tabActive]}
          onPress={() => setActiveTab('rides')}
        >
          <Text style={[styles.tabText, activeTab === 'rides' && styles.tabTextActive]}>
            الرحلات ({availableRides.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'deliveries' && styles.tabActive]}
          onPress={() => setActiveTab('deliveries')}
        >
          <Text style={[styles.tabText, activeTab === 'deliveries' && styles.tabTextActive]}>
            التوصيل ({availableDeliveries.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on active tab */}
      <ScrollView style={styles.servicesContent}>
        {activeTab === 'rides' ? (
          availableRides.map((ride: any) => (
            <View key={ride.id} style={styles.serviceItem}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceType}>رحلة {ride.ride_type === 'open_ride' ? 'مفتوحة' : 'عادية'}</Text>
                <Text style={styles.vehicleBadge}>{ride.vehicle_type === 'vip' ? 'VIP' : 'عادية'}</Text>
              </View>
              <Text style={styles.serviceLocation}>من: {ride.pickup_location.address}</Text>
              {ride.destination_location && (
                <Text style={styles.serviceLocation}>إلى: {ride.destination_location.address}</Text>
              )}
              <Text style={styles.passengerName}>الراكب: {ride.passenger_info.name}</Text>
              <TouchableOpacity 
                style={styles.acceptButton}
                onPress={() => acceptRide(ride.id)}
              >
                <Text style={styles.acceptButtonText}>قبول الرحلة</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          availableDeliveries.map((delivery: any) => (
            <View key={delivery.id} style={styles.serviceItem}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceType}>توصيل {delivery.package_info.size}</Text>
                <Text style={styles.trackingCode}>{delivery.tracking_code}</Text>
              </View>
              <Text style={styles.packageDesc}>{delivery.package_info.description}</Text>
              <Text style={styles.serviceLocation}>من: {delivery.pickup_location.address}</Text>
              <Text style={styles.serviceLocation}>إلى: {delivery.delivery_location.address}</Text>
              <Text style={styles.recipientName}>المستلم: {delivery.recipient_info.name}</Text>
              <TouchableOpacity 
                style={styles.acceptButton}
                onPress={() => acceptDelivery(delivery.id)}
              >
                <Text style={styles.acceptButtonText}>قبول التوصيل</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {((activeTab === 'rides' && availableRides.length === 0) || 
          (activeTab === 'deliveries' && availableDeliveries.length === 0)) && (
          <View style={styles.emptyContainer}>
            <MaterialIcons 
              name={activeTab === 'rides' ? 'directions-car' : 'local-shipping'} 
              size={48} 
              color="#ccc" 
            />
            <Text style={styles.emptyText}>
              لا توجد {activeTab === 'rides' ? 'رحلات' : 'طلبات توصيل'} متاحة
            </Text>
            <Text style={styles.emptySubtext}>
              {isOnline ? 'تحقق مرة أخرى بعد قليل' : 'اذهب متصل لرؤية الطلبات المتاحة'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Delivery Request Modal */}
      <DeliveryRequestModal
        visible={deliveryModalVisible}
        onClose={() => setDeliveryModalVisible(false)}
        onDeliveryRequested={handleDeliveryRequested}
        currentLocation={currentLocation}
      />
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

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  logoSubtext: {
    fontSize: 16,
    color: '#666666',
    fontStyle: 'italic',
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

  // Service Selection Styles
  serviceContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  serviceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 40,
  },
  serviceOptions: {
    gap: 20,
  },
  serviceOption: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  serviceIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F9F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceOptionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  serviceOptionDesc: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
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
  backButton: {
    padding: 8,
  },

  // Map Container
  mapContainer: {
    backgroundColor: '#E8E8E8',
  },

  // Ride Options Styles
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
  rideTypeContainer: {
    marginBottom: 20,
  },
  rideTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rideTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  rideTypeButtonActive: {
    backgroundColor: '#00C853',
    borderColor: '#00C853',
  },
  rideTypeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666666',
  },
  rideTypeButtonTextActive: {
    color: '#FFFFFF',
  },
  vehicleTypeContainer: {
    gap: 12,
    marginBottom: 20,
  },
  vehicleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  vehicleOptionActive: {
    borderColor: '#00C853',
    backgroundColor: '#F0F9F0',
  },
  vehicleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  vehicleTextActive: {
    color: '#00C853',
  },
  vehicleDesc: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  vehiclePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666666',
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
  openRideInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    marginBottom: 20,
  },
  openRideText: {
    fontSize: 14,
    color: '#F57C00',
    marginLeft: 8,
    flex: 1,
  },

  // Delivery Dashboard Styles
  deliveryContent: {
    flex: 1,
  },
  quickActionsContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  primaryActionButton: {
    backgroundColor: '#00C853',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F0F9F0',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00C853',
    marginLeft: 6,
  },
  recentSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  deliveryItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    elevation: 1,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryDescription: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flex: 1,
  },
  deliveryStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  deliveryDetails: {
    marginBottom: 8,
  },
  deliveryLocation: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  deliveryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackingCode: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00C853',
  },
  deliveryDate: {
    fontSize: 12,
    color: '#666666',
  },

  // Driver Dashboard Styles
  statusCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  statusToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#E8E8E8',
  },
  statusToggleActive: {
    backgroundColor: '#00C853',
  },
  statusToggleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666666',
  },
  statusToggleTextActive: {
    color: '#FFFFFF',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666666',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  tabActive: {
    backgroundColor: '#00C853',
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666666',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  servicesContent: {
    flex: 1,
    padding: 20,
  },
  serviceItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    elevation: 2,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  vehicleBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00C853',
    backgroundColor: '#F0F9F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  serviceLocation: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  packageDesc: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  passengerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 12,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 12,
  },
  acceptButton: {
    backgroundColor: '#00C853',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default App;