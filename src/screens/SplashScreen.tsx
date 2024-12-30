import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native';
import ParticleBackground from '../components/ParticleBackground';
import theme from '../styles/theme';

const SplashScreen = () => {
  console.log('🎨 SplashScreen component rendered');
  
  return (
    <View style={styles.container}>
      <ParticleBackground />
      <Text style={styles.logo}>LEXIE</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    color: theme.colors.text,
    fontSize: 32,
    fontFamily: theme.fonts.medium,
  },
});

export default SplashScreen; 