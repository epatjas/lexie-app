import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../i18n/LanguageContext';
import theme from '../styles/theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

// Fix the navigation type
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function FontSelectionLink() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  
  return (
    <TouchableOpacity 
      style={styles.button}
      onPress={() => navigation.navigate('FontSelection')}
    >
      <Text style={styles.buttonText}>{t('fontSettings.goToSettings')}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 10,
    backgroundColor: theme.colors.primary,
    margin: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  buttonText: {
    // Fix the theme colors reference
    color: '#FFFFFF', // Direct color value instead of using theme.colors.white
    fontSize: 16,
    fontFamily: theme.fonts.regular
  }
}); 