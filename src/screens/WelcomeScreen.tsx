import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import ParticleBackground from '../components/ParticleBackground';
import theme from '../styles/theme';
import { Weight } from 'lucide-react-native';

interface WelcomeScreenProps {
  navigation?: any;
  isLoading?: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation, isLoading }) => {
  return (
    <View style={styles.container}>
      <ParticleBackground />
      <View style={styles.content}>
        <Image 
          source={require('../../assets/Lexie icon.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.welcomeText}>Welcome to Lexie</Text>
        <Text style={styles.descriptionText}>
          Transform any text into your personal, interactive study companion.
        </Text>
        {!isLoading && (
          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigation.navigate('NameInput')}
          >
            <Text style={styles.buttonText}>Get started</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 24,
    color: theme.colors.text,
    textAlign: 'center',
    fontFamily: theme.fonts.regular,
    marginBottom: 48,
    lineHeight: 32,
  },
  button: {
    backgroundColor: theme.colors.text,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 100,
    width: '100%',
    alignItems: 'center',
    position: 'absolute',
    bottom: 48,
    marginHorizontal: 32,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default WelcomeScreen; 