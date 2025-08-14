import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

interface LocationSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: LocationData) => void;
  title: string;
  currentLocation?: LocationData | null;
}

// Predefined locations in Anbar Governorate
const ANBAR_LOCATIONS = [
  {
    name: 'الرمادي - وسط المدينة',
    address: 'الرمادي، وسط المدينة، محافظة الأنبار',
    latitude: 33.4204,
    longitude: 43.3047,
  },
  {
    name: 'الفلوجة',
    address: 'الفلوجة، محافظة الأنبار',
    latitude: 33.3506,
    longitude: 43.7789,
  },
  {
    name: 'هيت',
    address: 'هيت، محافظة الأنبار',
    latitude: 33.6419,
    longitude: 42.8225,
  },
  {
    name: 'حديثة',
    address: 'حديثة، محافظة الأنبار',
    latitude: 34.1375,
    longitude: 42.3772,
  },
  {
    name: 'القائم',
    address: 'القائم، محافظة الأنبار',
    latitude: 34.3833,
    longitude: 41.0333,
  },
  {
    name: 'عانة',
    address: 'عانة، محافظة الأنبار',
    latitude: 34.3667,
    longitude: 41.9833,
  },
  {
    name: 'راوة',
    address: 'راوة، محافظة الأنبار',
    latitude: 34.4833,
    longitude: 41.9167,
  },
  {
    name: 'الرطبة',
    address: 'الرطبة، محافظة الأنبار',
    latitude: 32.4667,
    longitude: 40.2833,
  },
];

// Common places within Ramadi
const RAMADI_PLACES = [
  {
    name: 'مستشفى الرمادي العام',
    address: 'مستشفى الرمادي العام، الرمادي',
    latitude: 33.4185,
    longitude: 43.2985,
  },
  {
    name: 'جامعة الأنبار',
    address: 'جامعة الأنبار، الرمادي',
    latitude: 33.3850,
    longitude: 43.2650,
  },
  {
    name: 'السوق المركزي',
    address: 'السوق المركزي، الرمادي',
    latitude: 33.4215,
    longitude: 43.3058,
  },
  {
    name: 'مطار الرمادي',
    address: 'مطار الرمادي، محافظة الأنبار',
    latitude: 33.4631,
    longitude: 43.4872,
  },
  {
    name: 'مول الأنبار',
    address: 'مول الأنبار، الرمادي',
    latitude: 33.4180,
    longitude: 43.3120,
  },
];

const LocationSearchModal: React.FC<LocationSearchModalProps> = ({
  visible,
  onClose,
  onLocationSelect,
  title,
  currentLocation,
}) => {
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentLocations, setRecentLocations] = useState<LocationData[]>([]);

  const filteredAnbarLocations = ANBAR_LOCATIONS.filter(location =>
    location.name.toLowerCase().includes(searchText.toLowerCase()) ||
    location.address.toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredRamadiPlaces = RAMADI_PLACES.filter(place =>
    place.name.toLowerCase().includes(searchText.toLowerCase()) ||
    place.address.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleLocationSelect = (location: any) => {
    const locationData: LocationData = {
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address || location.name,
    };
    
    onLocationSelect(locationData);
    onClose();
  };

  const handleCurrentLocationSelect = async () => {
    if (currentLocation) {
      onLocationSelect(currentLocation);
      onClose();
      return;
    }

    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('تحذير', 'نحتاج إذن الوصول للموقع لتحديد موقعك الحالي');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: 'موقعك الحالي',
      };

      onLocationSelect(locationData);
      onClose();
    } catch (error) {
      Alert.alert('خطأ', 'لم نتمكن من تحديد موقعك الحالي');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث عن موقع..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#999"
          />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Current Location */}
          <TouchableOpacity 
            style={styles.locationItem}
            onPress={handleCurrentLocationSelect}
            disabled={loading}
          >
            <View style={styles.locationIcon}>
              {loading ? (
                <ActivityIndicator size="small" color="#00C853" />
              ) : (
                <Ionicons name="locate" size={20} color="#00C853" />
              )}
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationName}>موقعك الحالي</Text>
              <Text style={styles.locationDescription}>تحديد الموقع تلقائياً</Text>
            </View>
          </TouchableOpacity>

          {/* Anbar Cities */}
          {(!searchText || filteredAnbarLocations.length > 0) && (
            <>
              <Text style={styles.sectionTitle}>مدن محافظة الأنبار</Text>
              {(searchText ? filteredAnbarLocations : ANBAR_LOCATIONS).map((location, index) => (
                <TouchableOpacity
                  key={`anbar-${index}`}
                  style={styles.locationItem}
                  onPress={() => handleLocationSelect(location)}
                >
                  <View style={styles.locationIcon}>
                    <Ionicons name="location" size={20} color="#FF6B35" />
                  </View>
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationName}>{location.name}</Text>
                    <Text style={styles.locationDescription}>{location.address}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Ramadi Places */}
          {(!searchText || filteredRamadiPlaces.length > 0) && (
            <>
              <Text style={styles.sectionTitle}>أماكن مهمة في الرمادي</Text>
              {(searchText ? filteredRamadiPlaces : RAMADI_PLACES).map((place, index) => (
                <TouchableOpacity
                  key={`ramadi-${index}`}
                  style={styles.locationItem}
                  onPress={() => handleLocationSelect(place)}
                >
                  <View style={styles.locationIcon}>
                    <Ionicons name="business" size={20} color="#2196F3" />
                  </View>
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationName}>{place.name}</Text>
                    <Text style={styles.locationDescription}>{place.address}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* No Results */}
          {searchText && filteredAnbarLocations.length === 0 && filteredRamadiPlaces.length === 0 && (
            <View style={styles.noResults}>
              <Ionicons name="search" size={48} color="#ccc" />
              <Text style={styles.noResultsText}>لم نجد نتائج مطابقة</Text>
              <Text style={styles.noResultsDescription}>جرب البحث بكلمات أخرى</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    margin: 20,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F5F5F5',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  locationDescription: {
    fontSize: 14,
    color: '#666666',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default LocationSearchModal;