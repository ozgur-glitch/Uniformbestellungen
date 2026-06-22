import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView, 
  Alert,
  Keyboard
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

const STORAGE_KEY = '@uniform_orders_key';

export default function App() {
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [type, setType] = useState('');
  const [orders, setOrders] = useState([]);

  // Beim Start der App geladene Bestellungen auslesen
  useEffect(() => {
    loadOrders();
  }, []);

  // Daten aus dem AsyncStorage laden
  const loadOrders = async () => {
    try {
      const savedOrders = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedOrders !== null) {
        setOrders(JSON.parse(savedOrders));
      }
    } catch (error) {
      Alert.alert('Fehler', 'Bestellungen konnten nicht geladen werden.');
    }
  };

  // Bestellung speichern
  const saveOrder = async () => {
    if (!name || !size || !type) {
      Alert.alert('Fehler', 'Bitte fülle alle Felder aus.');
      return;
    }

    const newOrder = {
      id: Date.now().toString(),
      name: name,
      size: size,
      type: type,
    };

    const updatedOrders = [newOrder, ...orders];
    
    try {
      // Speichern im AsyncStorage (Kein Clipboard-Einsatz)
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
      setOrders(updatedOrders);
      
      // Formular zurücksetzen
      setName('');
      setSize('');
      setType('');
      Keyboard.dismiss();
      Alert.alert('Erfolg', 'Bestellung wurde gespeichert!');
    } catch (error) {
      Alert.alert('Fehler', 'Bestellung konnte nicht gespeichert werden.');
    }
  };

  // Einzelne Bestellung löschen
  const deleteOrder = async (id) => {
    const filteredOrders = orders.filter(order => order.id !== id);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredOrders));
      setOrders(filteredOrders);
    } catch (error) {
      Alert.alert('Fehler', 'Bestellung konnte nicht gelöscht werden.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Uniformen Bestellung</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder=" Name des Mitarbeiters"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder=" Uniform-Typ (z.B. Hemd, Hose, Jacke)"
          value={type}
          onChangeText={setType}
        />
        <TextInput
          style={styles.input}
          placeholder=" Größe (z.B. M, L, 52)"
          value={size}
          onChangeText={setSize}
        />
        <TouchableOpacity style={styles.button} onPress={saveOrder}>
          <Text style={styles.buttonText}>Bestellung hinzufügen</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Aktuelle Bestellungen ({orders.length})</Text>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.orderCard}>
            <View>
              <Text style={styles.orderTextBold}>{item.name}</Text>
              <Text style={styles.orderText}>{item.type} - Gr. {item.size}</Text>
            </View>
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={() => deleteOrder(item.id)}
            >
              <Text style={styles.deleteButtonText}>Löschen</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Noch keine Bestellungen aufgenommen.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#003366',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  form: {
    padding: 20,
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#003366',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
    marginTop: 10,
    color: '#333',
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 5,
    borderLeftColor: '#003366',
  },
  orderTextBold: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  orderText: {
    color: '#555',
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: '#cc0000',
    padding: 8,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#888',
    fontSize: 16,
  },
});

