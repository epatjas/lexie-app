import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import FontSelectionSheet from '../components/FontSelectionSheet';
import theme from '../styles/theme';
import { useTranslation } from '../i18n/LanguageContext';

type FontSelectionScreenProps = NativeStackScreenProps<RootStackParamList, 'FontSelection'>;

export default function FontSelectionScreen({ navigation }: FontSelectionScreenProps) {
  const { t } = useTranslation();
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('fontSettings.title')}</Text>
      </View>
      <FontSelectionSheet
        visible={true}
        onClose={() => navigation.goBack()}
        onBack={() => navigation.goBack()}
        selectedFont="Standard"
        fontSize={16}
        isAllCaps={false}
        onFontChange={() => {}}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.stroke,
  },
  title: {
    fontSize: 18,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
    textAlign: 'center',
  }
}); 