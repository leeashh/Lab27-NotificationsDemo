import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Button, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    const raw = await AsyncStorage.getItem('@history');
    const parsed = raw ? JSON.parse(raw) : [];
    setHistory(parsed.reverse()); // últimas primero
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  const clearHistory = useCallback(async () => {
    await AsyncStorage.removeItem('@history');
    setHistory([]);
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.date}>{new Date(item.date).toLocaleString()}</Text>
      <Text style={styles.title}>{item.content?.title ?? '(Sin título)'}</Text>
      <Text style={styles.body}>{item.content?.body ?? '(Sin cuerpo)'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Historial de notificaciones</Text>

      {history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No hay notificaciones registradas.</Text>
          <Text style={styles.emptyHint}>Programa una y vuelve para verla aquí.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      <View style={styles.actions}>
        <Button title="Refrescar" onPress={onRefresh} />
      </View>
      <View style={styles.actions}>
        <Button title="Limpiar historial" color="#c62828" onPress={clearHistory} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  screenTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  listContent: { paddingBottom: 24 },
  card: { padding: 12, borderRadius: 8, backgroundColor: '#f5f5f5', marginBottom: 10 },
  date: { fontSize: 12, color: '#616161', marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  body: { fontSize: 14, color: '#333' },
  actions: { marginTop: 8 },
  empty: { alignItems: 'center', marginTop: 24 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptyHint: { fontSize: 14, color: '#616161', marginTop: 4 },
});
