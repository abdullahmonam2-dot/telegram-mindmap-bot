self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'حجز جديد في موعد';
  const options = {
    body: data.body || 'لديك طلب حجز جديد يحتاج إلى مراجعة.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: {
      url: '/secretary',
      appointmentId: data.appointmentId
    },
    actions: [
      { action: 'confirm', title: 'تأكيد الحجز ✅' },
      { action: 'cancel', title: 'إلغاء ❌' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'confirm') {
    // Logic to confirm via background sync or just open app
    event.waitUntil(clients.openWindow('/secretary?action=confirm&id=' + event.notification.data.appointmentId));
  } else if (event.action === 'cancel') {
    event.waitUntil(clients.openWindow('/secretary?action=cancel&id=' + event.notification.data.appointmentId));
  } else {
    event.waitUntil(clients.openWindow('/secretary'));
  }
});
