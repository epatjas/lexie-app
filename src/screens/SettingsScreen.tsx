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
} from 'react-native';
import theme from '../styles/theme';
import { ChevronRight, Heart, FileText, AlertTriangle, X } from 'lucide-react-native';
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

export default function SettingsScreen({ 
  navigation, 
  onClose, 
  onProfileDeleted 
}: {
  navigation: any,
  onClose?: () => void,
  onProfileDeleted?: () => void
}) {
  const progress = useSharedValue(0);
  const [activeProfile, refreshProfile] = useActiveProfile();

  React.useEffect(() => {
    progress.value = withTiming(1, { duration: 300 });
  }, []);

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
      backgroundColor: '#101011',
      borderTopLeftRadius: 40,
      borderTopRightRadius: 40,
      overflow: 'hidden',
      height: 'auto',
      paddingBottom: 34,
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

  return (
    <Modal
      visible={true}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={StyleSheet.absoluteFill}>
        <Animated.View 
          style={[
            StyleSheet.absoluteFill,
            overlayStyle
          ]} 
        >
          <TouchableOpacity 
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
          />
        </Animated.View>
        
        <View style={styles.container}>
          <Animated.View style={modalStyle}>
            <View style={styles.dragHandleContainer}>
              <DragHandle />
            </View>

            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleClose}
              >
                <X color={theme.colors.text} size={20} />
              </TouchableOpacity>
              <Text style={styles.title}>Asetukset</Text>
            </View>
            
            <View style={styles.section}>
              <TouchableOpacity 
                style={styles.item}
                onPress={() => handleOpenLink('https://www.lexielearn.com/terms')}
              >
                <View style={styles.itemContent}>
                  <View style={styles.iconContainer}>
                    <FileText color={theme.colors.text} size={16} />
                  </View>
                  <Text style={styles.itemText}>Käyttöehdot</Text>
                </View>
                <ChevronRight color={theme.colors.textSecondary} size={20} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.item}
                onPress={() => handleOpenLink('https://www.lexielearn.com/privacy')}
              >
                <View style={styles.itemContent}>
                  <View style={styles.iconContainer}>
                    <FileText color={theme.colors.text} size={16} />
                  </View>
                  <Text style={styles.itemText}>Tietosuoja</Text>
                </View>
                <ChevronRight color={theme.colors.textSecondary} size={20} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.item}
                onPress={() => handleOpenLink('https://apps.apple.com/app/lexielearn')}
              >
                <View style={styles.itemContent}>
                  <View style={styles.iconContainer}>
                    <Heart color={theme.colors.text} size={16} />
                  </View>
                  <Text style={styles.itemText}>Anna Lexielle 5 tähteä</Text>
                </View>
                <ChevronRight color={theme.colors.textSecondary} size={20} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.item, styles.deleteItem]}
                onPress={handleDeleteProfile}
              >
                <View style={styles.itemContent}>
                  <View style={styles.iconContainer}>
                    <AlertTriangle color={theme.colors.error} size={16} />
                  </View>
                  <Text style={[styles.itemText, styles.deleteText]}>Poista profiili</Text>
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.footer}>
              Kiitos, että valitsit Lexien.{'\n'}
              We love you.
            </Text>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing.md,
    padding: theme.spacing.sm,
  },
  title: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#17181A',
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#27282D',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#27282D',
    backgroundColor: '#17181A',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background02,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  itemText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
  },
  deleteItem: {
    borderBottomWidth: 0,
  },
  deleteText: {
    color: '#EE5775',
  },
  footer: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
}); 