import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Animated, ActivityIndicator, Platform, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft, X, Image as ImageIcon, Camera } from 'lucide-react-native';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';
import { useTranslation } from '../i18n/LanguageContext';

// Define the screen props type
type ScanPageScreenProps = NativeStackScreenProps<RootStackParamList, 'ScanPage'>;

// Add this type for the route params
type ScanPageRouteParams = {
  existingPhotos?: Array<{uri: string; base64?: string}>;
};

export default function ScanPageScreen({ route, navigation }: ScanPageScreenProps) {
  const { t } = useTranslation();
  const cameraRef = useRef<any>(null);
  const [isCameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const cameraInitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get existing photos from route params
  const existingPhotos = route.params?.existingPhotos || [];

  // Remove permission checking logic since we handle it before navigation
  useEffect(() => {
    console.log('ScanPageScreen mounted');
    
    // Set a timeout to detect camera initialization problems
    cameraInitTimeoutRef.current = setTimeout(() => {
      if (!isCameraReady) {
        console.log('Camera initialization timeout');
        setCameraError(t('scanPage.cameraError'));
      }
    }, 10000);
    
    return () => {
      if (cameraInitTimeoutRef.current) {
        clearTimeout(cameraInitTimeoutRef.current);
      }
    };
  }, []);

  // Add this function to handle camera ready state
  const onCameraReady = () => {
    console.log('Camera is ready');
    setCameraReady(true);
    if (cameraInitTimeoutRef.current) {
      clearTimeout(cameraInitTimeoutRef.current);
    }
  };

  // Add this function to handle camera errors
  const onCameraError = (error: any) => {
    console.error('Camera error:', error);
    setCameraError(`${t('scanPage.cameraError')}: ${error.message || t('alerts.error')}`);
  };

  const startCapture = () => {
    if (!isCameraReady) {
      console.log('Cannot capture - camera not ready');
      return;
    }
    
    Animated.timing(progressAnimation, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start(async () => {
      await takePicture();
      progressAnimation.setValue(0);
    });
  };

  const takePicture = async () => {
    if (cameraRef.current && isCameraReady) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          base64: true,
        });
        if (photo?.uri) {
          // Combine new photo with existing photos
          const updatedPhotos = [...existingPhotos, photo];
          navigation.navigate('Preview', { photos: updatedPhotos });
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert(t('alerts.error'), t('alerts.takePictureError'));
      }
    }
  };

  const resetCamera = () => {
    setCameraError(null);
    setCameraReady(false);
    // Force re-render by adding a key to the CameraView
    setForceReset(prev => prev + 1);
  };

  // Add this state to force camera component re-mount when needed
  const [forceReset, setForceReset] = useState(0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('scanPage.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView 
          style={styles.camera} 
          ref={cameraRef}
          onCameraReady={onCameraReady}
          onMountError={onCameraError}
          key={`camera-${forceReset}`} // Force remount when needed
          enableTorch={false} // Disable torch by default
          facing="back" // Explicitly set the default camera
        >
          {isCameraReady ? (
            <View style={styles.cornerMarkers}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          ) : (
            <View style={styles.cameraLoadingContainer}>
              <ActivityIndicator size="large" color="white" />
              <Text style={styles.cameraLoadingText}>{t('scanPage.startingCamera')}</Text>
            </View>
          )}
        </CameraView>
      </View>

      <View style={styles.bottomBar}>
        <View style={styles.controls}>
          <TouchableOpacity 
            style={[styles.captureButton, !isCameraReady && styles.disabledButton]} 
            onPress={startCapture}
            disabled={!isCameraReady}
          >
            <View style={styles.captureButtonOuterRing}>
              <Camera size={24} color={theme.colors.text} />
            </View>
            <Animated.View 
              style={[
                styles.progressRing,
                {
                  borderWidth: isCameraReady ? 3 : 0,
                  borderColor: theme.colors.text,
                  transform: [{
                    rotate: progressAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    })
                  }]
                }
              ]}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background01,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cornerMarkers: {
    ...StyleSheet.absoluteFillObject,
    margin: 8,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#FFFFFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  bottomBar: {
    padding: 20,
    paddingBottom: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonOuterRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.background02,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  progressRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    marginTop: 20,
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  permissionButton: {
    marginTop: 20,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: theme.fonts.medium,
  },
  cameraLoadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  cameraLoadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
    fontFamily: theme.fonts.medium,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
