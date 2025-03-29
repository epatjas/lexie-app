import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';

const DevMenu = () => {
  const [visible, setVisible] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  useEffect(() => {
    // Reset tap count after 3 seconds of inactivity
    const timer = setTimeout(() => {
      setTapCount(0);
    }, 3000);

    // If user tapped 5 times in succession, show the dev menu
    if (tapCount >= 5) {
      setVisible(true);
      setTapCount(0);
    }

    return () => clearTimeout(timer);
  }, [tapCount]);

  const handleHiddenTap = () => {
    setTapCount(prev => prev + 1);
  };

  return (
    <>
      {/* The hidden tap area - place this in a corner of your app */}
      <TouchableOpacity
        style={styles.hiddenTapArea}
        onPress={handleHiddenTap}
        activeOpacity={1}
      />

      {/* Developer menu modal */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>Developer Menu</Text>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                navigation.navigate('AnalyticsManager');
                setVisible(false);
              }}
            >
              <Text style={styles.menuItemText}>Analytics Dashboard</Text>
            </TouchableOpacity>
            
            {/* Add other developer options here */}
            
            <TouchableOpacity
              style={[styles.menuItem, styles.closeButton]}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  hiddenTapArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 50,
    height: 50,
    zIndex: 100,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    width: '80%',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: theme.colors.background02,
  },
  menuItemText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  closeButton: {
    backgroundColor: theme.colors.primary,
    marginTop: 10,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default DevMenu; 