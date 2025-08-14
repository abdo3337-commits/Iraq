import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from './styles';

const { width } = Dimensions.get('window');

interface NotificationData {
  id: string;
  type: 'ride_update' | 'delivery_update' | 'payment' | 'system' | 'promotion';
  title: string;
  message: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data?: any;
  read: boolean;
  actions?: {
    label: string;
    action: string;
    primary?: boolean;
  }[];
}

interface NotificationSystemProps {
  onNotificationPress?: (notification: NotificationData) => void;
  onActionPress?: (action: string, notification: NotificationData) => void;
}

// Configure notifications placeholder
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: false,
//   }),
// });

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  onNotificationPress,
  onActionPress,
}) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [currentNotification, setCurrentNotification] = useState<NotificationData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  const animatedValue = useRef(new Animated.Value(-200)).current;
  // const notificationListener = useRef<any>();
  // const responseListener = useRef<any>();

  useEffect(() => {
    setupNotifications();
    loadStoredNotifications();

    // return () => {
    //   Notifications.removeNotificationSubscription(notificationListener.current);
    //   Notifications.removeNotificationSubscription(responseListener.current);
    // };
  }, []);

  const setupNotifications = async () => {
    // Placeholder for notifications setup
    console.log('Notifications setup placeholder');
  };

  const sendTokenToBackend = async (token: string) => {
    // Placeholder
  };

  const loadStoredNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem('notifications');
      if (stored) {
        const parsedNotifications = JSON.parse(stored).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
        setNotifications(parsedNotifications);
      }
    } catch (error) {
      console.error('Error loading stored notifications:', error);
    }
  };

  const saveNotifications = async (newNotifications: NotificationData[]) => {
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(newNotifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  };

  const handleNotificationReceived = (notification: Notifications.Notification) => {
    const notificationData: NotificationData = {
      id: notification.request.identifier,
      type: notification.request.content.data?.type || 'system',
      title: notification.request.content.title || 'إشعار جديد',
      message: notification.request.content.body || '',
      timestamp: new Date(),
      priority: notification.request.content.data?.priority || 'medium',
      data: notification.request.content.data,
      read: false,
      actions: notification.request.content.data?.actions,
    };

    addNotification(notificationData);
    showInAppNotification(notificationData);
  };

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const notificationData = response.notification.request.content.data;
    if (onNotificationPress && notificationData) {
      onNotificationPress(notificationData);
    }
  };

  const addNotification = (notification: NotificationData) => {
    setNotifications(prev => {
      const updated = [notification, ...prev].slice(0, 50); // Keep only last 50
      saveNotifications(updated);
      return updated;
    });
  };

  const showInAppNotification = (notification: NotificationData) => {
    if (isVisible) return; // Don't show multiple notifications at once

    setCurrentNotification(notification);
    setIsVisible(true);

    // Vibrate based on priority
    if (notification.priority === 'urgent') {
      Vibration.vibrate([0, 200, 100, 200]);
    } else if (notification.priority === 'high') {
      Vibration.vibrate([0, 100, 50, 100]);
    } else {
      Vibration.vibrate(100);
    }

    // Animate in
    Animated.spring(animatedValue, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();

    // Auto hide after delay
    const hideDelay = notification.priority === 'urgent' ? 8000 : 
                     notification.priority === 'high' ? 6000 : 4000;
    
    setTimeout(() => {
      hideNotification();
    }, hideDelay);
  };

  const hideNotification = () => {
    Animated.timing(animatedValue, {
      toValue: -200,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      setCurrentNotification(null);
    });
  };

  const handleNotificationPress = () => {
    if (currentNotification && onNotificationPress) {
      onNotificationPress(currentNotification);
      markAsRead(currentNotification.id);
    }
    hideNotification();
  };

  const handleActionPress = (action: string) => {
    if (currentNotification && onActionPress) {
      onActionPress(action, currentNotification);
      markAsRead(currentNotification.id);
    }
    hideNotification();
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      saveNotifications(updated);
      return updated;
    });
  };

  const getNotificationIcon = (type: string) => {
    const iconMap: { [key: string]: { name: string; color: string } } = {
      'ride_update': { name: 'car', color: Colors.success },
      'delivery_update': { name: 'cube', color: Colors.delivery },
      'payment': { name: 'card', color: Colors.primary },
      'system': { name: 'information-circle', color: Colors.info },
      'promotion': { name: 'gift', color: Colors.warning },
    };
    return iconMap[type] || iconMap['system'];
  };

  const getPriorityColor = (priority: string) => {
    const colorMap: { [key: string]: string } = {
      'low': Colors.mediumGray,
      'medium': Colors.info,
      'high': Colors.warning,
      'urgent': Colors.error,
    };
    return colorMap[priority] || Colors.info;
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 20;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy < 0) {
        animatedValue.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy < -50) {
        hideNotification();
      } else {
        Animated.spring(animatedValue, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  // Public methods for sending notifications
  const sendLocalNotification = async (notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.message,
        data: notification.data,
      },
      trigger: null,
    });
  };

  const scheduleNotification = async (
    notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>,
    scheduledTime: Date
  ) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.message,
        data: notification.data,
      },
      trigger: { date: scheduledTime },
    });
  };

  if (!isVisible || !currentNotification) {
    return null;
  }

  const icon = getNotificationIcon(currentNotification.type);
  const priorityColor = getPriorityColor(currentNotification.priority);

  return (
    <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: animatedValue }],
            borderLeftColor: priorityColor,
          }
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.notificationContent}
          onPress={handleNotificationPress}
          activeOpacity={0.9}
        >
          {/* Icon and Priority Indicator */}
          <View style={styles.iconContainer}>
            <View style={[styles.iconBackground, { backgroundColor: `${icon.color}20` }]}>
              <Ionicons name={icon.name as any} size={24} color={icon.color} />
            </View>
            {currentNotification.priority === 'urgent' && (
              <View style={styles.urgentIndicator}>
                <MaterialIcons name="priority-high" size={12} color={Colors.white} />
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.textContent}>
            <Text style={styles.title} numberOfLines={1}>
              {currentNotification.title}
            </Text>
            <Text style={styles.message} numberOfLines={2}>
              {currentNotification.message}
            </Text>
            <Text style={styles.timestamp}>
              {currentNotification.timestamp.toLocaleTimeString('ar-IQ', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={hideNotification}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color={Colors.mediumGray} />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Action Buttons */}
        {currentNotification.actions && currentNotification.actions.length > 0 && (
          <View style={styles.actionsContainer}>
            {currentNotification.actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.actionButton,
                  action.primary && styles.primaryActionButton,
                ]}
                onPress={() => handleActionPress(action.action)}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    action.primary && styles.primaryActionButtonText,
                  ]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

// Export methods for external use
export const NotificationService = {
  sendLocalNotification: async (notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.message,
        data: notification.data,
      },
      trigger: null,
    });
  },

  scheduleNotification: async (
    notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>,
    scheduledTime: Date
  ) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.message,
        data: notification.data,
      },
      trigger: { date: scheduledTime },
    });
  },

  cancelAllNotifications: async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  cancelNotification: async (notificationId: string) => {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },
};

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  container: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    ...Shadows.large,
    elevation: 10,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
  },
  iconContainer: {
    position: 'relative',
    marginRight: Spacing.sm,
  },
  iconBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgentIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs / 2,
  },
  message: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  timestamp: {
    fontSize: FontSizes.xs,
    color: Colors.mediumGray,
  },
  closeButton: {
    padding: Spacing.xs / 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  actionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.gray,
  },
  primaryActionButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  actionButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  primaryActionButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
});

export default NotificationSystem;
export type { NotificationData };