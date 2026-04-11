

self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'You have a new update from EchoNote.',
        icon: data.icon || '/logo192.png',
        badge: data.badge || '/badge.png',
        vibrate: [100, 50, 100],
        data: {
          url: data.url || '/'
        },
        actions: [
          { action: 'open', title: 'View Meeting' }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'EchoNote', options)
      );
    } catch (e) {
      console.error('Push event data parsing error:', e);
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  let targetUrl = event.notification.data.url;
  
  
  if (targetUrl && !targetUrl.startsWith('http')) {
    
    targetUrl = new URL(targetUrl, self.location.origin).href;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      
      
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
