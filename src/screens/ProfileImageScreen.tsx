import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  SafeAreaView,
  Alert,
} from 'react-native';
import theme from '../styles/theme';
import ParticleBackground from '../components/ParticleBackground';
import { saveUserAvatar, getUserName, saveUserProfile, setActiveProfile } from '../utils/storage';

const PROFILE_IMAGES = [
  { id: '1', source: require('../../assets/Account creation/profile 1.png') },
  { id: '2', source: require('../../assets/Account creation/profile 2.png') },
  { id: '3', source: require('../../assets/Account creation/profile 3.png') },
  { id: '4', source: require('../../assets/Account creation/profile 4.png') },
  { id: '5', source: require('../../assets/Account creation/profile 5.png') },
  { id: '6', source: require('../../assets/Account creation/profile 6.png') },
  { id: '7', source: require('../../assets/Account creation/profile 7.png') },
  { id: '8', source: require('../../assets/Account creation/profile 8.png') },
  { id: '9', source: require('../../assets/Account creation/profile 9.png') }
];

const COLUMNS = 3;

interface ProfileImageScreenProps {
  navigation: any;
}

const ProfileImageScreen: React.FC<ProfileImageScreenProps> = ({ navigation }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageSelect = (imageId: string) => {
    setSelectedImage(imageId);
  };

  const handleContinue = async () => {
    if (!selectedImage) {
      Alert.alert(
        "Valitse profiilikuva",
        "Valitse profiilikuva jatkaaksesi",
        [{ text: "OK" }]
      );
      return;
    }
    
    try {
      const name = await getUserName();
      if (!name) {
        console.error('No name found');
        return;
      }
      
      const newProfile = await saveUserProfile(name, selectedImage);
      await setActiveProfile(newProfile.id);
      navigation.replace('Home');
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const renderItem = ({ item }: { item: { id: string, source: any } }) => (
    <TouchableOpacity
      style={[
        styles.imageContainer,
        selectedImage === item.id && styles.selectedImageContainer
      ]}
      onPress={() => handleImageSelect(item.id)}
    >
      <Image source={item.source} style={styles.profileImage} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ParticleBackground />
      <View style={styles.content}>
        <Text style={styles.title}>Select profile picture</Text>

        <FlatList
          data={PROFILE_IMAGES}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={COLUMNS}
          contentContainerStyle={styles.gridContainer}
          style={styles.gridList}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
    paddingTop: '20%',
  },
  title: {
    fontSize: theme.fontSizes.xl,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    fontFamily: theme.fonts.medium,
  },
  gridContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    maxHeight: '60%',
  },
  imageContainer: {
    flex: 1/COLUMNS,
    aspectRatio: 1,
    margin: theme.spacing.xs,
    borderRadius: 999,
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.background02,
    overflow: 'hidden',
  },
  selectedImageContainer: {
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  button: {
    backgroundColor: theme.colors.text,
    paddingVertical: theme.spacing.md,
    borderRadius: 100,
    alignItems: 'center',
    position: 'absolute',
    bottom: theme.spacing.lg,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
  },
  gridList: {
    flex: 1,
  },
});

export default ProfileImageScreen; 