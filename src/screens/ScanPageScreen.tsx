import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Animated, ActivityIndicator, Platform, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft, X, Image as ImageIcon, Camera } from 'lucide-react-native';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';

// Define the screen props type
type ScanPageScreenProps = NativeStackScreenProps<RootStackParamList, 'ScanPage'>;

// Add this type for the route params
type ScanPageRouteParams = {
  existingPhotos?: Array<{uri: string; base64?: string}>;
};

export default function ScanPageScreen({ route, navigation }: ScanPageScreenProps) {
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setCameraReady] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const cameraInitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get existing photos from route params
  const existingPhotos = route.params?.existingPhotos || [];

  // Add logging to debug camera initialization
  useEffect(() => {
    console.log('ScanPageScreen mounted');
    console.log('Camera permission status:', permission);
    
    // Request camera permission if not already granted
    const checkPermission = async () => {
      if (!permission?.granted) {
        console.log('Requesting camera permission...');
        const result = await requestPermission();
        console.log('Permission request result:', result);
        if (!result.granted) {
          setPermissionError('Camera permission is required to scan photos');
        }
      }
    };
    
    checkPermission();
    
    // Set a timeout to detect camera initialization problems
    cameraInitTimeoutRef.current = setTimeout(() => {
      if (!isCameraReady) {
        console.log('Camera initialization timeout - camera not ready after 10 seconds');
        setCameraError('Camera initialization failed. Please try again.');
      }
    }, 10000); // 10 second timeout
    
    return () => {
      console.log('ScanPageScreen unmounting');
      if (cameraInitTimeoutRef.current) {
        clearTimeout(cameraInitTimeoutRef.current);
      }
    };
  }, [permission, requestPermission]);

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
    setCameraError(`Camera error: ${error.message || 'Unknown error'}`);
  };

  const startCapture = () => {
    if (!isCameraReady) {
      console.log('Cannot capture - camera not ready');
      return;
    }
    
    setIsCapturing(true);
    Animated.timing(progressAnimation, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start(async () => {
      await takePicture();
      setIsCapturing(false);
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
        Alert.alert('Error', 'Failed to take picture. Please try again.');
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

  // Enhanced permission handling UI
  if (!permission || permissionError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          {!permission && <ActivityIndicator size="large" color={theme.colors.primary} />}
          <Text style={styles.permissionText}>
            {permissionError || 'Checking camera permission...'}
          </Text>
          {permissionError && (
            <TouchableOpacity 
              style={styles.permissionButton} 
              onPress={() => requestPermission()}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.permissionButton, {marginTop: 10}]} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.permissionButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if camera fails to initialize
  if (cameraError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Camera Error</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.loadingContainer}>
          <Text style={styles.permissionText}>{cameraError}</Text>
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={resetCamera}
          >
            <Text style={styles.permissionButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.permissionButton, {marginTop: 10, backgroundColor: theme.colors.background02}]} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.permissionButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Take photo</Text>
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
              <Text style={styles.cameraLoadingText}>Starting camera...</Text>
            </View>
          )}
        </CameraView>
      </View>

      <View style={styles.bottomBar}>
        <View style={styles.controls}>
          <TouchableOpacity 
            style={[styles.captureButton, !isCameraReady && styles.disabledButton]} 
            onPress={startCapture}
            disabled={isCapturing || !isCameraReady}
          >
            <View style={styles.captureButtonOuterRing}>
              <Camera size={24} color={theme.colors.text} />
            </View>
            <Animated.View 
              style={[
                styles.progressRing,
                {
                  borderWidth: isCapturing ? 3 : 0,
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
