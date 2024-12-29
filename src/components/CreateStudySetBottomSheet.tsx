import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView, Platform } from 'react-native';
import { Camera, Image as ImageIcon } from 'lucide-react-native';
import theme from '../styles/theme';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  onClose: () => void;
}

export default function CreateStudySetBottomSheet({ onClose }: Props) {
  const navigation = useNavigation<NavigationProp>();

  const handleImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      alert('Permission to access camera roll is required!');
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
      navigation.navigate('Preview', { photos });
    }
  };

  const handleScanPress = () => {
    onClose();
    navigation.navigate('ScanPage');
  };

  return (
    <Modal
      visible={true}
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
              <Text style={styles.optionTitle}>Skannaa</Text>
              <Text style={styles.optionDescription}>
                Skannaa kirjasta tai muistiinpanoista
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleImagePicker}>
            <View style={[styles.iconContainer, { backgroundColor: '#FFEBA1' }]}>
              <ImageIcon size={24} color={theme.colors.background} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.optionTitle}>Lataa kuva</Text>
              <Text style={styles.optionDescription}>
                Valitse kuva laitteeltasi
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
    backgroundColor: '#1C1D29',
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
    marginBottom: theme.spacing.xl,
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