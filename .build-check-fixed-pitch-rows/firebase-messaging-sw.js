importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBiB9-yJalqm-HItd0YTU3LhhqdCJhEnYk',
  authDomain: 'pick2win-9c092.firebaseapp.com',
  projectId: 'pick2win-9c092',
  storageBucket: 'pick2win-9c092.firebasestorage.app',
  messagingSenderId: '963173256978',
  appId: '1:963173256978:web:5c8b33c4d25a94a2222dcb',
  measurementId: 'G-9N90G7RD0B'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  console.log('[FCM SW] Background message received:', payload);

  const title = payload.notification?.title || payload.data?.title || 'Pick2Win notification';
  const options = {
    body: payload.notification?.body || payload.data?.body || 'You have a new update.',
    icon: '/assets/favicon.png',
    badge: '/assets/favicon.png',
    data: payload.data || {}
  };

  self.registration.showNotification(title, options);
});
