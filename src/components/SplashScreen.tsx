import React, { useEffect } from "react";
import { StyleSheet, View, Animated } from "react-native";
import theme from '../styles/theme';
import ParticleBackground from './ParticleBackground';

export default function SplashScreen() {
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <ParticleBackground />
      <Animated.Text style={[styles.text, { opacity: fadeAnim }]}>
        Lexie
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: theme.colors.text,
    fontSize: 32,
    fontFamily: theme.fonts.medium,
    letterSpacing: 3,
  },
}); 