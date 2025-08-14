import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from './styles';

interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  user_type: 'passenger' | 'driver';
  profile_image?: string;
  rating: number;
  total_rides: number;
  total_deliveries: number;
  is_active: boolean;
  created_at: string;
  preferences: {
    notifications: boolean;
    location_sharing: boolean;
    language: 'ar' | 'en';
    theme: 'light' | 'dark';
  };
}

interface ProfileScreenProps {
  visible: boolean;
  onClose: () => void;
  user: any;
  onUserUpdate: (updatedUser: any) => void;
}

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://aburide.preview.emergentagent.com';

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  visible,
  onClose,
  user,
  onUserUpdate,
}) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Edit form states
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<'ar' | 'en'>('ar');

  useEffect(() => {
    if (visible) {
      loadUserProfile();
    }
  }, [visible]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
        setEditName(profile.name);
        setEditEmail(profile.email || '');
        setNotificationsEnabled(profile.preferences?.notifications ?? true);
        setLocationSharingEnabled(profile.preferences?.location_sharing ?? true);
        setSelectedLanguage(profile.preferences?.language ?? 'ar');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      
      const updateData = {
        name: editName,
        email: editEmail || undefined,
        preferences: {
          notifications: notificationsEnabled,
          location_sharing: locationSharingEnabled,
          language: selectedLanguage,
          theme: 'light'
        }
      };

      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setUserProfile(updatedProfile);
        onUserUpdate(updatedProfile);
        setEditMode(false);
        Alert.alert('تم بنجاح', 'تم تحديث البيانات الشخصية');
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      Alert.alert('خطأ', 'لم نتمكن من تحديث البيانات');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStarsRating = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color={Colors.primary}
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  if (!userProfile && !loading) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>الملف الشخصي</Text>
          <TouchableOpacity 
            onPress={() => editMode ? updateProfile() : setEditMode(true)}
            style={styles.editButton}
            disabled={loading}
          >
            <Text style={styles.editButtonText}>
              {editMode ? 'حفظ' : 'تعديل'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {userProfile?.profile_image ? (
                <Image 
                  source={{ uri: userProfile.profile_image }} 
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color={Colors.primary} />
                </View>
              )}
              <TouchableOpacity style={styles.cameraButton}>
                <Ionicons name="camera" size={16} color={Colors.white} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.profileInfo}>
              {editMode ? (
                <TextInput
                  style={styles.nameInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="الاسم الكامل"
                  placeholderTextColor={Colors.mediumGray}
                />
              ) : (
                <Text style={styles.userName}>{userProfile?.name}</Text>
              )}
              
              <Text style={styles.userPhone}>{userProfile?.phone}</Text>
              <View style={styles.userTypeContainer}>
                <MaterialIcons 
                  name={userProfile?.user_type === 'driver' ? 'directions-car' : 'person'} 
                  size={16} 
                  color={Colors.primary} 
                />
                <Text style={styles.userType}>
                  {userProfile?.user_type === 'driver' ? 'سائق' : 'عميل'}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats Card */}
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>الإحصائيات</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userProfile?.total_rides || 0}</Text>
                <Text style={styles.statLabel}>الرحلات</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userProfile?.total_deliveries || 0}</Text>
                <Text style={styles.statLabel}>التوصيلات</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userProfile?.rating?.toFixed(1) || '0.0'}</Text>
                <Text style={styles.statLabel}>التقييم</Text>
                {renderStarsRating(Math.round(userProfile?.rating || 0))}
              </View>
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>معلومات الاتصال</Text>
            
            <View style={styles.infoRow}>
              <Ionicons name="phone-portrait" size={20} color={Colors.primary} />
              <Text style={styles.infoLabel}>رقم الهاتف</Text>
              <Text style={styles.infoValue}>{userProfile?.phone}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="mail" size={20} color={Colors.primary} />
              <Text style={styles.infoLabel}>البريد الإلكتروني</Text>
              {editMode ? (
                <TextInput
                  style={styles.emailInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="البريد الإلكتروني"
                  keyboardType="email-address"
                  placeholderTextColor={Colors.mediumGray}
                />
              ) : (
                <Text style={styles.infoValue}>
                  {userProfile?.email || 'غير محدد'}
                </Text>
              )}
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={20} color={Colors.primary} />
              <Text style={styles.infoLabel}>تاريخ التسجيل</Text>
              <Text style={styles.infoValue}>
                {userProfile?.created_at ? formatDate(userProfile.created_at) : 'غير محدد'}
              </Text>
            </View>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>التفضيلات</Text>
            
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceInfo}>
                <Ionicons name="notifications" size={20} color={Colors.primary} />
                <Text style={styles.preferenceLabel}>الإشعارات</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                thumbColor={notificationsEnabled ? Colors.primary : Colors.mediumGray}
                trackColor={{ false: Colors.gray, true: Colors.primaryLight }}
                disabled={!editMode}
              />
            </View>

            <View style={styles.preferenceRow}>
              <View style={styles.preferenceInfo}>
                <Ionicons name="location" size={20} color={Colors.primary} />
                <Text style={styles.preferenceLabel}>مشاركة الموقع</Text>
              </View>
              <Switch
                value={locationSharingEnabled}
                onValueChange={setLocationSharingEnabled}
                thumbColor={locationSharingEnabled ? Colors.primary : Colors.mediumGray}
                trackColor={{ false: Colors.gray, true: Colors.primaryLight }}
                disabled={!editMode}
              />
            </View>

            <View style={styles.preferenceRow}>
              <View style={styles.preferenceInfo}>
                <Ionicons name="language" size={20} color={Colors.primary} />
                <Text style={styles.preferenceLabel}>اللغة</Text>
              </View>
              <View style={styles.languageButtons}>
                <TouchableOpacity
                  style={[
                    styles.languageButton,
                    selectedLanguage === 'ar' && styles.languageButtonActive
                  ]}
                  onPress={() => editMode && setSelectedLanguage('ar')}
                  disabled={!editMode}
                >
                  <Text style={[
                    styles.languageButtonText,
                    selectedLanguage === 'ar' && styles.languageButtonTextActive
                  ]}>
                    عربي
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.languageButton,
                    selectedLanguage === 'en' && styles.languageButtonActive
                  ]}
                  onPress={() => editMode && setSelectedLanguage('en')}
                  disabled={!editMode}
                >
                  <Text style={[
                    styles.languageButtonText,
                    selectedLanguage === 'en' && styles.languageButtonTextActive
                  ]}>
                    English
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Account Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>إعدادات الحساب</Text>
            
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="lock-closed" size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>تغيير كلمة المرور</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.mediumGray} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="document-text" size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>الشروط والأحكام</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.mediumGray} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="help-circle" size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>المساعدة والدعم</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.mediumGray} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.logoutButton]}>
              <Ionicons name="log-out" size={20} color={Colors.error} />
              <Text style={[styles.actionButtonText, styles.logoutText]}>تسجيل الخروج</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.mediumGray} />
            </TouchableOpacity>
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
  editButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  editButtonText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.sectionBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  nameInput: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingBottom: 4,
    textAlign: 'center',
    minWidth: 150,
  },
  userPhone: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  userTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.sectionBackground,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  userType: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: 'bold',
    marginLeft: Spacing.xs,
  },
  statsCard: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  section: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    marginTop: 0,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadows.small,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  infoLabel: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  infoValue: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  emailInput: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingBottom: 4,
    flex: 1,
    textAlign: 'right',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  preferenceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  preferenceLabel: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
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
  },
  logoutText: {
    color: Colors.error,
  },
});

export default ProfileScreen;