import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from './styles';

interface RideHistory {
  id: string;
  type: 'ride' | 'delivery';
  status: 'completed' | 'cancelled' | 'in_progress';
  pickup_location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  destination_location?: {
    address: string;
    latitude: number;
    longitude: number;
  };
  driver_info?: {
    name: string;
    phone: string;
    rating: number;
  };
  passenger_info?: {
    name: string;
    phone: string;
    rating: number;
  };
  vehicle_type: 'standard' | 'vip';
  ride_type: 'immediate' | 'scheduled' | 'open_ride';
  payment_method: 'cash' | 'zen_cash' | 'card';
  total_cost: number;
  duration_minutes?: number;
  distance_km?: number;
  rating_given?: number;
  rating_received?: number;
  created_at: string;
  completed_at?: string;
  package_info?: {
    description: string;
    size: 'small' | 'medium' | 'large';
    weight_kg?: number;
  };
  tracking_code?: string;
}

interface HistoryScreenProps {
  visible: boolean;
  onClose: () => void;
  userType: 'passenger' | 'driver';
}

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://aburide.preview.emergentagent.com';

const HistoryScreen: React.FC<HistoryScreenProps> = ({
  visible,
  onClose,
  userType,
}) => {
  const [history, setHistory] = useState<RideHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<RideHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'ride' | 'delivery'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [selectedItem, setSelectedItem] = useState<RideHistory | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      loadHistory();
    }
  }, [visible]);

  useEffect(() => {
    applyFilters();
  }, [history, selectedFilter, selectedStatus]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/api/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const historyData = await response.json();
        setHistory(historyData);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const applyFilters = () => {
    let filtered = history;

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(item => item.type === selectedFilter);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.status === selectedStatus);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setFilteredHistory(filtered);
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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'completed': 'مكتمل',
      'cancelled': 'ملغي',
      'in_progress': 'قيد التنفيذ'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      'completed': Colors.success,
      'cancelled': Colors.error,
      'in_progress': Colors.warning
    };
    return colorMap[status] || Colors.mediumGray;
  };

  const getTypeText = (type: string) => {
    return type === 'ride' ? 'رحلة' : 'توصيل';
  };

  const getTypeIcon = (type: string) => {
    return type === 'ride' ? 'car' : 'cube';
  };

  const getRideTypeText = (rideType: string) => {
    const typeMap: { [key: string]: string } = {
      'immediate': 'فوري',
      'scheduled': 'مجدول',
      'open_ride': 'مفتوح'
    };
    return typeMap[rideType] || rideType;
  };

  const getVehicleTypeText = (vehicleType: string) => {
    return vehicleType === 'vip' ? 'VIP' : 'عادي';
  };

  const getPaymentMethodText = (method: string) => {
    const methodMap: { [key: string]: string } = {
      'cash': 'نقدي',
      'zen_cash': 'زين كاش',
      'card': 'بطاقة'
    };
    return methodMap[method] || method;
  };

  const renderStarsRating = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={14}
          color={Colors.primary}
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const showDetails = (item: RideHistory) => {
    setSelectedItem(item);
    setDetailsModalVisible(true);
  };

  const renderHistoryItem = ({ item }: { item: RideHistory }) => (
    <TouchableOpacity style={styles.historyItem} onPress={() => showDetails(item)}>
      <View style={styles.itemHeader}>
        <View style={styles.itemTitleRow}>
          <View style={styles.typeContainer}>
            <Ionicons 
              name={getTypeIcon(item.type) as any} 
              size={20} 
              color={Colors.primary} 
            />
            <Text style={styles.itemType}>{getTypeText(item.type)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
        <Text style={styles.itemDate}>{formatDate(item.created_at)}</Text>
      </View>

      <View style={styles.itemContent}>
        <View style={styles.locationInfo}>
          <View style={styles.locationRow}>
            <Ionicons name="radio-button-on" size={12} color={Colors.pickup} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.pickup_location.address}
            </Text>
          </View>
          {item.destination_location && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={12} color={Colors.destination} />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.destination_location.address}
              </Text>
            </View>
          )}
          {item.type === 'delivery' && item.package_info && (
            <View style={styles.packageInfo}>
              <MaterialIcons name="inventory" size={12} color={Colors.delivery} />
              <Text style={styles.packageText} numberOfLines={1}>
                {item.package_info.description} ({item.package_info.size})
              </Text>
            </View>
          )}
        </View>

        <View style={styles.itemDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>النوع:</Text>
            <Text style={styles.detailValue}>
              {getRideTypeText(item.ride_type)} - {getVehicleTypeText(item.vehicle_type)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>الدفع:</Text>
            <Text style={styles.detailValue}>{getPaymentMethodText(item.payment_method)}</Text>
          </View>
          {item.duration_minutes && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>المدة:</Text>
              <Text style={styles.detailValue}>{item.duration_minutes} دقيقة</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.itemFooter}>
        <Text style={styles.totalCost}>{formatCurrency(item.total_cost)}</Text>
        {userType === 'passenger' && item.driver_info && item.rating_given && (
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingLabel}>تقييمك:</Text>
            {renderStarsRating(item.rating_given)}
          </View>
        )}
        {userType === 'driver' && item.rating_received && (
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingLabel}>تقييم العميل:</Text>
            {renderStarsRating(item.rating_received)}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterGroupTitle}>النوع:</Text>
          {['all', 'ride', 'delivery'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                selectedFilter === filter && styles.filterButtonActive
              ]}
              onPress={() => setSelectedFilter(filter as any)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedFilter === filter && styles.filterButtonTextActive
              ]}>
                {filter === 'all' ? 'الكل' : getTypeText(filter)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterGroupTitle}>الحالة:</Text>
          {['all', 'completed', 'cancelled'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                selectedStatus === status && styles.filterButtonActive
              ]}
              onPress={() => setSelectedStatus(status as any)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedStatus === status && styles.filterButtonTextActive
              ]}>
                {status === 'all' ? 'الكل' : getStatusText(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderDetailsModal = () => {
    if (!selectedItem) return null;

    return (
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.detailsContainer}>
          <View style={styles.detailsHeader}>
            <TouchableOpacity
              onPress={() => setDetailsModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.detailsTitle}>تفاصيل {getTypeText(selectedItem.type)}</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.detailsContent}>
            {/* Header Info */}
            <View style={styles.detailsSection}>
              <View style={styles.detailsHeader2}>
                <View style={styles.typeContainer}>
                  <Ionicons 
                    name={getTypeIcon(selectedItem.type) as any} 
                    size={24} 
                    color={Colors.primary} 
                  />
                  <Text style={styles.detailsItemType}>
                    {getTypeText(selectedItem.type)} - {getRideTypeText(selectedItem.ride_type)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedItem.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(selectedItem.status)}</Text>
                </View>
              </View>
              <Text style={styles.detailsDate}>{formatDate(selectedItem.created_at)}</Text>
              {selectedItem.completed_at && (
                <Text style={styles.detailsDate}>اكتمل: {formatDate(selectedItem.completed_at)}</Text>
              )}
            </View>

            {/* Location Details */}
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>تفاصيل الرحلة</Text>
              <View style={styles.locationDetailRow}>
                <Ionicons name="radio-button-on" size={16} color={Colors.pickup} />
                <View style={styles.locationDetailInfo}>
                  <Text style={styles.locationDetailLabel}>نقطة الانطلاق</Text>
                  <Text style={styles.locationDetailAddress}>{selectedItem.pickup_location.address}</Text>
                </View>
              </View>
              
              {selectedItem.destination_location && (
                <View style={styles.locationDetailRow}>
                  <Ionicons name="location" size={16} color={Colors.destination} />
                  <View style={styles.locationDetailInfo}>
                    <Text style={styles.locationDetailLabel}>الوجهة</Text>
                    <Text style={styles.locationDetailAddress}>{selectedItem.destination_location.address}</Text>
                  </View>
                </View>
              )}

              {selectedItem.distance_km && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>المسافة:</Text>
                  <Text style={styles.infoValue}>{selectedItem.distance_km.toFixed(1)} كم</Text>
                </View>
              )}

              {selectedItem.duration_minutes && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>المدة:</Text>
                  <Text style={styles.infoValue}>{selectedItem.duration_minutes} دقيقة</Text>
                </View>
              )}
            </View>

            {/* Package Info for Deliveries */}
            {selectedItem.type === 'delivery' && selectedItem.package_info && (
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>تفاصيل الطرد</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>الوصف:</Text>
                  <Text style={styles.infoValue}>{selectedItem.package_info.description}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>الحجم:</Text>
                  <Text style={styles.infoValue}>{selectedItem.package_info.size}</Text>
                </View>
                {selectedItem.tracking_code && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>كود التتبع:</Text>
                    <Text style={styles.infoValue}>{selectedItem.tracking_code}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Payment Info */}
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>تفاصيل الدفع</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>طريقة الدفع:</Text>
                <Text style={styles.infoValue}>{getPaymentMethodText(selectedItem.payment_method)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>المبلغ الإجمالي:</Text>
                <Text style={styles.totalCostDetail}>{formatCurrency(selectedItem.total_cost)}</Text>
              </View>
            </View>

            {/* Driver/Passenger Info */}
            {userType === 'passenger' && selectedItem.driver_info && (
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>معلومات السائق</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>الاسم:</Text>
                  <Text style={styles.infoValue}>{selectedItem.driver_info.name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>رقم الهاتف:</Text>
                  <Text style={styles.infoValue}>{selectedItem.driver_info.phone}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>التقييم:</Text>
                  <View style={styles.ratingRow}>
                    <Text style={styles.ratingValue}>{selectedItem.driver_info.rating.toFixed(1)}</Text>
                    {renderStarsRating(Math.round(selectedItem.driver_info.rating))}
                  </View>
                </View>
              </View>
            )}

            {userType === 'driver' && selectedItem.passenger_info && (
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>معلومات العميل</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>الاسم:</Text>
                  <Text style={styles.infoValue}>{selectedItem.passenger_info.name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>رقم الهاتف:</Text>
                  <Text style={styles.infoValue}>{selectedItem.passenger_info.phone}</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>سجل الرحلات</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        {renderFilters()}

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>جارٍ تحميل السجل...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredHistory}
            renderItem={renderHistoryItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
                tintColor={Colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="history" size={48} color={Colors.mediumGray} />
                <Text style={styles.emptyText}>لا توجد عناصر في السجل</Text>
                <Text style={styles.emptySubtext}>
                  {selectedFilter === 'all' ? 'ابدأ أول رحلة أو توصيل الآن!' 
                    : `لا توجد ${getTypeText(selectedFilter === 'ride' ? 'ride' : 'delivery')} محفوظة`}
                </Text>
              </View>
            }
          />
        )}

        {/* Details Modal */}
        {renderDetailsModal()}
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
  filtersContainer: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  filterGroupTitle: {
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginRight: Spacing.sm,
  },
  filterButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.gray,
    marginRight: Spacing.xs,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  filterButtonTextActive: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: Spacing.md,
  },
  historyItem: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray,
    ...Shadows.small,
  },
  itemHeader: {
    marginBottom: Spacing.sm,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemType: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSizes.xs,
    color: Colors.white,
    fontWeight: 'bold',
  },
  itemDate: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  itemContent: {
    marginBottom: Spacing.sm,
  },
  locationInfo: {
    marginBottom: Spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs / 2,
  },
  locationText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  packageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  packageText: {
    fontSize: FontSizes.sm,
    color: Colors.delivery,
    marginLeft: Spacing.sm,
    flex: 1,
    fontStyle: 'italic',
  },
  itemDetails: {
    gap: Spacing.xs / 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: FontSizes.xs,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  totalCost: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
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
  
  // Details Modal Styles
  detailsContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  detailsHeader: {
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
  detailsTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  placeholder: {
    width: 32,
  },
  detailsContent: {
    flex: 1,
  },
  detailsSection: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    marginBottom: 0,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadows.small,
  },
  detailsHeader2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  detailsItemType: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  detailsDate: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs / 2,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  locationDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  locationDetailInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  locationDetailLabel: {
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs / 2,
  },
  locationDetailAddress: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  infoLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  totalCostDetail: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingValue: {
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.primary,
  },
});

export default HistoryScreen;