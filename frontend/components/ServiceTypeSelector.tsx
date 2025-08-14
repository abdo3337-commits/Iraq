import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from './styles';

const { width } = Dimensions.get('window');

interface ServiceType {
  id: string;
  type: 'immediate' | 'hourly' | 'task';
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
  pricing: {
    base: number;
    per_km?: number;
    per_hour?: number;
    currency: string;
  };
  estimatedTime: string;
}

interface ServiceTypeSelectorProps {
  onServiceSelect: (serviceType: ServiceType) => void;
  selectedService?: ServiceType | null;
}

const SERVICE_TYPES: ServiceType[] = [
  {
    id: 'immediate',
    type: 'immediate',
    title: 'رحلة فورية',
    subtitle: 'وصول سريع',
    description: 'احجز رحلة فورية إلى وجهتك المحددة',
    icon: 'flash',
    color: Colors.success,
    features: [
      'وصول السائق خلال 5-10 دقائق',
      'تحديد الوجهة مسبقاً',
      'تتبع مباشر للرحلة',
      'دفع نقدي أو إلكتروني'
    ],
    pricing: {
      base: 1500,
      per_km: 500,
      currency: 'IQD'
    },
    estimatedTime: '5-10 دقائق'
  },
  {
    id: 'hourly',
    type: 'hourly',
    title: 'رحلة بالساعة',
    subtitle: 'مرونة كاملة',
    description: 'احجز السائق لساعات محددة لمهام متعددة',
    icon: 'time',
    color: Colors.primary,
    features: [
      'مرونة في الوجهات المتعددة',
      'انتظار السائق حسب الحاجة',
      'مثالي للتسوق والمهام',
      'توفير في التكلفة للرحلات الطويلة'
    ],
    pricing: {
      base: 3000,
      per_hour: 8000,
      currency: 'IQD'
    },
    estimatedTime: 'حسب الطلب'
  },
  {
    id: 'task',
    type: 'task',
    title: 'تنفيذ مهمة',
    subtitle: 'خدمة شاملة',
    description: 'السائق ينفذ مهامك نيابة عنك',
    icon: 'checkmark-done-circle',
    color: Colors.delivery,
    features: [
      'تنفيذ المهام نيابة عنك',
      'توصيل المشتريات',
      'دفع الفواتير',
      'خدمة التوصيل السريع'
    ],
    pricing: {
      base: 2000,
      per_km: 300,
      currency: 'IQD'
    },
    estimatedTime: '15-30 دقيقة'
  }
];

const ServiceTypeSelector: React.FC<ServiceTypeSelectorProps> = ({
  onServiceSelect,
  selectedService,
}) => {
  const [expandedService, setExpandedService] = useState<string | null>(null);

  const formatPrice = (pricing: ServiceType['pricing']) => {
    const { base, per_km, per_hour, currency } = pricing;
    let priceText = `${base.toLocaleString()} ${currency === 'IQD' ? 'د.ع' : currency}`;
    
    if (per_km) {
      priceText += ` + ${per_km} د.ع/كم`;
    }
    if (per_hour) {
      priceText += ` + ${per_hour.toLocaleString()} د.ع/ساعة`;
    }
    
    return priceText;
  };

  const handleServicePress = (service: ServiceType) => {
    if (expandedService === service.id) {
      onServiceSelect(service);
    } else {
      setExpandedService(service.id);
    }
  };

  const renderServiceCard = (service: ServiceType) => {
    const isExpanded = expandedService === service.id;
    const isSelected = selectedService?.id === service.id;

    return (
      <TouchableOpacity
        key={service.id}
        style={[
          styles.serviceCard,
          isExpanded && styles.serviceCardExpanded,
          isSelected && styles.serviceCardSelected,
        ]}
        onPress={() => handleServicePress(service)}
        activeOpacity={0.9}
      >
        {/* Service Header */}
        <View style={styles.serviceHeader}>
          <View style={styles.serviceIconContainer}>
            <View style={[styles.serviceIcon, { backgroundColor: `${service.color}20` }]}>
              <Ionicons name={service.icon as any} size={28} color={service.color} />
            </View>
          </View>
          
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceTitle}>{service.title}</Text>
            <Text style={[styles.serviceSubtitle, { color: service.color }]}>
              {service.subtitle}
            </Text>
            <Text style={styles.serviceDescription}>{service.description}</Text>
          </View>

          <View style={styles.serviceMeta}>
            <Text style={styles.estimatedTime}>{service.estimatedTime}</Text>
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={Colors.mediumGray} 
            />
          </View>
        </View>

        {/* Expanded Content */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Features */}
            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>المميزات:</Text>
              {service.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={service.color} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            {/* Pricing */}
            <View style={styles.pricingContainer}>
              <Text style={styles.pricingTitle}>التسعير:</Text>
              <Text style={styles.pricingText}>{formatPrice(service.pricing)}</Text>
            </View>

            {/* Select Button */}
            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: service.color }]}
              onPress={() => onServiceSelect(service)}
            >
              <Text style={styles.selectButtonText}>اختيار هذه الخدمة</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Info Bar */}
        {!isExpanded && (
          <View style={styles.quickInfoBar}>
            <View style={styles.quickInfoItem}>
              <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.quickInfoText}>{service.estimatedTime}</Text>
            </View>
            <View style={styles.quickInfoItem}>
              <Ionicons name="cash-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.quickInfoText}>من {service.pricing.base.toLocaleString()} د.ع</Text>
            </View>
            <TouchableOpacity style={styles.quickSelectButton}>
              <Text style={styles.quickSelectText}>اختيار</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>اختر نوع الخدمة</Text>
        <Text style={styles.headerSubtitle}>اضغط على الخدمة لمعرفة التفاصيل</Text>
      </View>

      <ScrollView 
        style={styles.servicesContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.servicesContent}
      >
        {SERVICE_TYPES.map(renderServiceCard)}

        {/* Help Section */}
        <View style={styles.helpSection}>
          <View style={styles.helpHeader}>
            <Ionicons name="help-circle" size={20} color={Colors.info} />
            <Text style={styles.helpTitle}>تحتاج مساعدة؟</Text>
          </View>
          <Text style={styles.helpText}>
            يمكنك تغيير نوع الخدمة في أي وقت قبل تأكيد الحجز
          </Text>
          <TouchableOpacity style={styles.helpButton}>
            <Text style={styles.helpButtonText}>اتصل بخدمة العملاء</Text>
            <Ionicons name="call" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  servicesContainer: {
    flex: 1,
  },
  servicesContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  serviceCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.lightGray,
    ...Shadows.medium,
  },
  serviceCardExpanded: {
    borderColor: Colors.primary,
    transform: [{ scale: 1.02 }],
  },
  serviceCardSelected: {
    borderColor: Colors.success,
    backgroundColor: Colors.sectionBackground,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  serviceIconContainer: {
    marginRight: Spacing.md,
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  serviceTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs / 2,
  },
  serviceSubtitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  serviceDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  serviceMeta: {
    alignItems: 'flex-end',
  },
  estimatedTime: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  quickInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickInfoText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  quickSelectButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  quickSelectText: {
    fontSize: FontSizes.sm,
    color: Colors.white,
    fontWeight: 'bold',
  },
  expandedContent: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  featuresContainer: {
    marginBottom: Spacing.lg,
  },
  featuresTitle: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  featureText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  pricingContainer: {
    backgroundColor: Colors.sectionBackground,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  pricingTitle: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  pricingText: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    ...Shadows.medium,
  },
  selectButtonText: {
    fontSize: FontSizes.md,
    color: Colors.white,
    fontWeight: 'bold',
  },
  helpSection: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.info,
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  helpTitle: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  helpText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.sectionBackground,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  helpButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default ServiceTypeSelector;
export type { ServiceType };