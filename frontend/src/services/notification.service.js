import api from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const notificationService = {

  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered');
      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return null;
    }
  },

  async getPushStatus() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { supported: false, granted: false };
    }

    const permission = Notification.permission;
    return {
      supported: true,
      granted: permission === 'granted',
      permission
    };
  },

  async requestPermission() {
    if (!('Notification' in window)) return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  async subscribeUser() {
    try {
      const registration = await navigator.serviceWorker.ready;

      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        return existingSubscription;
      }

      const response = await api.get('/notifications/vapidPublicKey');
      const publicKey = response.data.publicKey;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      await api.post('/notifications/subscribe', subscription);

      console.log('✅ User subscribed to push notifications');
      return subscription;
    } catch (error) {
      console.error('❌ Push subscription failed:', error);
      throw error;
    }
  },

  async unsubscribeUser() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        await api.post('/notifications/unsubscribe', { endpoint: subscription.endpoint });

        console.log('🚫 User unsubscribed from push notifications');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Push unsubscription failed:', error);
      throw error;
    }
  }
};

export default notificationService;
