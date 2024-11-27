import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { analyzeImage } from '../services/api';
import { createStudySet, verifyDatabaseTables } from '../services/Database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ArrowLeft } from 'lucide-react-native';
import theme from '../styles/theme';

type PreviewScreenNavigationProp = NativeStackScreenProps<RootStackParamList, 'Preview'>;

// Update the interface to match the OpenAI response format
interface StudyMaterials {
  title: string;
  text_content: string;
  flashcards: {
    front: string;
    back: string;
  }[];
  quiz: {
    question: string;
    options: string[];  // This matches the format in your OpenAI prompt
    correct: string;
  }[];
}

export default function PreviewScreen({ route, navigation }: PreviewScreenNavigationProp) {
  const { photo } = route.params;
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  // Get formatted date for the header
  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const handleAnalyze = async () => {
    try {
      setIsProcessing(true);
      console.log('Starting image analysis...');

      // Analyze image - this returns already parsed JSON from our server
      const result = await analyzeImage(photo.base64);
      console.log('Server response:', result);
      
      // Create study set with the data
      const studySet = await createStudySet({
        title: result.title,
        text_content: result.text_content,
        flashcards: result.flashcards,
        quiz: result.quiz
      });

      setIsProcessing(false);
      navigation.navigate('StudySet', { id: studySet.id });
    } catch (error) {
      setIsProcessing(false);
      console.error('Full error details:', error);
      Alert.alert(
        'Error',
        error instanceof Error 
          ? `Failed to process: ${error.message}`
          : 'Failed to process image. Please try again.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan - {formattedDate}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Image Preview */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: photo.uri }}
          style={styles.preview}
          resizeMode="contain"
        />
      </View>

      {/* Bottom Buttons - Reordered */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.analyzeButton}
          onPress={handleAnalyze}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.analyzeButtonText}>
              Tällä mennään!
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.scanMoreButton}
          onPress={() => navigation.goBack()}
          disabled={isProcessing}
        >
          <Text style={styles.scanMoreText}>Ota uusi kuva</Text>
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
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    flex: 1,
    textAlign: 'center',
    marginRight: 0,
  },
  imageContainer: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  preview: {
    flex: 1,
    width: '100%',
    borderRadius: 24,
  },
  bottomContainer: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  analyzeButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 56,
  },
  analyzeButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  scanMoreButton: {
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 56,
    backgroundColor: theme.colors.background02,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
  },
  scanMoreText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
});
