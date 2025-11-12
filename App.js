import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HistoryScreen from './HistoryScreen';

// Handler actualizado (sin deprecaciones)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function HomeScreen({ navigation }) {
  const [token, setToken] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [nextNotificationTime, setNextNotificationTime] = useState(null);

  useEffect(() => {
    // Canal Android con sonido y vibración personalizada
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('custom', {
        name: 'custom',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#FF231F7C',
        sound: 'default', // usa 'default' en Expo Go
      });
    }

    // Permisos + token
    registerForPushNotificationsAsync().then(({ token, status }) => {
      setToken(token || null);
      setPermissionStatus(status || null);
      if (status === 'denied') {
        Alert.alert('Permiso denegado', 'Activa las notificaciones en Ajustes del sistema.');
      }
    });

    // Listeners: recibida y tocada
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      saveNotificationToHistory(notification.request.content);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const content = response?.notification?.request?.content;
      Alert.alert('Notificación tocada', content ? `${content.title}\n${content.body}` : 'Sin contenido');
      saveNotificationToHistory({ title: 'Tocada', body: 'El usuario interactuó con la notificación.' });
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  // Permisos y token
  async function registerForPushNotificationsAsync() {
    let token;
    let status;

    if (!Device.isDevice) {
      Alert.alert('Dispositivo requerido', 'Usa un dispositivo físico para tokens push.');
      return { token: null, status: 'undetermined' };
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    status = existingStatus;

    if (existingStatus !== 'granted') {
      const { status: requestedStatus } = await Notifications.requestPermissionsAsync();
      status = requestedStatus;
    }

    if (status !== 'granted') {
      return { token: null, status };
    }

    const expoPushToken = await Notifications.getExpoPushTokenAsync();
    token = expoPushToken.data;
    return { token, status };
  }

  // Notificación local en 5s
  async function scheduleNotification() {
    const triggerSeconds = 5;
    const fireDate = new Date(Date.now() + triggerSeconds * 1000);
    setNextNotificationTime(fireDate);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Notificación',
        body: 'Esta es una prueba de notificación local.',
        sound: 'default',
      },
      trigger: { seconds: triggerSeconds },
    });

    await saveNotificationToHistory({ title: 'Programada 5s', body: `Se dispara a las ${fireDate.toLocaleTimeString()}` });
  }

  // Repetitiva cada 10s
  async function scheduleRepeatingNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Repetitiva',
        body: 'Ping cada 10 segundos',
        sound: 'default',
      },
      trigger: { seconds: 10, repeats: true },
    });
    await saveNotificationToHistory({ title: 'Repetitiva 10s', body: 'Programada con repeats' });
  }

  // Reintentar permisos
  async function retryPermission() {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermissionStatus(status);
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Ve a Ajustes para habilitar las notificaciones.');
      setToken(null);
      return;
    }
    const expoPushToken = await Notifications.getExpoPushTokenAsync();
    setToken(expoPushToken.data);
  }

  // Enviar token a servidor simulado
  async function sendTokenToServer(currentToken) {
    if (!currentToken) {
      Alert.alert('Sin token', 'Obtén permisos y token primero.');
      return;
    }
    try {
      const res = await fetch('https://httpbin.org/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expoPushToken: currentToken, userId: 'demo' }),
      });
      const data = await res.json();
      Alert.alert('Token enviado', 'Simulación exitosa.');
      await saveNotificationToHistory({ title: 'Token enviado', body: JSON.stringify(data.json) });
    } catch (e) {
      Alert.alert('Error al enviar token', String(e));
    }
  }

  // Guardar en historial
  async function saveNotificationToHistory(content) {
    const raw = await AsyncStorage.getItem('@history');
    const parsed = raw ? JSON.parse(raw) : [];
    parsed.push({ date: new Date().toISOString(), content });
    await AsyncStorage.setItem('@history', JSON.stringify(parsed));
  }

  const permissionText =
    permissionStatus === 'granted'
      ? 'Permiso concedido'
      : permissionStatus === 'denied'
      ? 'Permiso denegado'
      : 'Permiso no determinado';

  const permissionColor =
    permissionStatus === 'granted'
      ? styles.permissionGranted
      : permissionStatus === 'denied'
      ? styles.permissionDenied
      : styles.permissionUndetermined;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notificaciones con Expo</Text>

      <View style={[styles.permissionBadge, permissionColor]}>
        <Text style={styles.permissionText}>{permissionText}</Text>
      </View>

      <Text style={styles.label}>Token de dispositivo:</Text>
      <Text selectable style={styles.tokenText}>
        {token ?? 'Aún no disponible'}
      </Text>

      <View style={styles.actions}>
        <Button title="Programar notificación en 5s" onPress={scheduleNotification} />
      </View>

      <View style={styles.actions}>
        <Button title="Notificación repetitiva cada 10s" onPress={scheduleRepeatingNotification} />
      </View>

      <View style={styles.actions}>
        <Button title="Solicitar permiso nuevamente" onPress={retryPermission} />
      </View>

      <View style={styles.actions}>
        <Button title="Enviar token al servidor" onPress={() => sendTokenToServer(token)} />
      </View>

      <View style={styles.actions}>
        <Button title="Ver historial de notificaciones" onPress={() => navigation.navigate('Historial')} />
      </View>

      <Text style={styles.nextText}>
        {nextNotificationTime
          ? `Próxima notificación: ${nextNotificationTime.toLocaleTimeString()}`
          : 'Sin notificación próxima'}
      </Text>
    </View>
  );
}

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Inicio" component={HomeScreen} />
        <Stack.Screen name="Historial" component={HistoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, gap: 12 },
  title: { fontSize: 20, fontWeight: 'bold' },
  label: { fontSize: 16, marginTop: 8 },
  tokenText: { fontSize: 14, textAlign: 'center', marginVertical: 6 },
  actions: { marginTop: 8, width: 260 },
  nextText: { marginTop: 10, fontSize: 14 },
  permissionBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  permissionText: { color: '#fff', fontWeight: '600' },
  permissionGranted: { backgroundColor: '#2e7d32' },    // Verde
  permissionDenied: { backgroundColor: '#c62828' },     // Rojo
  permissionUndetermined: { backgroundColor: '#6d6d6d' } // Gris
});
