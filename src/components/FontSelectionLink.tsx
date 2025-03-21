import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function FontSelectionLink() {
  const navigation = useNavigation();
  
  return (
    <TouchableOpacity 
      style={{ padding: 10, backgroundColor: 'blue', margin: 10 }}
      onPress={() => navigation.navigate('FontSelection')}
    >
      <Text style={{ color: 'white' }}>Go to Font Settings</Text>
    </TouchableOpacity>
  );
} 