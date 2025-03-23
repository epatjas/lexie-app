import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Animated, Alert } from 'react-native';
import ParticleBackground from '../components/ParticleBackground';
import theme from '../styles/theme';
import { saveUserName } from '../utils/storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type NameInputScreenProps = NativeStackScreenProps<RootStackParamList, 'NameInput'>;

const NameInputScreen: React.FC<NameInputScreenProps> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [isFocused, setIsFocused] = useState(true);
  const textInputRef = useRef<TextInput>(null);
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );

    if (isFocused) {
      blinkAnimation.start();
    } else {
      blinkAnimation.stop();
      cursorOpacity.setValue(0);
    }

    return () => blinkAnimation.stop();
  }, [isFocused]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setName('');
    });

    return unsubscribe;
  }, [navigation]);

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert(
        "Name required",
        "Please write your name to continue",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      await saveUserName(name.trim());
      navigation.navigate('ProfileImage', {
        profileId: 'some-profile-id'  // You need to provide a valid profileId here
      });
    } catch (error) {
      console.error('Error saving name:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ParticleBackground />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.textContainer}>
          <Text style={styles.title}>Hi 👋🏻</Text>
          <Text style={styles.title}>What should I call you?</Text>
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={textInputRef}
              style={styles.input}
              placeholder="Write your name here"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              value={name}
              onChangeText={setName}
              autoFocus
              caretHidden={!name}
              selectionColor="#453ABA"
              cursorColor="#453ABA"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            {isFocused && !name && (
              <Animated.View 
                style={[
                  styles.cursor,
                  { opacity: cursorOpacity }
                ]} 
              />
            )}
          </View>
        </View>

        <TouchableOpacity 
          style={styles.button}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
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
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 24,
    color: theme.colors.text,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 28,
  },
  inputContainer: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  cursor: {
    width: 2,
    height: 24,
    backgroundColor: '#453ABA',
    position: 'absolute',
    left: '20%',
    zIndex: 1,
  },
  input: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '400',
    textAlign: 'center',
    height: 50,
    paddingHorizontal: 10,
    width: '100%',
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
    alignSelf: 'center',
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default NameInputScreen; 