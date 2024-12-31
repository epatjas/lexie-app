import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const NUM_PARTICLES = 15;
const { width, height } = Dimensions.get('window');

interface Particle {
  translateY: Animated.Value;
  translateX: Animated.Value;
  opacity: Animated.Value;
  x: number;
  y: number;
}

const ParticleBackground: React.FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: NUM_PARTICLES }, () => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      opacity: new Animated.Value(0),
      x: Math.random() * width,
      y: Math.random() * height,
    }));

    setParticles(newParticles);

    newParticles.forEach((particle, i) => {
      animateParticle(particle, i * 200);
    });
  }, []);

  const animateParticle = (particle: Particle, delay: number) => {
    const duration = 3000 + Math.random() * 2000;
    
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(particle.opacity, {
            toValue: 0.8,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(particle.translateY, {
            toValue: -50,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(particle.translateX, {
            toValue: (Math.random() - 0.5) * 30,
            duration: duration,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(particle.opacity, {
            toValue: 0,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(particle.translateY, {
            toValue: -100,
            duration: duration,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  };

  return (
    <View style={styles.container}>
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              left: particle.x,
              top: particle.y,
              opacity: particle.opacity,
              transform: [
                { translateY: particle.translateY },
                { translateX: particle.translateX },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 0,
  },
  particle: {
    position: 'absolute',
    width: 2,
    height: 2,
    backgroundColor: 'white',
    borderRadius: 1,
  },
});

export default ParticleBackground; 