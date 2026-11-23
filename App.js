import React, { useState, useEffect, useRef } from 'react';
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
  StatusBar,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@uniform_orders_key';

export default function App() {
  // Formular-States
  const [name, setName] = useState('');
  const [dateInput, setDateInput] = useState(''); 
  const [quantity, setQuantity] = useState(''); 
  const [editingId, setEditingId] = useState(null); 
  
  // Refs für den automatischen Fokuswechsel (Formular)
  const dateInputRef = useRef(null);
  const quantityInputRef = useRef(null);

  // App-Daten-States
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderSortField, setOrderSortField] = useState('date'); // 'name' oder 'date'
  
  // Sortier-States für Statistiken (Standard auf 'totalQuantity' und absteigend)
  const [statSortField, setStatSortField] = useState('totalQuantity'); 
  const [statSortDirection, setStatSortDirection] = useState('desc'); 
  
  // Datums- und Namensfilter-States für Statistiken
  const [statSearchQuery, setStatSearchQuery] = useState('');
  const [statStartDate, setStatStartDate] = useState('');
  const [statEndDate, setStatEndDate] = useState('');
  const statEndDateInputRef = useRef(null);

  // State für Mitarbeiter-Profil Modal
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // UI-States
  const [darkMode, setDarkMode] = useState(false);
  const [backupText, setBackupText] = useState('');
  const [activeTab, setActiveTab] = useState('orders'); 

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

  // Hilfsfunktion zur Umwandlung von TTMMJJJJ in TT.MM.JJJJ
  const formatDisplayDate = (input) => {
    const cleaned = input.replace(/\D/g, '');
    if (cleaned.length !== 8) return input;
    
    const day = cleaned.substring(0, 2);
    const month = cleaned.substring(2, 4);
    const year = cleaned.substring(4, 8);
    
    return `${day}.${month}.${year}`;
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(0);
  };

  const parseRawInputDate = (rawInput) => {
    const cleaned = rawInput.replace(/\D/g, '');
    if (cleaned.length !== 8) return null;
    const day = parseInt(cleaned.substring(0, 2), 10);
    const month = parseInt(cleaned.substring(2, 4), 10) - 1;
    const year = parseInt(cleaned.substring(4, 8), 10);
    return new Date(year, month, day);
  };

  const handleDateChange = (text) => {
    setDateInput(text);
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length === 8) {
      quantityInputRef.current?.focus();
    }
  };

  const handleStatStartDateChange = (text) => {
    setStatStartDate(text);
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length === 8) {
      statEndDateInputRef.current?.focus();
    }
  };

  const saveOrder = async () => {
    if (!name.trim() || !dateInput.trim() || !quantity.trim()) {
      Alert.alert('Fehler', 'Bitte fülle alle Felder aus.');
      return;
    }

    if (dateInput.replace(/\D/g, '').length !== 8) {
      Alert.alert('Fehler', 'Das Datum muss im Format TT.MM.JJJJ eingegeben werden.');
      return;
    }

    const formattedDate = formatDisplayDate(dateInput);

    let updatedOrders;

    if (editingId) {
      updatedOrders = orders.map(order => {
        if (order.id === editingId) {
          return { ...order, name: name.trim(), date: formattedDate, quantity: quantity.trim() };
        }
        return order;
      });
      setEditingId(null);
    } else {
      const newOrder = {
        id: Date.now().toString(),
        name: name.trim(),
        date: formattedDate,
        quantity: quantity.trim()
      };
      updatedOrders = [newOrder, ...orders];
    }
    
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
      setOrders(updatedOrders);
      
      setName('');
      setDateInput('');
      setQuantity('');
      Keyboard.dismiss();
      Alert.alert('Erfolg', editingId ? 'Bestellung aktualisiert!' : 'Bestellung wurde registriert!');
    } catch (error) {
      Alert.alert('Fehler', 'Speichern fehlgeschlagen.');
    }
  };

  const startEditOrder = (order) => {
    setName(order.name);
    setQuantity(order.quantity ? order.quantity : '1');
    const rawDate = order.date.replace(/\./g, '');
    setDateInput(rawDate);
    setEditingId(order.id);
  };

  // Löschen mit Sicherheitsabfrage
  const confirmDeleteOrder = (id, employeeName) => {
    Alert.alert(
      'Bestellung löschen',
      `Möchtest du den Eintrag für "${employeeName}" wirklich unwiderruflich löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'Löschen', 
          style: 'destructive', 
          onPress: () => deleteOrder(id) 
        }
      ]
    );
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
        setQuantity('');
      }
    } catch (error) {
      Alert.alert('Fehler', 'Löschen fehlgeschlagen.');
    }
  };

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

  const handleStatHeaderPress = (field) => {
    if (statSortField === field) {
      setStatSortDirection(statSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setStatSortField(field);
      setStatSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  const calculatePeriodQuantity = (employeeOrders, months) => {
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    return employeeOrders.reduce((total, order) => {
      const orderDate = parseDate(order.date);
      if (orderDate >= cutoffDate && orderDate <= now) {
        return total + (parseInt(order.quantity) || 1);
      }
      return total;
    }, 0);
  };

  const getStatistics = () => {
    const startDateObj = parseRawInputDate(statStartDate);
    const endDateObj = parseRawInputDate(statEndDate);

    if (endDateObj) {
      endDateObj.setHours(23, 59, 59, 999);
    }

    const filteredOrders = orders.filter(order => {
      const orderDate = parseDate(order.date);
      if (startDateObj && orderDate < startDateObj) return false;
      if (endDateObj && orderDate > endDateObj) return false;
      if (statSearchQuery.trim() !== '' && !order.name.toLowerCase().includes(statSearchQuery.toLowerCase().trim())) return false;
      return true;
    });

    const statsMap = {};
    const employeeAllOrders = {};

    orders.forEach(order => {
      const emp = order.name;
      if (!employeeAllOrders[emp]) employeeAllOrders[emp] = [];
      employeeAllOrders[emp].push(order);
    });

    filteredOrders.forEach(order => {
      const employee = order.name;
      const q = parseInt(order.quantity) || 1;
      
      if (!statsMap[employee]) {
        statsMap[employee] = { count: 0, totalQuantity: 0, lastOrderDate: order.date };
      } else {
        const currentDate = parseDate(order.date);
        const storedDate = parseDate(statsMap[employee].lastOrderDate);
        if (currentDate > storedDate) {
          statsMap[employee].lastOrderDate = order.date;
        }
      }
      statsMap[employee].count += 1;
      statsMap[employee].totalQuantity += q;
    });

    const statsArray = Object.keys(statsMap).map(employee => {
      const empOrders = employeeAllOrders[employee] || [];
      return {
        name: employee,
        count: statsMap[employee].count,
        totalQuantity: statsMap[employee].totalQuantity,
        m3: calculatePeriodQuantity(empOrders, 3),
        m6: calculatePeriodQuantity(empOrders, 6),
        m12: calculatePeriodQuantity(empOrders, 12),
        lastOrderDate: statsMap[employee].lastOrderDate
      };
    });

    return statsArray.sort((a, b) => {
      let comparison = 0;
      if (statSortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (statSortField === 'totalQuantity') {
        comparison = a.totalQuantity - b.totalQuantity;
      } else if (statSortField === 'count') {
        comparison = a.count - b.count;
      } else if (statSortField === 'm3') {
        comparison = a.m3 - b.m3;
      } else if (statSortField === 'm6') {
        comparison = a.m6 - b.m6;
      } else if (statSortField === 'm12') {
        comparison = a.m12 - b.m12;
      }
      return statSortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const getEmployeeHistory = (employeeName) => {
    if (!employeeName) return [];
    return orders
      .filter(order => order.name.toLowerCase() === employeeName.toLowerCase())
      .sort((a, b) => parseDate(b.date) - parseDate(a.date));
  };

  const getFilteredAndSortedOrders = () => {
    let result = orders.filter(order => 
      order.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (orderSortField === 'name') {
      return result.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      return result.sort((a, b) => parseDate(b.date) - parseDate(a.date));
    }
  };

  const theme = {
    bg: darkMode ? '#121212' : '#f5f5f5',
    card: darkMode ? '#1e1e1e' : '#ffffff',
    text: darkMode ? '#ffffff' : '#333333',
    subText: darkMode ? '#aaaaaa' : '#666666',
    inputBg: darkMode ? '#2d2d2d' : '#fafafa',
    inputBorder: darkMode ? '#444444' : '#cccccc',
    headerBg: darkMode ? '#1a1a1a' : '#003366',
    navBtnActive: darkMode ? '#444444' : '#002244',
    
    // 1. Bestellungen (Best.) -> Bernstein / Gelb-Orange
    countBg: darkMode ? '#452b00' : '#fef3c7',
    countText: darkMode ? '#f59e0b' : '#b45309',

    // 2. Gesamtstückzahl (Ges.) -> Royalblau
    totalBg: darkMode ? '#172554' : '#dbeafe',
    totalText: darkMode ? '#3b82f6' : '#1d4ed8',

    // 3. 3 Monate (3M) -> Kräftiges Rot
    m3Bg: darkMode ? '#4c0519' : '#ffe4e6',
    m3Text: darkMode ? '#fb7185' : '#e11d48',

    // 4. 6 Monate (6M) -> Klares Grün
    m6Bg: darkMode ? '#022c22' : '#d1fae5',
    m6Text: darkMode ? '#34d399' : '#047857',

    // 5. 12 Monate (12M) -> Türkis / Cyan
    m12Bg: darkMode ? '#083344' : '#cffafe',
    m12Text: darkMode ? '#22d3ee' : '#0e7490',

    modalOverlay: 'rgba(0,0,0,0.5)',
    actionBg: darkMode ? '#2a2a2a' : '#f0f2f5',
  };

  const renderSortIndicator = (field) => {
    if (statSortField !== field) return null;
    return statSortDirection === 'asc' ? ' ▲' : ' ▼';
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
          <Text style={styles.modeToggleText}>{darkMode ? '☀ Light' : '🌙 Dark'}</Text>
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
                  returnKeyType="next"
                  onSubmitEditing={() => dateInputRef.current?.focus()}
                  blurOnSubmit={false}
                />
                <TextInput
                  ref={dateInputRef}
                  style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="Datum: TT.MM.JJJJ (z.B. 22.06.2026)"
                  placeholderTextColor={theme.subText}
                  keyboardType="numeric"
                  maxLength={8}
                  value={dateInput}
                  onChangeText={handleDateChange}
                  returnKeyType="next"
                  onSubmitEditing={() => quantityInputRef.current?.focus()}
                  blurOnSubmit={false}
                />
                <TextInput
                  ref={quantityInputRef}
                  style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="Stückzahl"
                  placeholderTextColor={theme.subText}
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                  returnKeyType="done"
                  onSubmitEditing={saveOrder}
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={[styles.button, { flex: 1 }]} onPress={saveOrder}>
                    <Text style={styles.buttonText}>{editingId ? 'Speichern' : 'Hinzufügen'}</Text>
                  </TouchableOpacity>
                  {editingId && (
                    <TouchableOpacity 
                      style={[styles.button, { backgroundColor: '#6c757d' }]} 
                      onPress={() => { setEditingId(null); setName(''); setDateInput(''); setQuantity(''); }}
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
                {item.quantity && (
                  <Text style={[styles.dateText, { color: theme.subText }]}>Stückzahl: {item.quantity}</Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: theme.actionBg }]} 
                  onPress={() => startEditOrder(item)}
                >
                  <Text style={{ fontSize: 16 }}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: theme.actionBg }]} 
                  onPress={() => confirmDeleteOrder(item.id, item.name)}
                >
                  <Text style={{ fontSize: 16 }}>🗑️</Text>
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
          {/* Filter für Statistiken */}
          <View style={[styles.card, { backgroundColor: theme.card, marginBottom: 8 }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Statistiken filtern</Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              placeholder="🔍 Namen suchen..."
              placeholderTextColor={theme.subText}
              value={statSearchQuery}
              onChangeText={setStatSearchQuery}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="Von (TT.MM.JJJJ)"
                placeholderTextColor={theme.subText}
                keyboardType="numeric"
                maxLength={8}
                value={statStartDate}
                onChangeText={handleStatStartDateChange}
              />
              <TextInput
                ref={statEndDateInputRef}
                style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="Bis (TT.MM.JJJJ)"
                placeholderTextColor={theme.subText}
                keyboardType="numeric"
                maxLength={8}
                value={statEndDate}
                onChangeText={setStatEndDate}
              />
            </View>
            {(statStartDate !== '' || statEndDate !== '' || statSearchQuery !== '') && (
              <TouchableOpacity 
                style={{ marginTop: 6, alignSelf: 'flex-end' }}
                onPress={() => { setStatStartDate(''); setStatEndDate(''); setStatSearchQuery(''); }}
              >
                <Text style={{ color: '#dc3545', fontSize: 12, fontWeight: 'bold' }}>Filter zurücksetzen</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tabellen-Header */}
          <View style={[styles.statHeaderRow, { backgroundColor: theme.card }]}>
            <TouchableOpacity style={{ flex: 2.2 }} onPress={() => handleStatHeaderPress('name')}>
              <Text style={{ color: theme.text, fontSize: 11, fontWeight: 'bold' }} numberOfLines={1}>
                Mitarbeiter{renderSortIndicator('name')}
              </Text>
            </TouchableOpacity>
            
            {/* Best. Header (Bernstein) */}
            <TouchableOpacity style={{ flex: 1, alignItems: 'center', backgroundColor: theme.countBg, paddingVertical: 2, borderRadius: 4 }} onPress={() => handleStatHeaderPress('count')}>
              <Text style={{ color: theme.countText, fontSize: 11, textAlign: 'center', fontWeight: 'bold' }} numberOfLines={1}>
                Best.{renderSortIndicator('count')}
              </Text>
            </TouchableOpacity>
            
            {/* Ges. Header (Royalblau) */}
            <TouchableOpacity style={{ flex: 1, alignItems: 'center', backgroundColor: theme.totalBg, paddingVertical: 2, borderRadius: 4, marginHorizontal: 2 }} onPress={() => handleStatHeaderPress('totalQuantity')}>
              <Text style={{ color: theme.totalText, fontSize: 11, textAlign: 'center', fontWeight: 'bold' }} numberOfLines={1}>
                Ges.{renderSortIndicator('totalQuantity')}
              </Text>
            </TouchableOpacity>

            {/* 3M Header (Rot) */}
            <TouchableOpacity style={{ flex: 1, alignItems: 'center', backgroundColor: theme.m3Bg, paddingVertical: 2, borderRadius: 4 }} onPress={() => handleStatHeaderPress('m3')}>
              <Text style={{ color: theme.m3Text, fontSize: 11, textAlign: 'center', fontWeight: 'bold' }} numberOfLines={1}>
                3M{renderSortIndicator('m3')}
              </Text>
            </TouchableOpacity>

            {/* 6M Header (Grün) */}
            <TouchableOpacity style={{ flex: 1, alignItems: 'center', backgroundColor: theme.m6Bg, paddingVertical: 2, borderRadius: 4, marginHorizontal: 2 }} onPress={() => handleStatHeaderPress('m6')}>
              <Text style={{ color: theme.m6Text, fontSize: 11, textAlign: 'center', fontWeight: 'bold' }} numberOfLines={1}>
                6M{renderSortIndicator('m6')}
              </Text>
            </TouchableOpacity>

            {/* 12M Header (Türkis) */}
            <TouchableOpacity style={{ flex: 1.1, alignItems: 'center', backgroundColor: theme.m12Bg, paddingVertical: 2, borderRadius: 4 }} onPress={() => handleStatHeaderPress('m12')}>
              <Text style={{ color: theme.m12Text, fontSize: 11, textAlign: 'center', fontWeight: 'bold' }} numberOfLines={1}>
                12M{renderSortIndicator('m12')}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={getStatistics()}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.statItemRow, { backgroundColor: theme.card }]}
                onPress={() => setSelectedEmployee(item.name)}
              >
                <View style={{ flex: 2.2 }}>
                  <Text style={[styles.orderTextBold, { color: theme.text, fontSize: 12 }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
                
                {/* Best. Zelle (Bernstein) */}
                <Text style={[styles.orderTextBold, { color: theme.countText, flex: 1, textAlign: 'center', fontSize: 12, backgroundColor: theme.countBg, paddingVertical: 4, borderRadius: 4 }]}>
                  {item.count}
                </Text>
                {/* Ges. Zelle (Royalblau) */}
                <Text style={[styles.orderTextBold, { color: theme.totalText, flex: 1, textAlign: 'center', fontSize: 12, backgroundColor: theme.totalBg, paddingVertical: 4, borderRadius: 4, marginHorizontal: 2 }]}>
                  {item.totalQuantity}
                </Text>
                {/* 3M Zelle (Rot) */}
                <Text style={[styles.orderTextBold, { color: theme.m3Text, flex: 1, textAlign: 'center', fontSize: 12, backgroundColor: theme.m3Bg, paddingVertical: 4, borderRadius: 4 }]}>
                  {item.m3}
                </Text>
                {/* 6M Zelle (Grün) */}
                <Text style={[styles.orderTextBold, { color: theme.m6Text, flex: 1, textAlign: 'center', fontSize: 12, backgroundColor: theme.m6Bg, paddingVertical: 4, borderRadius: 4, marginHorizontal: 2 }]}>
                  {item.m6}
                </Text>
                {/* 12M Zelle (Türkis) */}
                <Text style={[styles.orderTextBold, { color: theme.m12Text, flex: 1.1, textAlign: 'center', fontSize: 12, backgroundColor: theme.m12Bg, paddingVertical: 4, borderRadius: 4 }]}>
                  {item.m12}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: theme.subText }]}>Keine Daten für Statistiken vorhanden.</Text>
            }
          />
        </View>
      )}

      {/* MODAL: MITARBEITER-PROFIL & BESTELLHISTORIE */}
      <Modal
        visible={selectedEmployee !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedEmployee(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Mitarbeiter-Profil
              </Text>
              <TouchableOpacity onPress={() => setSelectedEmployee(null)}>
                <Text style={[styles.closeModalText, { color: theme.subText }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.employeeName, { color: theme.statNumber }]}>
              {selectedEmployee}
            </Text>

            <Text style={[styles.sectionSubtitle, { color: theme.subText, marginTop: 4 }]}>
              Bestellhistorie ({getEmployeeHistory(selectedEmployee).length} Einträge):
            </Text>

            <FlatList
              data={getEmployeeHistory(selectedEmployee)}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 260, marginVertical: 6 }}
              renderItem={({ item }) => (
                <View style={[styles.historyItem, { borderColor: theme.inputBorder }]}>
                  <Text style={[styles.historyText, { color: theme.text, flex: 1 }]}>
                    📅 {item.date}
                  </Text>
                  <View style={styles.historyQuantityContainer}>
                    <Text style={[styles.historyText, { color: theme.text }]}>
                      Stückzahl:
                    </Text>
                    <Text style={[styles.historyText, { color: theme.text, fontWeight: 'bold', width: 28, textAlign: 'right' }]}>
                      {item.quantity || 1}
                    </Text>
                  </View>
                </View>
              )}
            />

            <TouchableOpacity 
              style={[styles.button, { marginTop: 10 }]} 
              onPress={() => setSelectedEmployee(null)}
            >
              <Text style={styles.buttonText}>Schließen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* INHALT: TAB BACKUP */}
      {activeTab === 'backup' && (
        <ScrollView style={{ padding: 10 }}>
          {/* Benutzerhandbuch / Anleitung */}
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>📖 Benutzerhandbuch</Text>
            <Text style={[styles.devText, { color: theme.subText, marginBottom: 8 }]}>
              • <Text style={{ fontWeight: 'bold', color: theme.text }}>Bestellungen erfassen:</Text> Gib den Namen ein und drücke Enter, um zum Datumsfeld zu springen. Nach Eingabe der Stückzahl speichert ein weiterer Druck auf Enter die Bestellung automatisch.
            </Text>
            <Text style={[styles.devText, { color: theme.subText, marginBottom: 8 }]}>
              • <Text style={{ fontWeight: 'bold', color: theme.text }}>Datumsformat:</Text> Gib das Datum 8-stellig ein (z.B. 22062026 für den 22.06.2026). Es wird automatisch formatiert.
            </Text>
            <Text style={[styles.devText, { color: theme.subText, marginBottom: 8 }]}>
              • <Text style={{ fontWeight: 'bold', color: theme.text }}>Bearbeiten & Löschen:</Text> Nutze die Symbole neben den Einträgen. Das Löschen erfordert eine Sicherheitsbestätigung.
            </Text>
            <Text style={[styles.devText, { color: theme.subText, marginBottom: 4 }]}>
              • <Text style={{ fontWeight: 'bold', color: theme.text }}>Statistiken & Profile:</Text> 3M (Rot), 6M (Grün) und 12M (Türkis) besitzen nun klare, unterscheidbare Farben. Alle Spalten sind klickbar zum Sortieren.
            </Text>
          </View>

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

          {/* Entwicklerinformationen Box */}
          <View style={[styles.card, { backgroundColor: theme.card, marginTop: 5, padding: 12 }]}>
            <Text style={[styles.devTitle, { color: theme.text }]}>Entwickler-Informationen</Text>
            <Text style={[styles.devText, { color: theme.subText }]}>Entwickler: Özgür Cetin</Text>
            <Text style={[styles.devText, { color: theme.subText }]}>E-Mail: ozgur.cetin@web.de</Text>
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
  statHeaderRow: {
    flexDirection: 'row',
    marginHorizontal: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
    marginBottom: 4,
  },
  statItemRow: {
    marginHorizontal: 10,
    marginVertical: 4,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 6,
    flexDirection: 'row',
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
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 14,
  },
  devTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  devText: {
    fontSize: 13,
    lineHeight: 18,
  },
  // Modal & Profil Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeModalText: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 4,
  },
  employeeName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 6,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
  },
  historyQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyText: {
    fontSize: 14,
  }
});
