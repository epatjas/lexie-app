import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView, Platform } from 'react-native';
import { Camera, Image as ImageIcon } from 'lucide-react-native';
import theme from '../styles/theme';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { getActiveProfile } from '../utils/storage';
import { createStudySet } from '../services/Database';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  onClose: () => void;
  visible: boolean;
  existingPhotos?: Array<{
    uri: string;
    base64?: string;
  }>;
}

export default function CreateStudySetBottomSheet({ onClose, visible, existingPhotos }: Props) {
  console.log('CreateStudySetBottomSheet rendered with:', { visible, existingPhotos });
  
  const navigation = useNavigation<NavigationProp>();

  const handleImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      alert('Permission to access camera roll is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
      base64: true,
    });

    if (!result.canceled) {
      const photos = result.assets.map(asset => ({
        uri: asset.uri,
        base64: asset.base64 || undefined,
      }));
      
      onClose();
      navigation.navigate('Preview', { 
        photos: [...(existingPhotos || []), ...photos]
      });
    }
  };

  const handleScanPress = () => {
    console.log('handleScanPress called, navigating to ScanPage');
    
    const navigateToScan = () => {
      navigation.navigate('ScanPage', { 
        openBottomSheet: false,
        existingPhotos: existingPhotos 
      });
    };
    
    onClose();
    setTimeout(navigateToScan, 100);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1} 
        onPress={onClose}
      >
        <View 
          style={styles.container}
          onStartShouldSetResponder={() => true}
          onTouchEnd={e => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <TouchableOpacity style={styles.option} onPress={handleScanPress}>
            <View style={[styles.iconContainer, { backgroundColor: '#D9EAFD' }]}>
              <Camera size={24} color={theme.colors.background} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.optionTitle}>Take photo</Text>
              <Text style={styles.optionDescription}>
              Use camera to capture your work
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleImagePicker}>
            <View style={[styles.iconContainer, { backgroundColor: '#FFEBA1' }]}>
              <ImageIcon size={24} color={theme.colors.background} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.optionTitle}>Choose photo</Text>
              <Text style={styles.optionDescription}>
              Pick one from your device
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(11, 9, 17, 0.2)',
  },
  container: {
    backgroundColor: theme.colors.background01,
    borderRadius: 40,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    
  },
  handle: {
    width: 32,
    height: 4,
    backgroundColor: theme.colors.stroke,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background02,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
}); 