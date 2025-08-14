import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from './styles';

interface PaymentMethod {
  id: string;
  type: 'cash' | 'zen_cash' | 'card';
  name: string;
  icon: string;
  description: string;
  available: boolean;
}

interface PaymentSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onPaymentSelect: (paymentMethod: PaymentMethod, cardDetails?: any) => void;
  amount: number;
  serviceType: 'ride' | 'delivery';
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'cash',
    type: 'cash',
    name: 'دفع نقدي',
    icon: 'cash',
    description: 'الدفع نقداً للسائق عند الوصول',
    available: true,
  },
  {
    id: 'zen_cash',
    type: 'zen_cash',
    name: 'زين كاش',
    icon: 'phone-portrait',
    description: 'الدفع عبر محفظة زين كاش الإلكترونية',
    available: true,
  },
  {
    id: 'visa',
    type: 'card',
    name: 'فيزا',
    icon: 'card',
    description: 'الدفع بالبطاقة الائتمانية فيزا',
    available: true,
  },
  {
    id: 'mastercard',
    type: 'card',
    name: 'ماستركارد',
    icon: 'card',
    description: 'الدفع بالبطاقة الائتمانية ماستركارد',
    available: true,
  },
];

const PaymentSelectionModal: React.FC<PaymentSelectionModalProps> = ({
  visible,
  onClose,
  onPaymentSelect,
  amount,
  serviceType,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showZenCashForm, setShowZenCashForm] = useState(false);
  
  // Card form states
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  
  // Zen Cash form states
  const [zenCashPhone, setZenCashPhone] = useState('');
  const [zenCashPin, setZenCashPin] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IQ', {
      style: 'currency',
      currency: 'IQD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '').replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    
    if (method.type === 'cash') {
      onPaymentSelect(method);
      onClose();
    } else if (method.type === 'zen_cash') {
      setShowZenCashForm(true);
    } else if (method.type === 'card') {
      setShowCardForm(true);
    }
  };

  const handleCardPayment = () => {
    if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
      Alert.alert('خطأ', 'يرجى ملء جميع حقول البطاقة الائتمانية');
      return;
    }

    if (cardNumber.replace(/\s/g, '').length < 16) {
      Alert.alert('خطأ', 'رقم البطاقة غير صحيح');
      return;
    }

    const cardDetails = {
      number: cardNumber.replace(/\s/g, ''),
      expiry: expiryDate,
      cvv,
      holder_name: cardholderName,
      save_card: saveCard,
    };

    onPaymentSelect(selectedMethod!, cardDetails);
    resetForms();
    onClose();
  };

  const handleZenCashPayment = () => {
    if (!zenCashPhone || !zenCashPin) {
      Alert.alert('خطأ', 'يرجى إدخال رقم الهاتف ورقم التعريف الشخصي');
      return;
    }

    if (zenCashPhone.length < 11) {
      Alert.alert('خطأ', 'رقم الهاتف غير صحيح');
      return;
    }

    const zenCashDetails = {
      phone: zenCashPhone,
      pin: zenCashPin,
    };

    onPaymentSelect(selectedMethod!, zenCashDetails);
    resetForms();
    onClose();
  };

  const resetForms = () => {
    setSelectedMethod(null);
    setShowCardForm(false);
    setShowZenCashForm(false);
    setCardNumber('');
    setExpiryDate('');
    setCvv('');
    setCardholderName('');
    setSaveCard(false);
    setZenCashPhone('');
    setZenCashPin('');
  };

  const handleClose = () => {
    resetForms();
    onClose();
  };

  if (showCardForm && selectedMethod) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowCardForm(false)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>بيانات البطاقة الائتمانية</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>المبلغ المطلوب</Text>
              <Text style={styles.amountValue}>{formatCurrency(amount)}</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>رقم البطاقة *</Text>
                <TextInput
                  style={styles.textInput}
                  value={cardNumber}
                  onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                  placeholder="1234 5678 9012 3456"
                  keyboardType="numeric"
                  maxLength={19}
                />
              </View>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>تاريخ الانتهاء *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={expiryDate}
                    onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                    placeholder="MM/YY"
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>CVV *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={cvv}
                    onChangeText={setCvv}
                    placeholder="123"
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>اسم حامل البطاقة *</Text>
                <TextInput
                  style={styles.textInput}
                  value={cardholderName}
                  onChangeText={setCardholderName}
                  placeholder="الاسم كما هو مكتوب على البطاقة"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>حفظ البطاقة للمرات القادمة</Text>
                <Switch
                  value={saveCard}
                  onValueChange={setSaveCard}
                  thumbColor={saveCard ? Colors.primary : Colors.mediumGray}
                  trackColor={{ false: Colors.gray, true: Colors.primaryLight }}
                />
              </View>

              <TouchableOpacity style={styles.payButton} onPress={handleCardPayment}>
                <Ionicons name="card" size={20} color={Colors.white} style={styles.payButtonIcon} />
                <Text style={styles.payButtonText}>ادفع {formatCurrency(amount)}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  if (showZenCashForm && selectedMethod) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowZenCashForm(false)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>دفع زين كاش</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>المبلغ المطلوب</Text>
              <Text style={styles.amountValue}>{formatCurrency(amount)}</Text>
            </View>

            <View style={styles.zenCashInfo}>
              <MaterialIcons name="info" size={24} color={Colors.info} />
              <Text style={styles.zenCashInfoText}>
                سيتم خصم المبلغ من محفظة زين كاش الخاصة بك
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>رقم الهاتف *</Text>
                <TextInput
                  style={styles.textInput}
                  value={zenCashPhone}
                  onChangeText={setZenCashPhone}
                  placeholder="07xxxxxxxxx"
                  keyboardType="phone-pad"
                  maxLength={11}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>رقم التعريف الشخصي *</Text>
                <TextInput
                  style={styles.textInput}
                  value={zenCashPin}
                  onChangeText={setZenCashPin}
                  placeholder="ادخل رقم التعريف الشخصي"
                  keyboardType="numeric"
                  maxLength={6}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity style={styles.payButton} onPress={handleZenCashPayment}>
                <Ionicons name="phone-portrait" size={20} color={Colors.white} style={styles.payButtonIcon} />
                <Text style={styles.payButtonText}>ادفع {formatCurrency(amount)}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <Text style={styles.title}>اختر طريقة الدفع</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>
              {serviceType === 'ride' ? 'تكلفة الرحلة' : 'تكلفة التوصيل'}
            </Text>
            <Text style={styles.amountValue}>{formatCurrency(amount)}</Text>
          </View>

          <View style={styles.methodsList}>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodItem,
                  !method.available && styles.methodItemDisabled,
                ]}
                onPress={() => method.available && handleMethodSelect(method)}
                disabled={!method.available}
              >
                <View style={styles.methodIcon}>
                  <Ionicons 
                    name={method.icon as any} 
                    size={24} 
                    color={method.available ? Colors.primary : Colors.mediumGray} 
                  />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={[
                    styles.methodName,
                    !method.available && styles.methodNameDisabled,
                  ]}>
                    {method.name}
                  </Text>
                  <Text style={[
                    styles.methodDescription,
                    !method.available && styles.methodDescriptionDisabled,
                  ]}>
                    {method.description}
                  </Text>
                </View>
                {method.available && (
                  <Ionicons name="chevron-forward" size={20} color={Colors.mediumGray} />
                )}
                {!method.available && (
                  <Text style={styles.comingSoon}>قريباً</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.securityInfo}>
            <MaterialIcons name="security" size={20} color={Colors.success} />
            <Text style={styles.securityText}>
              جميع المعاملات محمية بأحدث تقنيات التشفير
            </Text>
          </View>
        </ScrollView>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  backButton: {
    padding: Spacing.xs,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  amountCard: {
    backgroundColor: Colors.primary,
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    ...Shadows.medium,
  },
  amountLabel: {
    fontSize: FontSizes.md,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  amountValue: {
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
    color: Colors.white,
  },
  methodsList: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray,
    ...Shadows.small,
  },
  methodItemDisabled: {
    opacity: 0.6,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.sectionBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs / 2,
  },
  methodNameDisabled: {
    color: Colors.mediumGray,
  },
  methodDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  methodDescriptionDisabled: {
    color: Colors.mediumGray,
  },
  comingSoon: {
    fontSize: FontSizes.xs,
    color: Colors.mediumGray,
    fontStyle: 'italic',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    margin: Spacing.md,
    backgroundColor: Colors.sectionBackground,
    borderRadius: BorderRadius.md,
  },
  securityText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    flex: 1,
    textAlign: 'center',
  },
  form: {
    padding: Spacing.md,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.gray,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    fontSize: FontSizes.md,
    backgroundColor: Colors.lightGray,
    color: Colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  switchLabel: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    flex: 1,
  },
  payButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    ...Shadows.medium,
  },
  payButtonIcon: {
    marginRight: Spacing.sm,
  },
  payButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  zenCashInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.sectionBackground,
    padding: Spacing.md,
    margin: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
  },
  zenCashInfoText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
});

export default PaymentSelectionModal;