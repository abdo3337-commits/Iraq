import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import LocationSearchModal from './LocationSearchModal';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from './styles';

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

interface DeliveryRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onDeliveryRequested: (deliveryData: any) => void;
  currentLocation?: LocationData | null;
}

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://aburide.preview.emergentagent.com';

const DeliveryRequestModal: React.FC<DeliveryRequestModalProps> = ({
  visible,
  onClose,
  onDeliveryRequested,
  currentLocation,
}) => {
  // Location states
  const [pickupLocation, setPickupLocation] = useState<LocationData | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<LocationData | null>(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'pickup' | 'delivery'>('pickup');

  // Package details
  const [packageDescription, setPackageDescription] = useState('');
  const [packageSize, setPackageSize] = useState<'small' | 'medium' | 'large'>('small');
  const [packageWeight, setPackageWeight] = useState('');
  const [isFragile, setIsFragile] = useState(false);
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [declaredValue, setDeclaredValue] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Recipient details
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientNotes, setRecipientNotes] = useState('');

  // Other
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && currentLocation) {
      setPickupLocation(currentLocation);
    }
  }, [visible, currentLocation]);

  useEffect(() => {
    if (pickupLocation && deliveryLocation) {
      calculateEstimatedCost();
    }
  }, [pickupLocation, deliveryLocation, packageSize, isFragile, requiresSignature, declaredValue]);

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

  const calculateEstimatedCost = async () => {
    if (!pickupLocation || !deliveryLocation) return;

    try {
      // Simple distance calculation (Haversine formula)
      const distance = calculateDistance(pickupLocation, deliveryLocation);
      
      // Get pricing from backend (simplified calculation here)
      const baseCosts = {
        small: { base: 1500, perKm: 300, minimum: 2000 },
        medium: { base: 2500, perKm: 400, minimum: 3000 },
        large: { base: 4000, perKm: 600, minimum: 5000 }
      };

      const pricing = baseCosts[packageSize];
      let cost = pricing.base + (distance * pricing.perKm);

      // Add additional fees
      if (isFragile) cost += 800;
      if (requiresSignature) cost += 500;
      if (declaredValue) {
        const value = parseFloat(declaredValue) || 0;
        cost += value * 0.01; // 1% insurance
      }

      setEstimatedCost(Math.max(pricing.minimum, Math.round(cost)));
    } catch (error) {
      console.error('Error calculating cost:', error);
    }
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IQ', {
      style: 'currency',
      currency: 'IQD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleLocationSelect = (location: LocationData) => {
    if (modalType === 'pickup') {
      setPickupLocation(location);
    } else {
      setDeliveryLocation(location);
    }
  };

  const validateForm = () => {
    if (!pickupLocation || !deliveryLocation) {
      Alert.alert('خطأ', 'يرجى تحديد موقع الاستلام والتسليم');
      return false;
    }

    if (!packageDescription.trim()) {
      Alert.alert('خطأ', 'يرجى وصف الطرد');
      return false;
    }

    if (!recipientName.trim() || !recipientPhone.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال معلومات المستلم');
      return false;
    }

    return true;
  };

  const handleRequestDelivery = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const deliveryData = {
        pickup_location: pickupLocation,
        delivery_location: deliveryLocation,
        package_info: {
          description: packageDescription,
          size: packageSize,
          weight_kg: packageWeight ? parseFloat(packageWeight) : null,
          fragile: isFragile,
          requires_signature: requiresSignature,
          special_instructions: specialInstructions || null,
          declared_value: declaredValue ? parseFloat(declaredValue) : null,
        },
        recipient_info: {
          name: recipientName,
          phone: recipientPhone,
          notes: recipientNotes || null,
        },
        delivery_type: "immediate",
      };

      const response = await apiCall('/delivery/request', {
        method: 'POST',
        body: JSON.stringify(deliveryData),
      });

      onDeliveryRequested(response);
      resetForm();
      onClose();

      Alert.alert(
        'تم بنجاح!', 
        `تم طلب التوصيل بنجاح!\nكود التتبع: ${response.tracking_code}\nالتكلفة المقدرة: ${formatCurrency(response.estimated_cost)}`
      );
    } catch (error: any) {
      Alert.alert('خطأ', error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPickupLocation(null);
    setDeliveryLocation(null);
    setPackageDescription('');
    setPackageSize('small');
    setPackageWeight('');
    setIsFragile(false);
    setRequiresSignature(false);
    setDeclaredValue('');
    setSpecialInstructions('');
    setRecipientName('');
    setRecipientPhone('');
    setRecipientNotes('');
    setEstimatedCost(null);
  };

  const getPackageSizeInfo = (size: string) => {
    const sizeInfo = {
      small: { name: 'صغير', desc: 'أقل من 5 كغ', examples: 'وثائق، أدوية، طعام', maxWeight: 5 },
      medium: { name: 'متوسط', desc: '5-15 كغ', examples: 'ملابس، أحذية، إلكترونيات', maxWeight: 15 },
      large: { name: 'كبير', desc: '15-30 كغ', examples: 'أجهزة، أثاث صغير', maxWeight: 30 }
    };
    return sizeInfo[size] || sizeInfo.small;
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>طلب توصيل</Text>
            <View style={styles.placeholder} />
          </View>

          <KeyboardAvoidingView 
            style={styles.content}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
              
              {/* Locations Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>المواقع</Text>
                
                {/* Pickup Location */}
                <TouchableOpacity 
                  style={styles.locationInput}
                  onPress={() => {
                    setModalType('pickup');
                    setLocationModalVisible(true);
                  }}
                >
                  <Ionicons name="location" size={20} color="#2196F3" />
                  <Text style={[styles.locationText, pickupLocation && styles.locationTextSelected]}>
                    {pickupLocation ? pickupLocation.address : 'موقع الاستلام'}
                  </Text>
                </TouchableOpacity>

                {/* Delivery Location */}
                <TouchableOpacity 
                  style={styles.locationInput}
                  onPress={() => {
                    setModalType('delivery');
                    setLocationModalVisible(true);
                  }}
                >
                  <Ionicons name="flag" size={20} color="#FF4444" />
                  <Text style={[styles.locationText, deliveryLocation && styles.locationTextSelected]}>
                    {deliveryLocation ? deliveryLocation.address : 'موقع التسليم'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Package Details Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>تفاصيل الطرد</Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>وصف الطرد *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={packageDescription}
                    onChangeText={setPackageDescription}
                    placeholder="مثال: وثائق مهمة، أدوية، طعام..."
                    multiline
                    maxLength={200}
                  />
                </View>

                {/* Package Size Selection */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>حجم الطرد *</Text>
                  <View style={styles.sizeButtons}>
                    {(['small', 'medium', 'large'] as const).map((size) => {
                      const sizeInfo = getPackageSizeInfo(size);
                      return (
                        <TouchableOpacity
                          key={size}
                          style={[
                            styles.sizeButton,
                            packageSize === size && styles.sizeButtonActive,
                          ]}
                          onPress={() => setPackageSize(size)}
                        >
                          <Text style={[
                            styles.sizeButtonText,
                            packageSize === size && styles.sizeButtonTextActive,
                          ]}>
                            {sizeInfo.name}
                          </Text>
                          <Text style={[
                            styles.sizeButtonDesc,
                            packageSize === size && styles.sizeButtonTextActive,
                          ]}>
                            {sizeInfo.desc}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.sizeExamples}>
                    أمثلة: {getPackageSizeInfo(packageSize).examples}
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>الوزن التقريبي (اختياري)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={packageWeight}
                    onChangeText={setPackageWeight}
                    placeholder={`أقل من ${getPackageSizeInfo(packageSize).maxWeight} كغ`}
                    keyboardType="numeric"
                  />
                </View>

                {/* Package Options */}
                <View style={styles.optionsContainer}>
                  <View style={styles.optionRow}>
                    <Text style={styles.optionLabel}>طرد هش (قابل للكسر)</Text>
                    <Switch
                      value={isFragile}
                      onValueChange={setIsFragile}
                      thumbColor={isFragile ? '#00C853' : '#f4f3f4'}
                      trackColor={{ false: '#767577', true: '#81b0ff' }}
                    />
                  </View>
                  
                  <View style={styles.optionRow}>
                    <Text style={styles.optionLabel}>يتطلب توقيع عند الاستلام</Text>
                    <Switch
                      value={requiresSignature}
                      onValueChange={setRequiresSignature}
                      thumbColor={requiresSignature ? '#00C853' : '#f4f3f4'}
                      trackColor={{ false: '#767577', true: '#81b0ff' }}
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>القيمة المعلنة للتأمين (اختياري)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={declaredValue}
                    onChangeText={setDeclaredValue}
                    placeholder="القيمة بالدينار العراقي"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>تعليمات خاصة (اختياري)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={specialInstructions}
                    onChangeText={setSpecialInstructions}
                    placeholder="أي تعليمات خاصة للسائق..."
                    multiline
                    maxLength={500}
                  />
                </View>
              </View>

              {/* Recipient Details Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>معلومات المستلم</Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>اسم المستلم *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={recipientName}
                    onChangeText={setRecipientName}
                    placeholder="الاسم الكامل للمستلم"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>رقم هاتف المستلم *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={recipientPhone}
                    onChangeText={setRecipientPhone}
                    placeholder="07xxxxxxxxx"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>ملاحظات للمستلم (اختياري)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={recipientNotes}
                    onChangeText={setRecipientNotes}
                    placeholder="أي ملاحظات خاصة..."
                    multiline
                  />
                </View>
              </View>

              {/* Cost Estimation */}
              {estimatedCost && (
                <View style={styles.costCard}>
                  <View style={styles.costHeader}>
                    <MaterialIcons name="calculate" size={24} color="#00C853" />
                    <Text style={styles.costTitle}>التكلفة المقدرة</Text>
                  </View>
                  <Text style={styles.costAmount}>{formatCurrency(estimatedCost)}</Text>
                  <Text style={styles.costNote}>
                    * التكلفة النهائية قد تختلف بناءً على المسافة الفعلية
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Submit Button */}
            <View style={styles.footer}>
              <TouchableOpacity 
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleRequestDelivery}
                disabled={loading || !pickupLocation || !deliveryLocation}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'جاري الإرسال...' : 'طلب التوصيل'}
                </Text>
                {estimatedCost && (
                  <Text style={styles.submitButtonSubtext}>
                    {formatCurrency(estimatedCost)}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Location Selection Modal */}
      <LocationSearchModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onLocationSelect={handleLocationSelect}
        title={modalType === 'pickup' ? 'اختر موقع الاستلام' : 'اختر موقع التسليم'}
        currentLocation={currentLocation}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  form: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
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
  locationText: {
    flex: 1,
    fontSize: 16,
    color: '#666666',
    marginLeft: 12,
  },
  locationTextSelected: {
    color: '#1A1A1A',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#F8F8F8',
    color: '#1A1A1A',
  },
  sizeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  sizeButton: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderWidth: 2,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  sizeButtonActive: {
    borderColor: '#00C853',
    backgroundColor: '#F0F9F0',
  },
  sizeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666666',
    marginBottom: 2,
  },
  sizeButtonDesc: {
    fontSize: 11,
    color: '#999999',
    textAlign: 'center',
  },
  sizeButtonTextActive: {
    color: '#00C853',
  },
  sizeExamples: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
  },
  optionsContainer: {
    gap: 12,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  optionLabel: {
    fontSize: 16,
    color: '#1A1A1A',
    flex: 1,
  },
  costCard: {
    backgroundColor: '#F0F9F0',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  costHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  costTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00C853',
    marginLeft: 8,
  },
  costAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00C853',
    textAlign: 'center',
    marginBottom: 4,
  },
  costNote: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  submitButton: {
    backgroundColor: '#00C853',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  submitButtonSubtext: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },
});

export default DeliveryRequestModal;