import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import ParticleBackground from '../components/ParticleBackground';
import theme from '../styles/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useTranslation } from '../i18n/LanguageContext';

type WelcomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  
  return (
    <SafeAreaView style={styles.container}>
      <ParticleBackground />
      <View style={styles.contentWrapper}>
        <View style={styles.mainContent}>
          <View style={styles.topContent}>
            <Image 
              source={require('../../assets/Lexie icon.png')}
              style={styles.icon}
              resizeMode="contain"
            />
            <Text style={styles.welcomeText}>{t('welcome.title')}</Text>
            <Text style={styles.descriptionText}>
              {t('welcome.description')}
            </Text>
          </View>
        </View>
        
        <View style={styles.buttonWrapper}>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigation.navigate('NameInput', { 
              // Include any params you need here
            })}
          >
            <Text style={styles.buttonText}>{t('welcome.startButton')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentWrapper: {
    flex: 1,
    zIndex: 1,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 32,
    zIndex: 1,
  },
  topContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  buttonWrapper: {
    paddingHorizontal: 32,
    paddingBottom: 48,
    width: '100%',
    zIndex: 1,
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
    fontSize: 18,
    color: theme.colors.text,
    textAlign: 'center',
    fontFamily: theme.fonts.regular,
    marginBottom: 48,
    lineHeight: 24,
  },
  button: {
    backgroundColor: theme.colors.text,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 100,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default WelcomeScreen; 