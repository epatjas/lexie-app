import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet
} from 'react-native';
import { analyzeImage } from '../services/api';
import { createStudySet } from '../services/Database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type PreviewScreenNavigationProp = NativeStackScreenProps<RootStackParamList, 'Preview'>;

export default function PreviewScreen({ route, navigation }: PreviewScreenNavigationProp) {
  const { photo } = route.params;
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleAnalyze = async () => {
    setIsProcessing(true);
    try {
      // Send image to server for analysis
      const studyMaterials = await analyzeImage(photo.base64);
      
      // Save study materials to local database
      const studySet = await createStudySet({
        title: studyMaterials.title,
        description: studyMaterials.text,
        flashcards: studyMaterials.flashcards.map(card => ({
          front: card.front,
          back: card.back
        })),
        quiz: studyMaterials.quiz
      });

      // Show success message and navigate to study set
      Alert.alert(
        'Success',
        'Study materials created successfully!',
        [
          {
            text: 'View Study Set',
            onPress: () => navigation.navigate('StudySet', { id: studySet.id })
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to process image. Please try again.',
        [
          {
            text: 'Retry',
            onPress: handleAnalyze
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: photo.uri }}
        style={styles.preview}
        resizeMode="contain"
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleAnalyze}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              Create Study Set
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  preview: {
    flex: 1,
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    width: '45%',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    color: '#000000',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
});
