import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from './styles';

const { width } = Dimensions.get('window');

interface EarningsData {
  today: DayEarnings;
  thisWeek: WeekEarnings;
  thisMonth: MonthEarnings;
  recentRides: RideEarning[];
  payoutHistory: PayoutRecord[];
  totalBalance: number;
  pendingBalance: number;
  availableBalance: number;
}

interface DayEarnings {
  date: string;
  totalEarnings: number;
  totalRides: number;
  averageRide: number;
  onlineHours: number;
  tips: number;
  commission: number;
  netEarnings: number;
}

interface WeekEarnings {
  weekStart: string;
  weekEnd: string;
  totalEarnings: number;
  totalRides: number;
  totalHours: number;
  dailyEarnings: DayEarnings[];
  bestDay: {
    date: string;
    earnings: number;
  };
}

interface MonthEarnings {
  month: number;
  year: number;
  totalEarnings: number;
  totalRides: number;
  weeklyBreakdown: WeekEarnings[];
}

interface RideEarning {
  id: string;
  rideType: 'ride' | 'delivery';
  completedAt: string;
  pickupLocation: string;
  destinationLocation: string;
  distance: number;
  duration: number;
  fare: number;
  tip: number;
  commission: number;
  netEarning: number;
  paymentMethod: string;
}

interface PayoutRecord {
  id: string;
  date: string;
  amount: number;
  method: 'bank_transfer' | 'mobile_wallet' | 'cash';
  status: 'pending' | 'completed' | 'failed';
  transactionId?: string;
}

interface EarningsScreenProps {
  visible: boolean;
  onClose: () => void;
}

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://aburide.preview.emergentagent.com';

const EarningsScreen: React.FC<EarningsScreenProps> = ({ visible, onClose }) => {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [payoutModalVisible, setPayoutModalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      loadEarnings();
    }
  }, [visible]);

  const loadEarnings = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/api/drivers/earnings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEarnings(data);
      }
    } catch (error) {
      console.error('Error loading earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEarnings();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IQ', {
      style: 'currency',
      currency: 'IQD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-IQ', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const requestPayout = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/api/drivers/request-payout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setPayoutModalVisible(false);
        await loadEarnings();
        alert('تم طلب السحب بنجاح. سيتم التحويل خلال 1-3 أيام عمل.');
      }
    } catch (error) {
      alert('حدث خطأ في طلب السحب');
    }
  };

  const renderEarningsOverview = () => {
    if (!earnings) return null;

    const currentData = selectedPeriod === 'today' ? earnings.today :
                       selectedPeriod === 'week' ? earnings.thisWeek :
                       earnings.thisMonth;

    return (
      <View style={styles.overviewContainer}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {[
            { key: 'today', label: 'اليوم' },
            { key: 'week', label: 'الأسبوع' },
            { key: 'month', label: 'الشهر' },
          ].map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodButton,
                selectedPeriod === period.key && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period.key as any)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period.key && styles.periodButtonTextActive,
                ]}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Earnings Card */}
        <View style={styles.mainEarningsCard}>
          <Text style={styles.earningsLabel}>إجمالي الأرباح</Text>
          <Text style={styles.earningsAmount}>
            {formatCurrency(currentData.totalEarnings)}
          </Text>
          <View style={styles.earningsStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentData.totalRides}</Text>
              <Text style={styles.statLabel}>رحلة</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {selectedPeriod === 'today' ? 
                  `${(currentData as DayEarnings).onlineHours}` : 
                  `${(currentData as WeekEarnings).totalHours || 0}`
                }
              </Text>
              <Text style={styles.statLabel}>ساعة</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatCurrency(currentData.totalRides > 0 ? currentData.totalEarnings / currentData.totalRides : 0)}
              </Text>
              <Text style={styles.statLabel}>متوسط الرحلة</Text>
            </View>
          </View>
        </View>

        {/* Balance Cards */}
        <View style={styles.balanceContainer}>
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Ionicons name="wallet" size={20} color={Colors.success} />
              <Text style={styles.balanceLabel}>الرصيد المتاح</Text>
            </View>
            <Text style={styles.balanceAmount}>
              {formatCurrency(earnings.availableBalance)}
            </Text>
          </View>

          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Ionicons name="time" size={20} color={Colors.warning} />
              <Text style={styles.balanceLabel}>في الانتظار</Text>
            </View>
            <Text style={styles.balanceAmount}>
              {formatCurrency(earnings.pendingBalance)}
            </Text>
          </View>
        </View>

        {/* Payout Button */}
        {earnings.availableBalance > 0 && (
          <TouchableOpacity
            style={styles.payoutButton}
            onPress={() => setPayoutModalVisible(true)}
          >
            <Ionicons name="arrow-down-circle" size={20} color={Colors.white} />
            <Text style={styles.payoutButtonText}>
              سحب {formatCurrency(earnings.availableBalance)}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderRecentRides = () => {
    if (!earnings?.recentRides.length) return null;

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>الرحلات الأخيرة</Text>
        {earnings.recentRides.slice(0, 10).map((ride) => (
          <View key={ride.id} style={styles.rideItem}>
            <View style={styles.rideIcon}>
              <Ionicons 
                name={ride.rideType === 'ride' ? 'car' : 'cube'} 
                size={20} 
                color={Colors.primary} 
              />
            </View>
            
            <View style={styles.rideInfo}>
              <Text style={styles.rideLocation} numberOfLines={1}>
                {ride.pickupLocation}
              </Text>
              {ride.destinationLocation && (
                <Text style={styles.rideDestination} numberOfLines={1}>
                  → {ride.destinationLocation}
                </Text>
              )}
              <Text style={styles.rideTime}>
                {formatDate(ride.completedAt)} • {ride.distance.toFixed(1)} كم
              </Text>
            </View>

            <View style={styles.rideEarnings}>
              <Text style={styles.rideAmount}>
                {formatCurrency(ride.netEarning)}
              </Text>
              {ride.tip > 0 && (
                <Text style={styles.rideTip}>
                  + {formatCurrency(ride.tip)} إكرامية
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderPayoutHistory = () => {
    if (!earnings?.payoutHistory.length) return null;

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>سجل المدفوعات</Text>
        {earnings.payoutHistory.slice(0, 5).map((payout) => (
          <View key={payout.id} style={styles.payoutItem}>
            <View style={styles.payoutIcon}>
              <Ionicons 
                name={payout.status === 'completed' ? 'checkmark-circle' : 
                      payout.status === 'pending' ? 'time' : 'close-circle'} 
                size={20} 
                color={payout.status === 'completed' ? Colors.success : 
                       payout.status === 'pending' ? Colors.warning : Colors.error} 
              />
            </View>
            
            <View style={styles.payoutInfo}>
              <Text style={styles.payoutAmount}>
                {formatCurrency(payout.amount)}
              </Text>
              <Text style={styles.payoutDate}>
                {new Date(payout.date).toLocaleDateString('ar-IQ')}
              </Text>
              {payout.transactionId && (
                <Text style={styles.transactionId}>
                  {payout.transactionId}
                </Text>
              )}
            </View>

            <View style={styles.payoutStatus}>
              <Text style={[
                styles.payoutStatusText,
                { color: payout.status === 'completed' ? Colors.success : 
                         payout.status === 'pending' ? Colors.warning : Colors.error }
              ]}>
                {payout.status === 'completed' ? 'مكتمل' :
                 payout.status === 'pending' ? 'معلق' : 'فشل'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderPayoutModal = () => (
    <Modal visible={payoutModalVisible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setPayoutModalVisible(false)}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>طلب سحب الأرباح</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.modalContent}>
          <View style={styles.payoutSummary}>
            <Text style={styles.payoutSummaryTitle}>المبلغ المتاح للسحب</Text>
            <Text style={styles.payoutSummaryAmount}>
              {earnings ? formatCurrency(earnings.availableBalance) : '0'}
            </Text>
          </View>

          <View style={styles.payoutMethods}>
            <Text style={styles.payoutMethodsTitle}>طريقة الاستلام</Text>
            
            <TouchableOpacity style={styles.payoutMethod}>
              <Ionicons name="card" size={24} color={Colors.primary} />
              <View style={styles.payoutMethodInfo}>
                <Text style={styles.payoutMethodName}>تحويل بنكي</Text>
                <Text style={styles.payoutMethodDesc}>1-3 أيام عمل</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.mediumGray} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.payoutMethod}>
              <Ionicons name="phone-portrait" size={24} color={Colors.primary} />
              <View style={styles.payoutMethodInfo}>
                <Text style={styles.payoutMethodName}>محفظة إلكترونية</Text>
                <Text style={styles.payoutMethodDesc}>فوري</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.mediumGray} />
            </TouchableOpacity>
          </View>

          <View style={styles.payoutNotes}>
            <Ionicons name="information-circle" size={16} color={Colors.info} />
            <Text style={styles.payoutNotesText}>
              سيتم خصم 2% كرسوم تحويل. الحد الأدنى للسحب 10,000 د.ع
            </Text>
          </View>

          <TouchableOpacity style={styles.confirmPayoutButton} onPress={requestPayout}>
            <Text style={styles.confirmPayoutButtonText}>تأكيد طلب السحب</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  if (loading && !earnings) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>جارٍ تحميل الأرباح...</Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>الأرباح</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          {renderEarningsOverview()}
          {renderRecentRides()}
          {renderPayoutHistory()}
        </ScrollView>

        {renderPayoutModal()}
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
  refreshButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  
  // Overview Styles
  overviewContainer: {
    padding: Spacing.lg,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    marginBottom: Spacing.lg,
    ...Shadows.small,
  },
  periodButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
  },
  periodButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.textSecondary,
  },
  periodButtonTextActive: {
    color: Colors.white,
  },
  mainEarningsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  earningsLabel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.lg,
  },
  earningsStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs / 2,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.lightGray,
  },
  balanceContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.small,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  balanceLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  balanceAmount: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  payoutButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    ...Shadows.medium,
  },
  payoutButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },

  // Sections
  sectionContainer: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Shadows.small,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  // Recent Rides
  rideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  rideIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.sectionBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  rideInfo: {
    flex: 1,
  },
  rideLocation: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  rideDestination: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  rideTime: {
    fontSize: FontSizes.xs,
    color: Colors.mediumGray,
  },
  rideEarnings: {
    alignItems: 'flex-end',
  },
  rideAmount: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.success,
  },
  rideTip: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },

  // Payout History
  payoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  payoutIcon: {
    marginRight: Spacing.sm,
  },
  payoutInfo: {
    flex: 1,
  },
  payoutAmount: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  payoutDate: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  transactionId: {
    fontSize: FontSizes.xs,
    color: Colors.mediumGray,
  },
  payoutStatus: {
    alignItems: 'flex-end',
  },
  payoutStatusText: {
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
  },

  // Payout Modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  payoutSummary: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.small,
  },
  payoutSummaryTitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  payoutSummaryAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  payoutMethods: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.small,
  },
  payoutMethodsTitle: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  payoutMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  payoutMethodInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  payoutMethodName: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  payoutMethodDesc: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  payoutNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.sectionBackground,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xl,
  },
  payoutNotesText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    flex: 1,
    lineHeight: 20,
  },
  confirmPayoutButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    ...Shadows.medium,
  },
  confirmPayoutButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
});

export default EarningsScreen;
export type { EarningsData, RideEarning, PayoutRecord };