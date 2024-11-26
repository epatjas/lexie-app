import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import theme from '../styles/theme';
import StudySetItem from '../components/StudySetItem';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { getAllStudySets } from '../services/Database';
import { StudySet } from '../types/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStudySets();
  }, []);

  const loadStudySets = async () => {
    try {
      const sets = await getAllStudySets();
      setStudySets(sets);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load study sets:', error);
      setIsLoading(false);
    }
  };

  const handleStudySetPress = (id: string) => {
    navigation.navigate('StudySet', { id });
  };

  const handleCreateNewStudySet = () => {
    navigation.navigate('ScanPage');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fi-FI', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.welcomeContainer}>
            <Text>Loading...</Text>
          </View>
        ) : studySets.length === 0 ? (
          <View style={styles.welcomeContainer}>
            <Text style={styles.greeting}>Hei 👋🏻 Ilona!</Text>
            <Text style={styles.question}>What do you want to learn today?</Text>
            <TouchableOpacity 
              style={styles.button}
              onPress={handleCreateNewStudySet}
            >
              <Text style={styles.buttonText}>Create new study set</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.greeting}>Hei 👋🏻 Ilona!</Text>
              <Text style={styles.subheading}>Tervetuloa takaisin.</Text>
            </View>
            
            <Text style={styles.sectionTitle}>My study sets</Text>
            
            <ScrollView style={styles.studySetsList}>
              {studySets.map((set) => (
                <StudySetItem
                  key={set.id}
                  title={set.title}
                  date={formatDate(set.created_at)}
                  onPress={() => handleStudySetPress(set.id)}
                />
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.button}
              onPress={handleCreateNewStudySet}
            >
              <Text style={styles.buttonText}>Create new study set</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  greeting: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.xxl,
    color: theme.colors.text,
  },
  subheading: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.xxl,
    color: theme.colors.text,
  },
  question: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.lg,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  studySetsList: {
    flex: 1,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.xxxxl,
    alignItems: 'center',
    marginTop: theme.spacing.md,
    width: '80%',
    alignSelf: 'center',
  },
  buttonText: {
    color: theme.colors.buttonText,
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.md,
  },
});
