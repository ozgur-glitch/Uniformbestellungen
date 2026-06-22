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
  Keyboard,
  ScrollView,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@uniform_orders_key';

export default function App() {
  // Formular-States
  const [name, setName] = useState('');
  const [dateInput, setDateInput] = useState(''); // Startet immer komplett leer
  const [editingId, setEditingId] = useState(null); // ID der Bestellung, die bearbeitet wird
  
  // App-Daten-States
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderSortField, setOrderSortField] = useState('date'); // 'name' oder 'date'
  const [statSortField, setStatSortField] = useState('count'); // 'name' oder 'count'
  
  // UI-States
  const [darkMode, setDarkMode] = useState(false);
  const [backupText, setBackupText] = useState('');
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'stats', 'backup'

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const savedOrders = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedOrders !== null) {
        setOrders(JSON.parse(savedOrders));
      }
    } catch (error) {
      Alert.alert('Fehler', 'Daten konnten nicht geladen werden.');
    }
  };

  // Hilfsfunktion zur Umwandlung von TTMMJJ in TT.MM.JJJJ
  const formatDisplayDate = (input) => {
    const cleaned = input.replace(/\D/g, '');
    if (cleaned.length !== 6) return input;
    
    const day = cleaned.substring(0, 2);
    const month = cleaned.substring(2, 4);
    const yearShort = cleaned.substring(4, 6);
    
    const yearCurrentShort = new Date().getFullYear() % 100;
    const century = parseInt(yearShort) <= yearCurrentShort + 10 ? '20' : '19';
    
    return `${day}.${month}.${century}${yearShort}`;
  };

  const saveOrder = async () => {
    if (!name.trim() || !dateInput.trim()) {
      Alert.alert('Fehler', 'Bitte fülle alle Felder aus.');
      return;
    }

    if (dateInput.replace(/\D/g, '').length !== 6) {
      Alert.alert('Fehler', 'Das Datum muss im Format TTMMJJ eingegeben werden (z.B. 220626).');
      return;
    }

    const formattedDate = formatDisplayDate(dateInput);

    let updatedOrders;

    if (editingId) {
      updatedOrders = orders.map(order => {
        if (order.id === editingId) {
          return { ...order, name: name.trim(), date: formattedDate };
        }
        return order;
      });
      setEditingId(null);
    } else {
      const newOrder = {
        id: Date.now().toString(),
        name: name.trim(),
        date: formattedDate
      };
      updatedOrders = [newOrder, ...orders];
    }
    
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
      setOrders(updatedOrders);
      
      setName('');
      setDateInput(''); // Leert das Datumsfeld nach dem Speichern wieder
      Keyboard.dismiss();
      Alert.alert('Erfolg', editingId ? 'Bestellung aktualisiert!' : 'Bestellung wurde registriert!');
    } catch (error) {
      Alert.alert('Fehler', 'Speichern fehlgeschlagen.');
    }
  };

  const startEditOrder = (order) => {
    setName(order.name);
    const rawDate = order.date.replace(/\./g, '');
    if (rawDate.length === 8) {
      const dd = rawDate.substring(0, 2);
      const mm = rawDate.substring(2, 4);
      const yy = rawDate.substring(6, 8);
      setDateInput(`${dd}${mm}${yy}`);
    } else {
      setDateInput(rawDate);
    }
    setEditingId(order.id);
  };

  const deleteOrder = async (id) => {
    const filteredOrders = orders.filter(order => order.id !== id);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredOrders));
      setOrders(filteredOrders);
      if (editingId === id) {
        setEditingId(null);
        setName('');
        setDateInput('');
      }
    } catch (error) {
      Alert.alert('Fehler', 'Löschen fehlgeschlagen.');
    }
  };

  // --- BACKUP FUNKTIONEN ---
  const generateBackupString = () => {
    if (orders.length === 0) {
      Alert.alert('Hinweis', 'Keine Daten zum Exportieren vorhanden.');
      return;
    }
    setBackupText(JSON.stringify(orders));
    Alert.alert('Backup generiert', 'Kopiere den Text aus dem grauen Feld unten manuell, um ihn zu sichern.');
  };

  const importBackupString = async () => {
    if (!backupText.trim()) {
      Alert.alert('Fehler', 'Bitte füge zuerst einen gültigen Backup-String in das Feld ein.');
      return;
    }
    try {
      const parsed = JSON.parse(backupText);
      if (Array.isArray(parsed)) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        setOrders(parsed);
        Alert.alert('Erfolg', 'Backup erfolgreich eingespielt!');
        setBackupText('');
      } else {
        Alert.alert('Fehler', 'Ungültiges Backup-Format.');
      }
    } catch (e) {
      Alert.alert('Fehler', 'Der eingegebene Text ist kein gültiges Backup.');
    }
  };

  // --- STATISTIK GENERIEREN ---
  const getStatistics = () => {
    const statsMap = {};
    orders.forEach(order => {
      const employee = order.name;
      statsMap[employee] = (statsMap[employee] || 0) + 1;
    });

    const statsArray = Object.keys(statsMap).map(employee => ({
      name: employee,
      count: statsMap[employee]
    }));

    if (statSortField === 'name') {
      return statsArray.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      return statsArray.sort((a, b) => b.count - a.count);
    }
  };

  // --- FILTER & SORTIERUNG BESTELLUNGEN ---
  const getFilteredAndSortedOrders = () => {
    let result = orders.filter(order => 
      order.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (orderSortField === 'name') {
      return result.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      return result.sort((a, b) => b.date.localeCompare(a.date));
    }
  };

  // Dynamische Styles für den Darkmode
  const theme = {
    bg: darkMode ? '#121212' : '#f5f5f5',
    card: darkMode ? '#1e1e1e' : '#ffffff',
    text: darkMode ? '#ffffff' : '#333333',
    subText: darkMode ? '#aaaaaa' : '#666666',
    inputBg: darkMode ? '#2d2d2d' : '#fafafa',
    inputBorder: darkMode ? '#444444' : '#cccccc',
    headerBg: darkMode ? '#1a1a1a' : '#003366',
    navBtnActive: darkMode ? '#444444' : '#002244',
    statNumber: darkMode ? '#3b82f6' : '#003366' // Dynamische Farbe für besseren Darkmode-Kontrast
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.headerBg} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
        <Text style={styles.headerTitle}>Uniformen Verwaltung</Text>
        <TouchableOpacity 
          style={styles.modeToggle} 
          onPress={() => setDarkMode(!darkMode)}
        >
          <Text style={styles.modeToggleText}>{darkMode ? '☀️ Light' : '🌙 Dark'}</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'orders' && { backgroundColor: theme.navBtnActive }]} 
          onPress={() => { setActiveTab('orders'); }}
        >
          <Text style={styles.tabText}>Bestellungen</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'stats' && { backgroundColor: theme.navBtnActive }]} 
          onPress={() => setActiveTab('stats')}
        >
          <Text style={styles.tabText}>Statistiken</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'backup' && { backgroundColor: theme.navBtnActive }]} 
          onPress={() => setActiveTab('backup')}
        >
          <Text style={styles.tabText}>Backup</Text>
        </TouchableOpacity>
      </View>

      {/* INHALT: TAB BESTELLUNGEN */}
      {activeTab === 'orders' && (
        <FlatList
          data={getFilteredAndSortedOrders()}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View>
              {/* Formular */}
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {editingId ? 'Bestellung bearbeiten' : 'Neue Bestellung'}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="Mitarbeiter Name"
                  placeholderTextColor={theme.subText}
                  value={name}
                  onChangeText={setName}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="Bestelldatum (Format: TTMMJJ, z.B. 220626)"
                  placeholderTextColor={theme.subText}
                  keyboardType="numeric"
                  maxLength={6}
                  value={dateInput}
                  onChangeText={setDateInput}
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={[styles.button, { flex: 1 }]} onPress={saveOrder}>
                    <Text style={styles.buttonText}>{editingId ? 'Speichern' : 'Hinzufügen'}</Text>
                  </TouchableOpacity>
                  {editingId && (
                    <TouchableOpacity 
                      style={[styles.button, { backgroundColor: '#6c757d' }]} 
                      onPress={() => { setEditingId(null); setName(''); setDateInput(''); }}
                    >
                      <Text style={styles.buttonText}>Abbrechen</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Suche und Sortierung */}
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="🔍 Namen suchen..."
                  placeholderTextColor={theme.subText}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <View style={styles.sortContainer}>
                  <Text style={{ color: theme.text, marginRight: 10 }}>Sortieren nach:</Text>
                  <TouchableOpacity 
                    style={[styles.miniBtn, orderSortField === 'date' && styles.miniBtnActive]}
                    onPress={() => setOrderSortField('date')}
                  >
                    <Text style={styles.miniBtnText}>Datum</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.miniBtn, orderSortField === 'name' && styles.miniBtnActive]}
                    onPress={() => setOrderSortField('name')}
                  >
                    <Text style={styles.miniBtnText}>Name</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.orderCard, { backgroundColor: theme.card }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.orderTextBold, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.dateText, { color: theme.subText }]}>Datum: {item.date}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.editButton} onPress={() => startEditOrder(item)}>
                  <Text style={styles.editButtonText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteOrder(item.id)}>
                  <Text style={styles.deleteButtonText}>X</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.subText }]}>Keine passenden Einträge gefunden.</Text>
          }
        />
      )}

      {/* INHALT: TAB STATISTIKEN */}
      {activeTab === 'stats' && (
        <View style={{ flex: 1, padding: 10 }}>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.sortContainer}>
              <Text style={{ color: theme.text, marginRight: 10 }}>Sortieren nach:</Text>
              <TouchableOpacity 
                style={[styles.miniBtn, statSortField === 'count' && styles.miniBtnActive]}
                onPress={() => setStatSortField('count')}
              >
                <Text style={styles.miniBtnText}>Anzahl</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.miniBtn, statSortField === 'name' && styles.miniBtnActive]}
                onPress={() => setStatSortField('name')}
              >
                <Text style={styles.miniBtnText}>Name</Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={getStatistics()}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <View style={[styles.orderCard, { backgroundColor: theme.card, flexDirection: 'row' }]}>
                {/* Name links fixiert */}
                <Text style={[styles.orderTextBold, { color: theme.text, flex: 1 }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {/* Dynamische Farbanpassung für perfekten Darkmode-Kontrast */}
                <Text style={[styles.orderTextBold, { color: theme.statNumber, fontWeight: 'bold', width: 60, textAlign: 'right' }]}>
                  {item.count}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: theme.subText }]}>Keine Daten für Statistiken vorhanden.</Text>
            }
          />
        </View>
      )}

      {/* INHALT: TAB BACKUP */}
      {activeTab === 'backup' && (
        <ScrollView style={{ padding: 10 }}>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Daten Sichern & Wiederherstellen</Text>
            <Text style={[styles.orderText, { color: theme.subText, marginBottom: 15 }]}>
              Generiere ein Backup, markiere den Text im Feld lange und kopiere ihn zur externen Sicherung. Zum Einspielen fügst du deinen alten Code hier ein.
            </Text>
            
            <TouchableOpacity style={[styles.button, { marginBottom: 10 }]} onPress={generateBackupString}>
              <Text style={styles.buttonText}>Backup-Code generieren</Text>
            </TouchableOpacity>

            <TextInput
              style={[styles.input, { height: 120, textAlignVertical: 'top', backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              multiline
              placeholder="Füge hier den Backup-String ein oder kopiere ihn heraus..."
              placeholderTextColor={theme.subText}
              value={backupText}
              onChangeText={setBackupText}
            />

            <TouchableOpacity style={[styles.button, { backgroundColor: '#28a745' }]} onPress={importBackupString}>
              <Text style={styles.buttonText}>Backup einspielen</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modeToggle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
  },
  modeToggleText: {
    color: '#fff',
    fontSize: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#003366',
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  tabText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  card: {
    margin: 10,
    padding: 15,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#003366',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  miniBtn: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginRight: 8,
  },
  miniBtnActive: {
    backgroundColor: '#003366',
  },
  miniBtnText: {
    fontSize: 12,
    color: '#fff',
  },
  orderCard: {
    marginHorizontal: 10,
    marginVertical: 4,
    padding: 12,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
  },
  orderTextBold: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  orderText: {
    fontSize: 14,
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    marginTop: 4,
  },
  editButton: {
    backgroundColor: '#ffc107',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 14,
  }
});

