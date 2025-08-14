import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from './styles';

interface OTPVerificationProps {
  visible: boolean;
  onClose: () => void;
  phoneNumber: string;
  onVerificationSuccess: (userData: any) => void;
  isRegistration?: boolean;
  registrationData?: any;
}

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://aburide.preview.emergentagent.com';

const OTPVerification: React.FC<OTPVerificationProps> = ({
  visible,
  onClose,
  phoneNumber,
  onVerificationSuccess,
  isRegistration = false,
  registrationData,
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (visible) {
      sendOTP();
      startCountdown();
    }
  }, [visible]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0 && visible) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [countdown, visible]);

  const startCountdown = () => {
    setCountdown(60);
    setCanResend(false);
  };

  const sendOTP = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneNumber,
          action: isRegistration ? 'register' : 'login',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('OTP sent:', result.message);
        
        // In development, show the OTP in alert (remove in production)
        if (__DEV__ && result.otp) {
          Alert.alert('رمز التحقق (للتطوير)', `الرمز هو: ${result.otp}`);
        }
      } else {
        const error = await response.json();
        Alert.alert('خطأ', error.detail || 'فشل في إرسال رمز التحقق');
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ في الشبكة');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      Alert.alert('خطأ', 'يرجى إدخال رمز التحقق كاملاً');
      return;
    }

    try {
      setLoading(true);
      
      if (isRegistration) {
        // Complete registration with OTP verification
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...registrationData,
            phone: phoneNumber,
            otp: otpCode,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          await AsyncStorage.setItem('auth_token', result.access_token);
          await AsyncStorage.setItem('user_data', JSON.stringify(result.user));
          onVerificationSuccess(result);
          onClose();
        } else {
          const error = await response.json();
          Alert.alert('خطأ', error.detail || 'رمز التحقق غير صحيح');
        }
      } else {
        // Login with OTP verification
        const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: phoneNumber,
            otp: otpCode,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          await AsyncStorage.setItem('auth_token', result.access_token);
          await AsyncStorage.setItem('user_data', JSON.stringify(result.user));
          onVerificationSuccess(result);
          onClose();
        } else {
          const error = await response.json();
          Alert.alert('خطأ', error.detail || 'رمز التحقق غير صحيح');
        }
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ في الشبكة');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits are entered
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      setTimeout(() => verifyOTP(), 500);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const resendOTP = () => {
    if (canResend) {
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      sendOTP();
      startCountdown();
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Format Iraqi phone numbers
    if (phone.startsWith('+964')) {
      return phone.replace('+964', '0');
    }
    return phone;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تأكيد رقم الهاتف</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.illustrationContainer}>
            <View style={styles.phoneIcon}>
              <Ionicons name="phone-portrait" size={48} color={Colors.primary} />
            </View>
          </View>

          <Text style={styles.title}>
            {isRegistration ? 'تأكيد التسجيل' : 'تسجيل الدخول'}
          </Text>
          
          <Text style={styles.description}>
            تم إرسال رمز التحقق إلى رقم الهاتف
          </Text>
          
          <Text style={styles.phoneNumber}>
            {formatPhoneNumber(phoneNumber)}
          </Text>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.otpInput,
                  digit && styles.otpInputFilled,
                ]}
                value={digit}
                onChangeText={(text) => handleOtpChange(text.replace(/[^0-9]/g, ''), index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="numeric"
                maxLength={1}
                textAlign="center"
                autoFocus={index === 0}
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (loading || otp.join('').length !== 6) && styles.verifyButtonDisabled,
            ]}
            onPress={verifyOTP}
            disabled={loading || otp.join('').length !== 6}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.verifyButtonText}>تأكيد الرمز</Text>
            )}
          </TouchableOpacity>

          {/* Resend Timer */}
          <View style={styles.resendContainer}>
            {!canResend ? (
              <Text style={styles.timerText}>
                إعادة الإرسال خلال {countdown} ثانية
              </Text>
            ) : (
              <TouchableOpacity onPress={resendOTP} style={styles.resendButton}>
                <Text style={styles.resendButtonText}>إعادة إرسال الرمز</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Ionicons name="information-circle" size={16} color={Colors.mediumGray} />
            <Text style={styles.helpText}>
              لم تستلم الرمز؟ تأكد من رقم الهاتف أو جرب الإرسال مرة أخرى
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray,
    ...Shadows.small,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    alignItems: 'center',
  },
  illustrationContainer: {
    marginBottom: Spacing.xl,
  },
  phoneIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.sectionBackground,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  phoneNumber: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: Colors.gray,
    borderRadius: BorderRadius.md,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    backgroundColor: Colors.lightGray,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.sectionBackground,
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    minWidth: 200,
    alignItems: 'center',
    ...Shadows.medium,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  timerText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  resendButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  resendButtonText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.sectionBackground,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.info,
  },
  helpText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    flex: 1,
    lineHeight: 20,
  },
});

export default OTPVerification;