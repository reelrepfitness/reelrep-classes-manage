// lib/hooks/useNotifications.ts
// React Hook for Push Notifications

import { useEffect, useState, useRef } from 'react';
import { Subscription } from 'expo-notifications';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/contexts/AuthContext';
import { PushNotificationService } from '@/lib/services/push-notifications';

export function useNotifications() {
  const { user } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const notificationListener = useRef<Subscription>();
  const responseListener = useRef<Subscription>();

  useEffect(() => {
    // Check initial permission status
    checkPermissionStatus();

    // Set up notification listeners
    notificationListener.current = PushNotificationService.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
        console.log('Notification received:', notification);
      }
    );

    responseListener.current = PushNotificationService.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        handleNotificationResponse(response);
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    // Register for push notifications when user logs in
    if (user?.id && permissionStatus === 'granted') {
      registerForPushNotifications();
    }
  }, [user?.id, permissionStatus]);

  const checkPermissionStatus = async () => {
    const status = await PushNotificationService.getPermissionStatus();
    setPermissionStatus(status);
    setIsLoading(false);
  };

  const registerForPushNotifications = async () => {
    try {
      const token = await PushNotificationService.registerForPushNotifications();
      if (token && user?.id) {
        setPushToken(token);
        await PushNotificationService.savePushToken(user.id, token);
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    const token = await PushNotificationService.registerForPushNotifications();
    if (token) {
      setPushToken(token);
      setPermissionStatus('granted');

      if (user?.id) {
        await PushNotificationService.savePushToken(user.id, token);
      }

      return true;
    } else {
      setPermissionStatus('denied');
      return false;
    }
  };

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;

    // Handle different notification types
    switch (data.type) {
      // Legacy local notification types
      case 'plates_earned':
        console.log('Plates earned notification tapped:', data);
        break;
      case 'achievement_unlocked':
        console.log('Achievement notification tapped:', data);
        break;
      case 'class_reminder':
        console.log('Class reminder notification tapped:', data);
        break;

      // User push automations
      case 'push_booking_confirmed':
      case 'push_booking_cancelled':
      case 'push_class_reminder':
      case 'push_waitlist_available':
      case 'push_new_class_available':
      case 'push_inactive_reminder':
        console.log('Class/booking notification tapped:', data);
        break;
      case 'push_streak_motivation':
        console.log('Streak motivation notification tapped:', data);
        break;
      case 'push_subscription_expiring':
        console.log('Subscription expiring notification tapped:', data);
        break;

      // Admin notifications
      case 'notify_payment_failed':
      case 'notify_payment_success':
      case 'notify_in_app_purchase':
      case 'notify_class_cancelled':
      case 'notify_form_submitted':
      case 'notify_sub_unfrozen':
      case 'notify_new_lead':
      case 'notify_last_punch':
      case 'notify_ticket_finished':
      case 'notify_sub_expiring':
      case 'notify_user_blocked':
      case 'notify_user_unblocked':
      case 'notify_penalty_applied':
        console.log('Admin notification tapped:', data);
        break;

      default:
        console.log('Generic notification tapped:', data);
    }

    // Clear badge count when user taps a notification
    Notifications.setBadgeCountAsync(0).catch(() => {});
  };

  const sendTestNotification = async () => {
    await PushNotificationService.sendLocalNotification({
      type: 'general',
      title: 'בדיקת התראות',
      body: 'ההתראות עובדות בהצלחה! 🎉',
    });
  };

  return {
    permissionStatus,
    pushToken,
    notification,
    isLoading,
    requestPermission,
    sendTestNotification,
  };
}
