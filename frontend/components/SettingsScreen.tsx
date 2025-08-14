import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from './styles';

interface SettingsScreenProps {
  visible: boolean;
  onClose: () => void;
  user: any;
  onLogout: () => void;
}

interface AppSettings {
  notifications: {
    push_enabled: boolean;
    sound_enabled: boolean;
    vibration_enabled: boolean;
    ride_updates: boolean;
    delivery_updates: boolean;
    promotional: boolean;
  };
  privacy: {
    location_sharing: boolean;
    data_collection: boolean;
    analytics: boolean;
  };
  app: {
    language: 'ar' | 'en';
    theme: 'light' | 'dark' | 'auto';
    map_type: 'standard' | 'satellite' | 'hybrid';
    distance_unit: 'km' | 'miles';
  };
  driver?: {
    auto_accept: boolean;
    max_distance_km: number;
    working_hours: {
      start: string;
      end: string;
    };
  };
}

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://aburide.preview.emergentagent.com';

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  visible,
  onClose,
  user,
  onLogout,
}) => {
  const [settings, setSettings] = useState<AppSettings>({
    notifications: {
      push_enabled: true,
      sound_enabled: true,
      vibration_enabled: true,
      ride_updates: true,
      delivery_updates: true,
      promotional: false,
    },
    privacy: {
      location_sharing: true,
      data_collection: true,
      analytics: true,
    },
    app: {
      language: 'ar',
      theme: 'light',
      map_type: 'standard',
      distance_unit: 'km',
    },
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/api/users/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userSettings = await response.json();
        setSettings(prev => ({
          ...prev,
          ...userSettings,
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/api/users/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (response.ok) {
        setSettings(newSettings);
        Alert.alert('تم بنجاح', 'تم حفظ الإعدادات');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      Alert.alert('خطأ', 'لم نتمكن من حفظ الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (category: keyof AppSettings, key: string, value: any) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value,
      },
    };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleLogout = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد من تسجيل الخروج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'تسجيل الخروج', 
          style: 'destructive',
          onPress: onLogout
        }
      ]
    );
  };

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('خطأ', 'لا يمكن فتح الرابط');
    }
  };

  const clearCache = async () => {
    Alert.alert(
      'مسح البيانات المؤقتة',
      'هل تريد مسح جميع البيانات المؤقتة؟ سيؤدي هذا إلى إعادة تحميل البيانات من الخادم.',
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'مسح', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('cached_locations');
              await AsyncStorage.removeItem('cached_rides');
              Alert.alert('تم بنجاح', 'تم مسح البيانات المؤقتة');
            } catch (error) {
              Alert.alert('خطأ', 'لم نتمكن من مسح البيانات المؤقتة');
            }
          }
        }
      ]
    );
  };

  const renderNotificationSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>الإشعارات</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Ionicons name="notifications" size={20} color={Colors.primary} />
          <Text style={styles.settingLabel}>تفعيل الإشعارات</Text>
        </View>
        <Switch
          value={settings.notifications.push_enabled}
          onValueChange={(value) => updateSetting('notifications', 'push_enabled', value)}
          thumbColor={settings.notifications.push_enabled ? Colors.primary : Colors.mediumGray}
          trackColor={{ false: Colors.gray, true: Colors.primaryLight }}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Ionicons name="volume-high" size={20} color={Colors.primary} />
          <Text style={styles.settingLabel}>صوت الإشعارات</Text>
        </View>
        <Switch
          value={settings.notifications.sound_enabled}
          onValueChange={(value) => updateSetting('notifications', 'sound_enabled', value)}
          thumbColor={settings.notifications.sound_enabled ? Colors.primary : Colors.mediumGray}
          trackColor={{ false: Colors.gray, true: Colors.primaryLight }}
          disabled={!settings.notifications.push_enabled}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Ionicons name="phone-portrait" size={20} color={Colors.primary} />
          <Text style={styles.settingLabel}>الاهتزاز</Text>
        </View>
        <Switch
          value={settings.notifications.vibration_enabled}
          onValueChange={(value) => updateSetting('notifications', 'vibration_enabled', value)}
          thumbColor={settings.notifications.vibration_enabled ? Colors.primary : Colors.mediumGray}
          trackColor={{ false: Colors.gray, true: Colors.primaryLight }}
          disabled={!settings.notifications.push_enabled}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Ionicons name="car" size={20} color={Colors.primary} />
          <Text style={styles.settingLabel}>تحديثات الرحلات</Text>
        </View>
        <Switch
          value={settings.notifications.ride_updates}
          onValueChange={(value) => updateSetting('notifications', 'ride_updates', value)}
          thumbColor={settings.notifications.ride_updates ? Colors.primary : Colors.mediumGray}
          trackColor={{ false: Colors.gray, true: Colors.primaryLight }}
          disabled={!settings.notifications.push_enabled}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <MaterialIcons name="local-shipping" size={20} color={Colors.primary} />
          <Text style={styles.settingLabel}>تحديثات التوصيل</Text>
        </View>
        <Switch
          value={settings.notifications.delivery_updates}
          onValueChange={(value) => updateSetting('notifications', 'delivery_updates', value)}
          thumbColor={settings.notifications.delivery_updates ? Colors.primary : Colors.mediumGray}
          trackColor={{ false: Colors.gray, true: Colors.primaryLight }}
          disabled={!settings.notifications.push_enabled}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <MaterialIcons name="campaign" size={20} color={Colors.primary} />
          <Text style={styles.settingLabel}>العروض والتحديثات</Text>
        </View>
        <Switch
          value={settings.notifications.promotional}
          onValueChange={(value) => updateSetting('notifications', 'promotional', value)}
          thumbColor={settings.notifications.promotional ? Colors.primary : Colors.mediumGray}
          trackColor={{ false: Colors.gray, true: Colors.primaryLight }}
          disabled={!settings.notifications.push_enabled}
        />
      </View>
    </View>
  );

  const renderPrivacySettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>الخصوصية والأمان</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Ionicons name="location" size={20} color={Colors.primary} />
          <Text style={styles.settingLabel}>مشاركة الموقع</Text>
        </View>
        <Switch
          value={settings.privacy.location_sharing}
          onValueChange={(value) => updateSetting('privacy', 'location_sharing', value)}
          thumbColor={settings.privacy.location_sharing ? Colors.primary : Colors.mediumGray}
          trackColor={{ false: Colors.gray, true: Colors.primaryLight }}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <MaterialIcons name="data-usage" size={20} color={Colors.primary} />
          <Text style={styles.settingLabel}>جمع البيانات لتحسين الخدمة</Text>
        </View>
        <Switch
          value={settings.privacy.data_collection}
          onValueChange={(value) => updateSetting('privacy', 'data_collection', value)}
          thumbColor={settings.privacy.data_collection ? Colors.primary : Colors.mediumGray}
          trackColor={{ false: Colors.gray, true: Colors.primaryLight }}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <MaterialIcons name="analytics" size={20} color={Colors.primary} />
          <Text style={styles.settingLabel}>بيانات الاستخدام والتحليلات</Text>
        </View>
        <Switch
          value={settings.privacy.analytics}
          onValueChange={(value) => updateSetting('privacy', 'analytics', value)}
          thumbColor={settings.privacy.analytics ? Colors.primary : Colors.mediumGray}
          trackColor={{ false: Colors.gray, true: Colors.primaryLight }}
        />
      </View>
    </View>
  );

  const renderAppSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>إعدادات التطبيق</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Ionicons name="language" size={20} color={Colors.primary} />
          <Text style={styles.settingLabel}>اللغة</Text>
        </View>
        <View style={styles.languageButtons}>
          <TouchableOpacity
            style={[
              styles.languageButton,
              settings.app.language === 'ar' && styles.languageButtonActive
            ]}
            onPress={() => updateSetting('app', 'language', 'ar')}
          >
            <Text style={[
              styles.languageButtonText,
              settings.app.language === 'ar' && styles.languageButtonTextActive
            ]}>
              عربي
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.languageButton,
              settings.app.language === 'en' && styles.languageButtonActive
            ]}
            onPress={() => updateSetting('app', 'language', 'en')}
          >
            <Text style={[
              styles.languageButtonText,
              settings.app.language === 'en' && styles.languageButtonTextActive
            ]}>
              English
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Ionicons name="color-palette" size={20} color={Colors.primary} />
          <Text style={styles.settingLabel}>مظهر التطبيق</Text>
        </View>
        <View style={styles.themeButtons}>
          {[
            { key: 'light', label: 'فاتح', icon: 'sunny' },
            { key: 'dark', label: 'داكن', icon: 'moon' },
            { key: 'auto', label: 'تلقائي', icon: 'phone-portrait' }
          ].map((theme) => (
            <TouchableOpacity
              key={theme.key}
              style={[
                styles.themeButton,
                settings.app.theme === theme.key && styles.themeButtonActive
              ]}
              onPress={() => updateSetting('app', 'theme', theme.key)}
            >
              <Ionicons 
                name={theme.icon as any} 
                size={16} 
                color={settings.app.theme === theme.key ? Colors.white : Colors.textSecondary} 
              />
              <Text style={[
                styles.themeButtonText,
                settings.app.theme === theme.key && styles.themeButtonTextActive
              ]}>
                {theme.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Ionicons name="map" size={20} color={Colors.primary} />
          <Text style={styles.settingLabel}>نوع الخريطة</Text>
        </View>
        <View style={styles.mapTypeButtons}>
          {[
            { key: 'standard', label: 'عادي' },
            { key: 'satellite', label: 'قمر صناعي' },
            { key: 'hybrid', label: 'مختلط' }
          ].map((mapType) => (
            <TouchableOpacity
              key={mapType.key}
              style={[
                styles.mapTypeButton,
                settings.app.map_type === mapType.key && styles.mapTypeButtonActive
              ]}
              onPress={() => updateSetting('app', 'map_type', mapType.key)}
            >
              <Text style={[
                styles.mapTypeButtonText,
                settings.app.map_type === mapType.key && styles.mapTypeButtonTextActive
              ]}>
                {mapType.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <MaterialIcons name="straighten" size={20} color={Colors.primary} />
          <Text style={styles.settingLabel}>وحدة المسافة</Text>
        </View>
        <View style={styles.unitButtons}>
          <TouchableOpacity
            style={[
              styles.unitButton,
              settings.app.distance_unit === 'km' && styles.unitButtonActive
            ]}
            onPress={() => updateSetting('app', 'distance_unit', 'km')}
          >
            <Text style={[
              styles.unitButtonText,
              settings.app.distance_unit === 'km' && styles.unitButtonTextActive
            ]}>
              كيلومتر
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.unitButton,
              settings.app.distance_unit === 'miles' && styles.unitButtonActive
            ]}
            onPress={() => updateSetting('app', 'distance_unit', 'miles')}
          >
            <Text style={[
              styles.unitButtonText,
              settings.app.distance_unit === 'miles' && styles.unitButtonTextActive
            ]}>
              ميل
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderDriverSettings = () => {
    if (user?.user_type !== 'driver' || !settings.driver) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>إعدادات السائق</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="check-circle" size={20} color={Colors.primary} />
            <Text style={styles.settingLabel}>قبول تلقائي للطلبات القريبة</Text>
          </View>
          <Switch
            value={settings.driver.auto_accept}
            onValueChange={(value) => updateSetting('driver', 'auto_accept', value)}
            thumbColor={settings.driver.auto_accept ? Colors.primary : Colors.mediumGray}
            trackColor={{ false: Colors.gray, true: Colors.primaryLight }}
          />
        </View>

        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="location-on" size={20} color={Colors.primary} />
            <Text style={styles.settingLabel}>أقصى مسافة للطلبات</Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={styles.settingValueText}>{settings.driver.max_distance_km} كم</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.mediumGray} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="time" size={20} color={Colors.primary} />
            <Text style={styles.settingLabel}>ساعات العمل</Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={styles.settingValueText}>
              {settings.driver.working_hours.start} - {settings.driver.working_hours.end}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.mediumGray} />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSupportSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>المساعدة والدعم</Text>
      
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => openUrl('https://aburide.support.com/help')}
      >
        <Ionicons name="help-circle" size={20} color={Colors.primary} />
        <Text style={styles.actionButtonText}>مركز المساعدة</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.mediumGray} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => openUrl('mailto:support@aburide.com')}
      >
        <Ionicons name="mail" size={20} color={Colors.primary} />
        <Text style={styles.actionButtonText}>التواصل مع الدعم</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.mediumGray} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => openUrl('tel:+9647801234567')}
      >
        <Ionicons name="call" size={20} color={Colors.primary} />
        <Text style={styles.actionButtonText}>خدمة العملاء</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.mediumGray} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => openUrl('https://aburide.com/terms')}
      >
        <Ionicons name="document-text" size={20} color={Colors.primary} />
        <Text style={styles.actionButtonText}>الشروط والأحكام</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.mediumGray} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => openUrl('https://aburide.com/privacy')}
      >
        <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
        <Text style={styles.actionButtonText}>سياسة الخصوصية</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.mediumGray} />
      </TouchableOpacity>
    </View>
  );

  const renderAdvancedSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>إعدادات متقدمة</Text>
      
      <TouchableOpacity style={styles.actionButton} onPress={clearCache}>
        <MaterialIcons name="clear-all" size={20} color={Colors.warning} />
        <Text style={styles.actionButtonText}>مسح البيانات المؤقتة</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.mediumGray} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton}>
        <MaterialIcons name="backup" size={20} color={Colors.primary} />
        <Text style={styles.actionButtonText}>نسخ احتياطي للبيانات</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.mediumGray} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton}>
        <MaterialIcons name="system-update" size={20} color={Colors.primary} />
        <Text style={styles.actionButtonText}>التحقق من التحديثات</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.mediumGray} />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleLogout}>
        <Ionicons name="log-out" size={20} color={Colors.error} />
        <Text style={[styles.actionButtonText, styles.logoutText]}>تسجيل الخروج</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.mediumGray} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>الإعدادات</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderNotificationSettings()}
          {renderPrivacySettings()}
          {renderAppSettings()}
          {renderDriverSettings()}
          {renderSupportSettings()}
          {renderAdvancedSettings()}

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appVersion}>أبو الغربية الإصدار 1.0.0</Text>
            <Text style={styles.appCopyright}>© 2024 Abu Al-Gharbiya. جميع الحقوق محفوظة.</Text>
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
  },
  section: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    marginBottom: 0,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadows.small,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValueText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  languageButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.gray,
  },
  languageButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  languageButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  languageButtonTextActive: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  themeButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.gray,
    gap: 4,
  },
  themeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  themeButtonText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  themeButtonTextActive: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  mapTypeButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  mapTypeButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.gray,
  },
  mapTypeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  mapTypeButtonText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  mapTypeButtonTextActive: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  unitButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  unitButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.gray,
  },
  unitButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  unitButtonText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  unitButtonTextActive: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  actionButtonText: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  logoutButton: {
    borderBottomWidth: 0,
    marginTop: Spacing.sm,
  },
  logoutText: {
    color: Colors.error,
  },
  appInfo: {
    alignItems: 'center',
    padding: Spacing.xl,
    marginTop: Spacing.lg,
  },
  appVersion: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  appCopyright: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default SettingsScreen;