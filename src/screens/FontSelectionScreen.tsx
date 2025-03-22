import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import FontSelectionSheet from '../components/FontSelectionSheet';
import theme from '../styles/theme';

type FontSelectionScreenProps = NativeStackScreenProps<RootStackParamList, 'FontSelection'>;

export default function FontSelectionScreen({ navigation }: FontSelectionScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
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
}); 