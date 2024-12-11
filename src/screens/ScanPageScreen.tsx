import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Animated } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, X, Image as ImageIcon, Camera } from 'lucide-react-native';
import theme from '../styles/theme';

// Define the navigation stack parameter list
type RootStackParamList = {
  Home: undefined;
  ScanPage: undefined;
  Preview: {
    photos: {
      uri: string;
      base64?: string;
    }[];
  };
};

// Type the navigation
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ScanPageScreen() {
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const navigation = useNavigation<NavigationProp>();
  const [isCapturing, setIsCapturing] = useState(false);
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const [capturedPhotos, setCapturedPhotos] = useState<Array<{uri: string; base64?: string}>>([]);

  const startCapture = () => {
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
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          base64: true,
        });
        if (photo?.uri) {
          const updatedPhotos = [...capturedPhotos, photo];
          setCapturedPhotos(updatedPhotos);
          navigation.navigate('Preview', { photos: updatedPhotos });
        }
      } catch (error) {
        console.error('Error taking picture:', error);
      }
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission}>
          <Text>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Skannaa</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} ref={cameraRef}>
          <View style={styles.cornerMarkers}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </CameraView>
      </View>

      <View style={styles.bottomBar}>
        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.captureButton} 
            onPress={startCapture}
            disabled={isCapturing}
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
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 17,
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
    margin: 20,
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
    backgroundColor: theme.colors.stroke,
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
});
