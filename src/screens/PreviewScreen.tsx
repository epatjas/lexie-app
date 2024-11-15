import React from 'react';
import { View, Image, StyleSheet, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import theme from '../styles/theme';

type RootStackParamList = {
  Home: undefined;
  ScanPage: undefined;
  Preview: {
    photo: {
      uri: string;
      base64?: string;
    };
  };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type PreviewRouteParams = {
  Preview: {
    photo: {
      uri: string;
      base64?: string;
    };
  };
};

export default function PreviewScreen() {
  const route = useRoute<RouteProp<PreviewRouteParams, 'Preview'>>();
  const navigation = useNavigation<NavigationProp>();
  const { photo } = route.params;
  
  // Get current date in format DD/MM/YYYY
  const currentDate = new Date().toLocaleDateString('en-GB');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan - {currentDate}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Image Preview */}
      <View style={styles.previewContainer}>
        <Image source={{ uri: photo.uri }} style={styles.preview} />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => {
            // TODO: Handle image upload and analysis
            console.log('Analyze image');
          }}
        >
          <Text style={styles.primaryButtonText}>I'm happy, let's go</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('ScanPage')}
        >
          <Text style={styles.secondaryButtonText}>Scan more</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 17,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  previewContainer: {
    flex: 1,
    margin: 20,
    position: 'relative',
  },
  preview: {
    flex: 1,
    borderRadius: 8,
  },
  actionButtons: {
    padding: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#4A6BE5',
    borderRadius: 100,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: theme.fonts.medium,
  },
  secondaryButton: {
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4A6BE5',
    fontSize: 16,
    fontFamily: theme.fonts.medium,
  },
});
