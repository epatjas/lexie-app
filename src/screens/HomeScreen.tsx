import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import theme from '../styles/theme';

export default function HomeScreen() {
  // This would come from your storage later
  const hasExistingContent = false;

  return (
    <View style={styles.container}>
      {!hasExistingContent ? (
        // Empty state view
        <View style={styles.welcomeContainer}>
          <Text style={styles.greeting}>Hei 👋🏻 Ilona!</Text>
          <Text style={styles.question}>What do you want to learn today?</Text>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Create new study set</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Content view
        <>
          <View style={styles.header}>
            <Text style={styles.greeting}>Hei 👋 Ilona!</Text>
            <Text style={styles.subheading}>Tervetuloa takaisin.</Text>
          </View>
          
          <Text style={styles.sectionTitle}>My study sets</Text>
          
          <ScrollView style={styles.studySetsList}>
            {/* Study set items will go here */}
          </ScrollView>
          
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Create new study set</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    marginBottom: theme.spacing.md,
  },
  subheading: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.lg,
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
