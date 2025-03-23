import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import theme from '../styles/theme';
import { ChevronRight, Heart, FileText, AlertTriangle, X, ChevronLeft, UserCog, Sparkles } from 'lucide-react-native';
import Animated, { 
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import DragHandle from '../components/DragHandle';
import { useActiveProfile } from '../hooks/useActiveProfile';
import { deleteProfile } from '../utils/storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen({ 
  navigation, 
  onClose, 
  onProfileDeleted,
  visible = true
}: {
  navigation: any,
  onClose?: () => void,
  onProfileDeleted?: () => void,
  visible?: boolean
}) {
  const progress = useSharedValue(0);
  const [activeProfile, refreshProfile] = useActiveProfile();

  React.useEffect(() => {
    if (visible) {
      progress.value = withTiming(1, { duration: 300 });
    } else {
      progress.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 1], [0, 1]),
      backgroundColor: 'rgba(0,0,0,0.7)',
      ...StyleSheet.absoluteFillObject,
    };
  });

  const modalStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      progress.value,
      [0, 1],
      [1000, 0]
    );
    
    return {
      transform: [{ translateY }],
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 40,
      borderTopRightRadius: 40,
      overflow: 'hidden',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '85%',
      paddingBottom: 20,
    };
  });

  const handleClose = onClose || (() => navigation.goBack());
  
  const handleProfileDeleted = onProfileDeleted || (() => {
    navigation.navigate("ProfileSelection");
  });

  const handleOpenLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const handleDeleteProfile = async () => {
    if (!activeProfile?.id) return;

    Alert.alert(
      "Delete Profile",
      "Are you sure you want to delete this profile? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProfile(activeProfile.id);
              handleClose();
              handleProfileDeleted();
              console.log('Profile deleted successfully:', activeProfile.id);
            } catch (error) {
              console.error('Error deleting profile:', error);
              Alert.alert('Error', 'Failed to delete profile');
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Log Out",
          onPress: async () => {
            // Clear active profile
            await AsyncStorage.removeItem('@active_profile');
            await AsyncStorage.removeItem('@active_profile_data');
            
            // Close the settings modal first
            handleClose();
            
            // Navigate to profile selection
            navigation.reset({
              index: 0,
              routes: [{ name: 'ProfileSelection' }],
            });
          }
        }
      ]
    );
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View 
        style={overlayStyle}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
        />
      </Animated.View>
      
      <Animated.View style={modalStyle}>
        <View style={[styles.dragHandleContainer, { paddingTop: 4 }]}>
          <DragHandle />
        </View>

        <View style={[styles.header, { paddingTop: theme.spacing.sm, marginBottom: theme.spacing.md }]}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <ChevronLeft color={theme.colors.text} size={20} />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.backButton} />
        </View>
        
        <View style={{flex: 1, padding: 20, paddingTop: 0}}>
          {/* Profile Section */}
          <TouchableOpacity 
            style={{
              backgroundColor: 'transparent', 
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              borderRadius: 16,
              padding: 16,
              marginBottom: 8,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
            onPress={() => {
              // First close the settings modal
              handleClose();
              
              // Then navigate to profile selection with switching mode
              setTimeout(() => {
                navigation.navigate('ProfileSelection', { 
                  switchProfile: true  // This tells the profile screen to stay open
                });
              }, 100); // Small delay to ensure modal closes first
            }}
          >
            <View>
              <Text style={{color: theme.colors.text, opacity: 0.7, fontSize: 14}}>Profile</Text>
              <Text style={{color: theme.colors.text, fontSize: 16}}>{activeProfile?.name || 'Ilona'}</Text>
            </View>
            <ChevronRight color={theme.colors.text} size={20} />
          </TouchableOpacity>

          {/* Language Section */}
          <View 
            style={{
              backgroundColor: 'transparent', 
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <View>
              <Text style={{color: theme.colors.text, opacity: 0.7, fontSize: 14}}>Language</Text>
              <Text style={{color: theme.colors.text, fontSize: 16}}>English</Text>
            </View>
            <View style={{
              backgroundColor: theme.colors.background02,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
            }}>
              <Text style={{
                fontSize: 12,
                color: theme.colors.textSecondary,
                fontFamily: theme.fonts.regular,
              }}>Coming soon</Text>
            </View>
          </View>

          {/* Profile Settings Option */}
          <TouchableOpacity 
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 16,
              marginBottom: 8
            }}
            onPress={() => navigation.navigate('ProfileSettings')}
          >
            <UserCog size={20} color={theme.colors.text} style={{marginRight: 12}} />
            <Text style={{flex: 1, color: 'white', fontSize: 16}}>Profile settings</Text>
            <ChevronRight color={theme.colors.text} size={16} />
          </TouchableOpacity>

          {/* Terms & Conditions */}
          <TouchableOpacity 
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 16,
              marginBottom: 8
            }}
            onPress={() => handleOpenLink('https://www.lexielearn.com/terms')}
          >
            <FileText size={20} color={theme.colors.text} style={{marginRight: 12}} />
            <Text style={{flex: 1, color: 'white', fontSize: 16}}>Terms & conditions</Text>
            <ChevronRight color={theme.colors.text} size={16} />
          </TouchableOpacity>

          {/* Give Feedback */}
          <TouchableOpacity 
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 16,
              marginBottom: 8
            }}
            onPress={() => navigation.navigate('Feedback')}
          >
            <Sparkles size={20} color={theme.colors.text} style={{marginRight: 12}} />
            <Text style={{flex: 1, color: 'white', fontSize: 16}}>Give feedback</Text>
            <ChevronRight color={theme.colors.text} size={16} />
          </TouchableOpacity>
          
          <View style={{
            marginTop: 'auto', 
            alignItems: 'center', 
            marginBottom: 10
          }}>
            <Text style={{color: theme.colors.text, fontSize: 14}}>Thank you for choosing LexieLearn.</Text>
            <View style={{height: 8}} />
            <Text style={{color: theme.colors.text, fontSize: 14}}>We love you.</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  content: {
    flex: 1,
    paddingBottom: 24,
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.background02,
    borderRadius: 16,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text,
    opacity: 0.7,
    fontFamily: theme.fonts.regular,
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  optionIcon: {
    marginRight: theme.spacing.md,
  },
  optionText: {
    flex: 1,
    fontSize: theme.fontSizes.md,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: theme.spacing.xxl,
    marginTop: theme.spacing.xxl,
  },
  footerText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    marginBottom: 4,
  },
}); 