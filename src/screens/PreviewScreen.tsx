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
    setIsProcessing(true);
    try {
      // Send image to server for analysis
      const studyMaterials = await analyzeImage(photo.base64);
      
      // Save study materials to local database
      await verifyDatabaseTables();
      
      const studySet = await createStudySet({
        title: studyMaterials.title || 'New Study Set',
        text_content: studyMaterials.text_content,
        flashcards: studyMaterials.flashcards,
        quiz: studyMaterials.quiz
      });
      
      console.log('Study set created:', studySet);
      
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
      console.error('Failed to create study set:', error);
      Alert.alert(
        'Error',
        'Failed to save study materials. Please try again.'
      );
    } finally {
      setIsProcessing(false);
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
              I'm happy, let's go
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.scanMoreButton}
          onPress={() => navigation.goBack()}
          disabled={isProcessing}
        >
          <Text style={styles.scanMoreText}>Retake or scan more</Text>
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
   
    borderRadius: 0,
    overflow: 'hidden',
  },
  preview: {
    flex: 1,
    width: '100%',
    borderRadius: 0,
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
  },
  scanMoreText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
});
