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
import ProfileScreen from '../components/ProfileScreen';
import HistoryScreen from '../components/HistoryScreen';
import SettingsScreen from '../components/SettingsScreen';
import NotificationSystem from '../components/NotificationSystem';
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

// Welcome Screen Component (Updated with new branding and colors)
const WelcomeScreen: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
  return (
    <View style={styles.welcomeContainer}>
      <View style={styles.welcomeHeader}>
        <View style={styles.logoContainer}>
          <Image 
            source={{ uri: 'https://customer-assets.emergentagent.com/job_aburide/artifacts/4ksqh5gf_IMG_1449.jpeg' }}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.logoSubtext}>Abu Al-Gharbiya</Text>
        </View>
        <Text style={styles.appTitle}>مرحباً بك</Text>
        <Text style={styles.appSubtitle}>نقل وتوصيل آمن ومريح في الأنبار</Text>
      </View>
      
      <View style={styles.welcomeContent}>
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <MaterialIcons name="directions-car" size={24} color={Colors.success} />
            <Text style={styles.featureText}>خدمة النقل والمشاوير</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="local-shipping" size={24} color={Colors.success} />
            <Text style={styles.featureText}>توصيل الطرود والمواد</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="location-on" size={24} color={Colors.success} />
            <Text style={styles.featureText}>تتبع مباشر للرحلة</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="star" size={24} color={Colors.success} />
            <Text style={styles.featureText}>تقييمات موثقة</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="payment" size={24} color={Colors.primary} />
            <Text style={styles.featureText}>طرق دفع متعددة</Text>
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
          <View style={[styles.serviceIconContainer, { backgroundColor: Colors.sectionBackground }]}>
            <Ionicons name="car" size={40} color={Colors.success} />
          </View>
          <Text style={styles.serviceOptionTitle}>طلب رحلة</Text>
          <Text style={styles.serviceOptionDesc}>انتقل من مكان إلى آخر بأمان</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.serviceOption}
          onPress={() => onServiceSelect('delivery')}
        >
          <View style={[styles.serviceIconContainer, { backgroundColor: Colors.sectionBackground }]}>
            <MaterialIcons name="local-shipping" size={40} color={Colors.delivery} />
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
          <Image 
            source={{ uri: 'https://customer-assets.emergentagent.com/job_aburide/artifacts/4ksqh5gf_IMG_1449.jpeg' }}
            style={styles.authLogoImage}
            resizeMode="contain"
          />
          <Text style={styles.authTitle}>تسجيل الدخول</Text>
        </View>
        
        <View style={styles.authForm}>
          <View style={styles.inputContainer}>
            <Ionicons name="phone-portrait" size={20} color={Colors.darkGray} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="رقم الهاتف"
              keyboardType="phone-pad"
              placeholderTextColor={Colors.mediumGray}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color={Colors.darkGray} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              placeholder="كلمة المرور"
              secureTextEntry
              placeholderTextColor={Colors.mediumGray}
            />
          </View>

          <TouchableOpacity 
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
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
          <Image 
            source={{ uri: 'https://customer-assets.emergentagent.com/job_aburide/artifacts/4ksqh5gf_IMG_1449.jpeg' }}
            style={styles.authLogoImage}
            resizeMode="contain"
          />
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
                  color={userType === 'passenger' ? Colors.success : Colors.darkGray} 
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
                  color={userType === 'driver' ? Colors.success : Colors.darkGray} 
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
            <Ionicons name="person" size={20} color={Colors.darkGray} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="الاسم الكامل *"
              placeholderTextColor={Colors.mediumGray}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="phone-portrait" size={20} color={Colors.darkGray} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="رقم الهاتف *"
              keyboardType="phone-pad"
              placeholderTextColor={Colors.mediumGray}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color={Colors.darkGray} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="البريد الإلكتروني (اختياري)"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={Colors.mediumGray}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color={Colors.darkGray} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              placeholder="كلمة المرور *"
              secureTextEntry
              placeholderTextColor={Colors.mediumGray}
            />
          </View>

          <TouchableOpacity 
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} 
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
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
  const { user, logout } = useAuth();
  const [selectedService, setSelectedService] = useState<'ride' | 'delivery' | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const handleUserUpdate = (updatedUser: any) => {
    // Update user context if needed
    console.log('User updated:', updatedUser);
  };

  const handleNotificationPress = (notification: any) => {
    console.log('Notification pressed:', notification);
    // Handle notification navigation
  };

  const handleNotificationAction = (action: string, notification: any) => {
    console.log('Notification action:', action, notification);
    // Handle notification actions
  };

  if (!selectedService && user?.user_type === 'passenger') {
    return (
      <>
        <ServiceSelection onServiceSelect={setSelectedService} />
        <NotificationSystem 
          onNotificationPress={handleNotificationPress}
          onActionPress={handleNotificationAction}
        />
        
        {/* Modals */}
        <ProfileScreen
          visible={profileModalVisible}
          onClose={() => setProfileModalVisible(false)}
          user={user}
          onUserUpdate={handleUserUpdate}
        />
        <HistoryScreen
          visible={historyModalVisible}
          onClose={() => setHistoryModalVisible(false)}
          userType={user?.user_type}
        />
        <SettingsScreen
          visible={settingsModalVisible}
          onClose={() => setSettingsModalVisible(false)}
          user={user}
          onLogout={logout}
        />
      </>
    );
  }

  if (user?.user_type === 'passenger') {
    if (selectedService === 'ride') {
      return (
        <>
          <PassengerDashboard 
            onBack={() => setSelectedService(null)}
            onProfilePress={() => setProfileModalVisible(true)}
            onHistoryPress={() => setHistoryModalVisible(true)}
            onSettingsPress={() => setSettingsModalVisible(true)}
          />
          <NotificationSystem 
            onNotificationPress={handleNotificationPress}
            onActionPress={handleNotificationAction}
          />
          
          {/* Modals */}
          <ProfileScreen
            visible={profileModalVisible}
            onClose={() => setProfileModalVisible(false)}
            user={user}
            onUserUpdate={handleUserUpdate}
          />
          <HistoryScreen
            visible={historyModalVisible}
            onClose={() => setHistoryModalVisible(false)}
            userType={user?.user_type}
          />
          <SettingsScreen
            visible={settingsModalVisible}
            onClose={() => setSettingsModalVisible(false)}
            user={user}
            onLogout={logout}
          />
        </>
      );
    } else {
      return (
        <>
          <DeliveryDashboard 
            onBack={() => setSelectedService(null)}
            onProfilePress={() => setProfileModalVisible(true)}
            onHistoryPress={() => setHistoryModalVisible(true)}
            onSettingsPress={() => setSettingsModalVisible(true)}
          />
          <NotificationSystem 
            onNotificationPress={handleNotificationPress}
            onActionPress={handleNotificationAction}
          />
          
          {/* Modals */}
          <ProfileScreen
            visible={profileModalVisible}
            onClose={() => setProfileModalVisible(false)}
            user={user}
            onUserUpdate={handleUserUpdate}
          />
          <HistoryScreen
            visible={historyModalVisible}
            onClose={() => setHistoryModalVisible(false)}
            userType={user?.user_type}
          />
          <SettingsScreen
            visible={settingsModalVisible}
            onClose={() => setSettingsModalVisible(false)}
            user={user}
            onLogout={logout}
          />
        </>
      );
    }
  } else {
    return (
      <>
        <DriverDashboard 
          onProfilePress={() => setProfileModalVisible(true)}
          onHistoryPress={() => setHistoryModalVisible(true)}
          onSettingsPress={() => setSettingsModalVisible(true)}
        />
        <NotificationSystem 
          onNotificationPress={handleNotificationPress}
          onActionPress={handleNotificationAction}
        />
        
        {/* Modals */}
        <ProfileScreen
          visible={profileModalVisible}
          onClose={() => setProfileModalVisible(false)}
          user={user}
          onUserUpdate={handleUserUpdate}
        />
        <HistoryScreen
          visible={historyModalVisible}
          onClose={() => setHistoryModalVisible(false)}
          userType={user?.user_type}
        />
        <SettingsScreen
          visible={settingsModalVisible}
          onClose={() => setSettingsModalVisible(false)}
          user={user}
          onLogout={logout}
        />
      </>
    );
  }
};

// Passenger Dashboard for Rides with Payment Integration
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
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [scheduledDateTime, setScheduledDateTime] = useState<Date | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (pickupLocation && destinationLocation && rideType !== 'open_ride') {
      calculateEstimatedCost();
    } else if (rideType === 'open_ride') {
      setEstimatedCost(vehicleType === 'vip' ? 3000 : 1500); // Base rate for open rides
    }
  }, [pickupLocation, destinationLocation, vehicleType, rideType]);

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

  const calculateEstimatedCost = () => {
    if (!pickupLocation || !destinationLocation) return;

    // Simple distance calculation
    const distance = calculateDistance(pickupLocation, destinationLocation);
    const baseFare = vehicleType === 'vip' ? 2000 : 1000;
    const perKm = vehicleType === 'vip' ? 800 : 500;
    
    let cost = baseFare + (distance * perKm);
    
    if (rideType === 'scheduled') {
      cost += 500; // Booking fee for scheduled rides
    }
    
    setEstimatedCost(Math.round(cost));
  };

  const calculateDistance = (location1: LocationData, location2: LocationData): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(location2.latitude - location1.latitude);
    const dLon = toRad(location2.longitude - location1.longitude);
    const lat1 = toRad(location1.latitude);
    const lat2 = toRad(location2.latitude);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  };

  const toRad = (value: number) => (value * Math.PI) / 180;

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

    if (rideType === 'scheduled' && !scheduledDateTime) {
      Alert.alert('تنبيه', 'يرجى تحديد موعد الرحلة');
      return;
    }

    // Show payment modal before creating ride
    setPaymentModalVisible(true);
  };

  const handlePaymentSelect = async (paymentMethod: any, paymentDetails?: any) => {
    try {
      const rideData: any = {
        pickup_location: pickupLocation,
        ride_type: rideType,
        vehicle_type: vehicleType,
        payment_method: paymentMethod.type,
        payment_details: paymentDetails,
      };

      if (rideType !== 'open_ride' && destinationLocation) {
        rideData.destination_location = destinationLocation;
      }

      if (rideType === 'open_ride') {
        rideData.max_duration_minutes = 480; // 8 hours max
      }

      if (rideType === 'scheduled' && scheduledDateTime) {
        rideData.scheduled_time = scheduledDateTime.toISOString();
      }

      const response = await apiCall('/rides/request', {
        method: 'POST',
        body: JSON.stringify(rideData),
      });

      setRideRequested(true);
      setPaymentModalVisible(false);
      
      Alert.alert(
        'تم بنجاح', 
        `تم طلب الرحلة بنجاح!\nرقم الرحلة: ${response.id}\nطريقة الدفع: ${paymentMethod.name}`
      );
    } catch (error: any) {
      Alert.alert('خطأ', error.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IQ', {
      style: 'currency',
      currency: 'IQD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const mapMarkers = [
    ...(pickupLocation ? [{
      id: 'pickup',
      latitude: pickupLocation.latitude,
      longitude: pickupLocation.longitude,
      title: 'نقطة الانطلاق',
      description: pickupLocation.address,
      color: Colors.pickup,
    }] : []),
    ...(destinationLocation ? [{
      id: 'destination',
      latitude: destinationLocation.latitude,
      longitude: destinationLocation.longitude,
      title: 'الوجهة',
      description: destinationLocation.address,
      color: Colors.destination,
    }] : []),
  ];

  return (
    <View style={styles.dashboardContainer}>
      {/* Header */}
      <View style={styles.dashboardHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>طلب رحلة</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <Ionicons name="person-circle" size={32} color={Colors.primary} />
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
            <Ionicons name="car" size={24} color={vehicleType === 'standard' ? Colors.success : Colors.darkGray} />
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
            <Ionicons name="car-sport" size={24} color={vehicleType === 'vip' ? Colors.success : Colors.darkGray} />
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
          <Ionicons name="radio-button-on" size={20} color={Colors.pickup} />
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
            <Ionicons name="location" size={20} color={Colors.destination} />
            <Text style={[styles.locationInputText, destinationLocation && styles.locationInputTextSelected]}>
              {destinationLocation ? destinationLocation.address : 'إلى'}
            </Text>
          </TouchableOpacity>
        )}

        {rideType === 'open_ride' && (
          <View style={styles.openRideInfo}>
            <MaterialIcons name="timer" size={20} color={Colors.delivery} />
            <Text style={styles.openRideText}>
              رحلة مفتوحة - ادفع بناءً على الوقت المستغرق
            </Text>
          </View>
        )}

        {/* Cost Display */}
        {estimatedCost > 0 && (
          <View style={styles.costDisplay}>
            <Text style={styles.costLabel}>التكلفة المقدرة:</Text>
            <Text style={styles.costValue}>{formatCurrency(estimatedCost)}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.primaryButton, rideRequested && styles.primaryButtonDisabled]}
          onPress={handleRequestRide}
          disabled={rideRequested}
        >
          <MaterialIcons name="payment" size={20} color={Colors.white} style={{ marginRight: 8 }} />
          <Text style={styles.primaryButtonText}>
            {rideRequested ? 'تم طلب الرحلة' : 'اختر طريقة الدفع'}
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

      {/* Payment Selection Modal */}
      <PaymentSelectionModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        onPaymentSelect={handlePaymentSelect}
        amount={estimatedCost}
        serviceType="ride"
      />
    </View>
  );
};

// Delivery Dashboard (unchanged but with new colors)
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
      'requested': Colors.warning,
      'accepted': Colors.info,
      'picked_up': Colors.success,
      'in_transit': Colors.success,
      'delivered': Colors.success,
      'cancelled': Colors.error
    };
    return colorMap[status] || Colors.mediumGray;
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
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>خدمة التوصيل</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <Ionicons name="person-circle" size={32} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.deliveryContent} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity 
            style={styles.primaryActionButton}
            onPress={() => setDeliveryModalVisible(true)}
          >
            <MaterialIcons name="add-box" size={24} color={Colors.white} />
            <Text style={styles.primaryActionText}>طلب توصيل جديد</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.secondaryActionButton}>
              <MaterialIcons name="search" size={20} color={Colors.primary} />
              <Text style={styles.secondaryActionText}>تتبع طرد</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryActionButton}>
              <MaterialIcons name="history" size={20} color={Colors.primary} />
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
              <MaterialIcons name="local-shipping" size={48} color={Colors.mediumGray} />
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

// Driver Dashboard with both services (unchanged but with new colors)
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
      color: Colors.pickup,
    })),
    ...availableDeliveries.map((delivery: any) => ({
      id: `delivery-${delivery.id}`,
      latitude: delivery.pickup_location.latitude,
      longitude: delivery.pickup_location.longitude,
      title: 'طلب توصيل',
      description: `إلى: ${delivery.delivery_location.address}`,
      color: Colors.delivery,
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
          <Ionicons name="person-circle" size={40} color={Colors.primary} />
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
              color={Colors.mediumGray} 
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
        <StatusBar style="dark" backgroundColor={Colors.white} />
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
        <ActivityIndicator size="large" color={Colors.primary} />
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

// Styles with New Color System
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  
  // Welcome Screen Styles
  welcomeContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  welcomeHeader: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: Spacing.sm,
  },
  logoText: {
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  logoSubtext: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  appSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
  },
  featuresList: {
    paddingVertical: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.sectionBackground,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  featureText: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginLeft: Spacing.md,
    flex: 1,
  },
  getStartedBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: 40,
    ...Shadows.medium,
  },
  getStartedText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },

  // Service Selection Styles
  serviceContainer: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  serviceTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 40,
  },
  serviceOptions: {
    gap: Spacing.lg,
  },
  serviceOption: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.medium,
  },
  serviceIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  serviceOptionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  serviceOptionDesc: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Auth Screens Styles
  authContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  authContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  authHeader: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  authLogoImage: {
    width: 80,
    height: 80,
    marginBottom: Spacing.md,
  },
  authTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  authForm: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: FontSizes.md,
    paddingVertical: 14,
    color: Colors.textPrimary,
  },
  userTypeContainer: {
    marginBottom: Spacing.lg,
  },
  userTypeButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  userTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.gray,
    backgroundColor: Colors.lightGray,
  },
  userTypeButtonActive: {
    borderColor: Colors.success,
    backgroundColor: Colors.sectionBackground,
  },
  userTypeButtonText: {
    fontSize: FontSizes.md,
    color: Colors.darkGray,
    fontWeight: '500',
    marginLeft: Spacing.sm,
  },
  userTypeButtonTextActive: {
    color: Colors.success,
    fontWeight: 'bold',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
    ...Shadows.medium,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  secondaryButton: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  secondaryButtonText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  linkText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },

  // Dashboard Styles
  dashboardContainer: {
    flex: 1,
    backgroundColor: Colors.sectionBackground,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray,
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  greeting: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  userName: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  profileButton: {
    padding: Spacing.sm,
  },
  backButton: {
    padding: Spacing.sm,
  },

  // Map Container
  mapContainer: {
    backgroundColor: Colors.gray,
  },

  // Ride Options Styles
  rideOptionsContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    marginTop: -20,
    ...Shadows.large,
  },
  rideTypeContainer: {
    marginBottom: Spacing.lg,
  },
  rideTypeButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rideTypeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.gray,
  },
  rideTypeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rideTypeButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.darkGray,
  },
  rideTypeButtonTextActive: {
    color: Colors.white,
  },
  vehicleTypeContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  vehicleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.gray,
  },
  vehicleOptionActive: {
    borderColor: Colors.success,
    backgroundColor: Colors.sectionBackground,
  },
  vehicleInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  vehicleTitle: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  vehicleTextActive: {
    color: Colors.success,
  },
  vehicleDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  vehiclePrice: {
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.textSecondary,
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray,
  },
  locationInputText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.darkGray,
    marginLeft: Spacing.sm,
  },
  locationInputTextSelected: {
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  openRideInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.sectionBackground,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  openRideText: {
    fontSize: FontSizes.sm,
    color: Colors.accent,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  costDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.sectionBackground,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  costLabel: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  costValue: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.primary,
  },

  // Delivery Dashboard Styles
  deliveryContent: {
    flex: 1,
  },
  quickActionsContainer: {
    padding: Spacing.lg,
    backgroundColor: Colors.white,
  },
  primaryActionButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  primaryActionText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    marginLeft: Spacing.sm,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.sectionBackground,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  secondaryActionText: {
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.primary,
    marginLeft: 6,
  },
  recentSection: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.small,
  },
  deliveryItem: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray,
    ...Shadows.small,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  deliveryDescription: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    flex: 1,
  },
  deliveryStatus: {
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
  deliveryDetails: {
    marginBottom: Spacing.sm,
  },
  deliveryLocation: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  deliveryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackingCode: {
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  deliveryDate: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },

  // Driver Dashboard Styles
  statusCard: {
    backgroundColor: Colors.white,
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadows.small,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusTitle: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  statusToggle: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray,
  },
  statusToggleActive: {
    backgroundColor: Colors.primary,
  },
  statusToggleText: {
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
    color: Colors.darkGray,
  },
  statusToggleTextActive: {
    color: Colors.white,
  },
  statusDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    ...Shadows.small,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.darkGray,
  },
  tabTextActive: {
    color: Colors.white,
  },
  servicesContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  serviceItem: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray,
    ...Shadows.small,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  serviceType: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  vehicleBadge: {
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
    color: Colors.primary,
    backgroundColor: Colors.sectionBackground,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  serviceLocation: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  packageDesc: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  passengerName: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  recipientName: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  acceptButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.mediumGray,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    color: Colors.mediumGray,
    textAlign: 'center',
  },
});

export default App;