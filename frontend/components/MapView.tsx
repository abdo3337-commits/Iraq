import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

interface MapViewProps {
  initialLocation?: LocationData;
  onLocationSelect?: (location: LocationData) => void;
  showUserLocation?: boolean;
  markers?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title: string;
    description?: string;
    color?: string;
  }>;
  height?: number;
  style?: any;
}

const MapView: React.FC<MapViewProps> = ({
  initialLocation,
  onLocationSelect,
  showUserLocation = true,
  markers = [],
  height = 300,
  style,
}) => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const webViewRef = useRef<WebView>(null);

  // Default location (Ramadi, Anbar Governorate)
  const defaultLocation = {
    latitude: 33.4204,
    longitude: 43.3047,
    address: 'الرمادي، محافظة الأنبار'
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationPermission(false);
        Alert.alert('تحذير', 'نحتاج إذن الوصول للموقع لتحسين تجربتك');
        return;
      }

      setLocationPermission(true);
      await getCurrentLocation();
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationPermission(false);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: 'موقعك الحالي'
      };

      setCurrentLocation(newLocation);
    } catch (error) {
      console.error('Error getting current location:', error);
      setCurrentLocation(defaultLocation);
    }
  };

  const getMapCenter = () => {
    if (initialLocation) return initialLocation;
    if (currentLocation) return currentLocation;
    return defaultLocation;
  };

  const generateMapHTML = () => {
    const center = getMapCenter();
    const allMarkers = [
      ...(showUserLocation && currentLocation ? [{
        id: 'current',
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        title: 'موقعك الحالي',
        color: '#00C853'
      }] : []),
      ...markers
    ];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          #map { 
            height: 100vh; 
            width: 100%;
            position: relative;
          }
          .custom-marker {
            background: #00C853;
            border: 3px solid white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          }
          .driver-marker {
            background: #FF6B35;
          }
          .pickup-marker {
            background: #2196F3;
          }
          .destination-marker {
            background: #FF4444;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Initialize map
          const map = L.map('map', {
            zoomControl: true,
            attributionControl: false
          }).setView([${center.latitude}, ${center.longitude}], 13);

          // Add OpenStreetMap tiles
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          // Add markers
          ${allMarkers.map(marker => `
            const marker${marker.id} = L.marker([${marker.latitude}, ${marker.longitude}])
              .bindPopup('${marker.title}${marker.description ? '<br>' + marker.description : ''}')
              .addTo(map);
          `).join('')}

          // Handle map clicks for location selection
          map.on('click', function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            // Send location back to React Native
            window.ReactNativeWebView?.postMessage(JSON.stringify({
              type: 'locationSelected',
              data: {
                latitude: lat,
                longitude: lng,
                address: 'الموقع المحدد'
              }
            }));
          });

          // Fit map to show all markers if multiple exist
          ${allMarkers.length > 1 ? `
            const group = new L.featureGroup([${allMarkers.map(m => `marker${m.id}`).join(', ')}]);
            map.fitBounds(group.getBounds().pad(0.1));
          ` : ''}

          // Send ready message
          setTimeout(() => {
            window.ReactNativeWebView?.postMessage(JSON.stringify({
              type: 'mapReady'
            }));
          }, 1000);
        </script>
      </body>
      </html>
    `;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'locationSelected' && onLocationSelect) {
        onLocationSelect(data.data);
      } else if (data.type === 'mapReady') {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const handleMyLocationPress = async () => {
    if (!locationPermission) {
      await requestLocationPermission();
      return;
    }

    setLoading(true);
    await getCurrentLocation();
    
    if (currentLocation && webViewRef.current) {
      // Send message to center map on current location
      webViewRef.current.postMessage(JSON.stringify({
        type: 'centerLocation',
        data: currentLocation
      }));
    }
    setLoading(false);
  };

  if (locationPermission === false) {
    return (
      <View style={[styles.container, { height }, style]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="location-off" size={48} color="#ccc" />
          <Text style={styles.permissionText}>نحتاج إذن الوصول للموقع</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestLocationPermission}>
            <Text style={styles.permissionButtonText}>منح الإذن</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }, style]}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#00C853" />
          <Text style={styles.loadingText}>جارٍ تحميل الخريطة...</Text>
        </View>
      )}
      
      <WebView
        ref={webViewRef}
        source={{ html: generateMapHTML() }}
        style={styles.webView}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
      />

      {/* My Location Button */}
      <TouchableOpacity 
        style={styles.myLocationButton} 
        onPress={handleMyLocationPress}
      >
        <Ionicons name="locate" size={24} color="#00C853" />
      </TouchableOpacity>

      {/* Location Info */}
      {currentLocation && (
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={16} color="#666" />
          <Text style={styles.locationText}>{currentLocation.address}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 16,
  },
  permissionButton: {
    backgroundColor: '#00C853',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  myLocationButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'white',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  locationInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
});

export default MapView;