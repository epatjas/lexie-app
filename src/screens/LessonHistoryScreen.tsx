import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Image,
  Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import theme from '../styles/theme';
import { Profile } from '../types/types';
import { useStudySets } from '../hooks/useStudySet';
import { useFolders } from '../hooks/useFolders';
import ParticleBackground from '../components/ParticleBackground';
import CreateStudySetBottomSheet from '../components/CreateStudySetBottomSheet';
import { getActiveProfile } from '../utils/storage';
import Animated, { 
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  withTiming,
} from 'react-native-reanimated';
import { Plus, ChevronLeft } from 'lucide-react-native';
import SettingsScreen from './SettingsScreen';
import ProfileBadge from '../components/ProfileBadge';


type LessonHistoryScreenProps = NativeStackScreenProps<RootStackParamList, 'LessonHistory'>;

interface LocalStudySet {
  id: string;
  title: string;
  created_at: string | number;
  subject?: string;
}

type TimeSection = {
  title: string;
  data: LocalStudySet[];
};

export default function LessonHistoryScreen({ navigation }: LessonHistoryScreenProps) {
  const { studySets, refreshStudySets, loading } = useStudySets();
  const { folders } = useFolders();
  const [sections, setSections] = useState<TimeSection[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const progress = useSharedValue(0);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    backgroundColor: 'rgba(0,0,0,0.5)',
    ...StyleSheet.absoluteFillObject,
  }));

  const modalStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      progress.value,
      [0, 1],
      [1000, 0]
    );
    
    return {
      transform: [{ translateY }],
      backgroundColor: theme.colors.background02,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    };
  });

  useEffect(() => {
    refreshStudySets();
    
    const loadActiveProfile = async () => {
      try {
        const profile = await getActiveProfile();
        setActiveProfile(profile);
      } catch (error) {
        console.error('Error loading active profile:', error);
      }
    };

    loadActiveProfile();
  }, []);

  useEffect(() => {
    if (studySets.length > 0) {
      organizeSections();
    }
  }, [studySets]);

  useEffect(() => {
    if (isBottomSheetVisible || isSettingsVisible) {
      progress.value = withTiming(1, {
        duration: 300,
      });
    } else {
      progress.value = withTiming(0, {
        duration: 300,
      });
    }
  }, [isBottomSheetVisible, isSettingsVisible]);

  const organizeSections = () => {
    // Get today at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find the start of this week (Sunday or Monday depending on your preference)
    const startOfThisWeek = new Date(today);
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    // If you want weeks to start on Monday, use:
    startOfThisWeek.setDate(today.getDate() - currentDay + (currentDay === 0 ? -6 : 1));
    // If you want weeks to start on Sunday, use:
    // startOfThisWeek.setDate(today.getDate() - currentDay);
    startOfThisWeek.setHours(0, 0, 0, 0);
    
    // Find the start of last week
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
    
    // Find the start of last month
    const startOfLastMonth = new Date(today);
    startOfLastMonth.setMonth(today.getMonth() - 1);
    startOfLastMonth.setHours(0, 0, 0, 0);
    
    const todaySets: LocalStudySet[] = [];
    const thisWeekSets: LocalStudySet[] = [];
    const lastWeekSets: LocalStudySet[] = [];
    const lastMonthSets: LocalStudySet[] = [];
    const olderSets: LocalStudySet[] = [];

    studySets.forEach(set => {
      if (!set.id) return;
      
      const localSet: LocalStudySet = {
        id: set.id,
        title: set.title || '',
        created_at: set.created_at || Date.now(),
        subject: set.hasOwnProperty('subject') ? (set as any).subject : undefined
      };
      
      const createdAt = set.created_at ? new Date(set.created_at) : new Date();
      
      if (createdAt >= today) {
        todaySets.push(localSet);
      } else if (createdAt >= startOfThisWeek) {
        thisWeekSets.push(localSet);
      } else if (createdAt >= startOfLastWeek) {
        lastWeekSets.push(localSet);
      } else if (createdAt >= startOfLastMonth) {
        lastMonthSets.push(localSet);
      } else {
        olderSets.push(localSet);
      }
    });

    const newSections: TimeSection[] = [];
    
    if (todaySets.length > 0) {
      newSections.push({ title: 'Today', data: todaySets });
    }
    
    if (thisWeekSets.length > 0) {
      newSections.push({ title: 'This week', data: thisWeekSets });
    }
    
    if (lastWeekSets.length > 0) {
      newSections.push({ title: 'Last week', data: lastWeekSets });
    }
    
    if (lastMonthSets.length > 0) {
      newSections.push({ title: 'Last month', data: lastMonthSets });
    }
    
    if (olderSets.length > 0) {
      newSections.push({ title: 'Older', data: olderSets });
    }
    
    setSections(newSections);
  };

  const formatDate = (timestamp: string | number) => {
    // Ensure we have a valid date object
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'Unknown date';
    }
    
    // For today's items, show time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date >= today) {
      try {
        return date.toLocaleTimeString(undefined, { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } catch (error) {
        // Fallback if toLocaleTimeString fails
        return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      }
    }
    
    // Check if it's yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date >= yesterday && date < today) {
      return 'Yesterday';
    }
    
    // For older dates, show "Month Day"
    try {
      const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
      return date.toLocaleDateString(undefined, options);
    } catch (error) {
      // Fallback formatting
      return date.toDateString();
    }
  };

  // Helper function to validate and standardize colors
  const standardizeColor = (color: string | undefined): string => {
    if (!color) return theme.colors.textSecondary;
    
    // If it's our blue color but in a different format, standardize it
    const lowerColor = color.toLowerCase();
    if (
      lowerColor === 'blue' || 
      lowerColor === '#0000ff' || 
      lowerColor === 'rgb(0,0,255)' ||
      lowerColor.includes('blue')
    ) {
      return '#98BDF7'; // Use your exact blue color
    }
    
    // For other colors, check if valid
    if (color.startsWith('#') || 
        ['white', 'black', 'red', 'green', 'yellow', 'purple', 'orange'].includes(lowerColor)) {
      return color;
    }
    
    return theme.colors.textSecondary; // Default fallback
  };

  // Update getFolderInfo to use the standardized color
  const getFolderInfo = (studySetId: string): { name: string, color: string } | null => {
    if (!folders || !Array.isArray(folders)) {
      return null;
    }
    
    const folder = folders.find(folder => 
      folder.study_sets && 
      Array.isArray(folder.study_sets) && 
      folder.study_sets.includes(studySetId)
    );
    
    if (folder) {
      // Use the standardized color
      return { 
        name: folder.name, 
        color: standardizeColor(folder.color)
      };
    }
    
    return null;
  };

  const getProfileImage = (avatarId: string | undefined): any => {
    const images: Record<string, any> = {
      '1': require('../../assets/Account creation/profile 1.png'),
      '2': require('../../assets/Account creation/profile 2.png'),
      '3': require('../../assets/Account creation/profile 3.png'),
      '4': require('../../assets/Account creation/profile 4.png'),
      '5': require('../../assets/Account creation/profile 5.png'),
      '6': require('../../assets/Account creation/profile 6.png'),
      '7': require('../../assets/Account creation/profile 7.png'),
      '8': require('../../assets/Account creation/profile 8.png'),
      '9': require('../../assets/Account creation/profile 9.png'),
    };
    return images[avatarId || '1'];
  };

  const handleCreatePress = () => {
    setIsBottomSheetVisible(true);
  };

  const handleCloseBottomSheet = () => {
    setIsBottomSheetVisible(false);
  };

  const getTestFolderName = (studySetId: string): string => {
    // Map specific study set IDs to folder names for testing
    const folderMap: Record<string, string> = {
      // Add your actual study set IDs here:
      'study-set-1': 'Science',
      'study-set-2': 'Math',
      // Add more as needed
    };
    
    return folderMap[studySetId] || 'General';
  };

  const renderItem = ({ item }: { item: LocalStudySet }) => {
    const folderInfo = item.id ? getFolderInfo(item.id) : null;
    
    // Fix subject color with safe access
    const subjectColor = 
      item.subject && 
      (item.subject.toLowerCase() === 'biology' || 
       item.subject.toLowerCase() === 'science' || 
       item.subject.toLowerCase().includes('bio')) ? 
      theme.colors.folderBlue : 
      theme.colors.textSecondary;
    
    return (
      <TouchableOpacity
        style={styles.lessonItem}
        onPress={() => item.id && navigation.navigate('StudySet', { id: item.id })}
      >
        <View>
          <Text style={styles.lessonTitle}>{item.title}</Text>
          <View style={styles.detailsRow}>
            <Text style={styles.lessonDate}>{formatDateForDisplay(item.created_at)}</Text>
            
            {item.subject && (
              <Text style={[styles.lessonDate, { color: subjectColor }]}> • {item.subject}</Text>
            )}
            
            {folderInfo && (
              <Text 
                style={[
                  styles.lessonDate, 
                  { color: folderInfo.color }
                ]}
              > • {folderInfo.name}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Add this new function with specialized formatting for lesson history
  const formatDateForDisplay = (timestamp: any) => {
    // Handle case where timestamp is invalid
    if (!timestamp) return 'Date unavailable';
    
    try {
      // Try to create a valid date object
      let dateObj: Date;
      
      if (typeof timestamp === 'number') {
        dateObj = new Date(timestamp);
      } else if (typeof timestamp === 'string') {
        // If it's a numeric string, convert to number first
        if (!isNaN(Number(timestamp))) {
          dateObj = new Date(Number(timestamp));
        } else {
          // Try parsing as date string
          dateObj = new Date(timestamp);
        }
      } else {
        // Unknown type
        return 'Invalid date format';
      }
      
      // Check if the date object is valid
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }
      
      // Get current date for comparison
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Format based on how recent the date is
      if (dateObj >= today) {
        // For today, show time
        return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (dateObj >= yesterday && dateObj < today) {
        // For yesterday
        return 'Yesterday';
      } else {
        // For older dates, show month and day
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
        return `${months[dateObj.getMonth()]} ${dateObj.getDate()}`;
      }
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Date error';
    }
  };

  const renderSection = ({ item }: { item: TimeSection }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{item.title}</Text>
      {item.data.map(studySet => (
        <React.Fragment key={studySet.id}>
          {renderItem({ item: studySet })}
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ParticleBackground />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lessons with Lexie</Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => setIsSettingsVisible(true)}
        >
          <Image
            source={getProfileImage(activeProfile?.avatarId)}
            style={styles.profileImage}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading lessons...</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          renderItem={renderSection}
          keyExtractor={item => item.title}
          contentContainerStyle={[
            styles.listContainer,
            sections.length === 0 ? { flex: 1 } : null
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No lessons found.</Text>
              <View style={{height: 2}} />
              <Text style={styles.emptyText}>Start your first lesson.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.newLessonButton}
        onPress={handleCreatePress}
      >
        <Plus 
          size={20}
          color={theme.colors.background}
        />
        <Text style={styles.newLessonButtonText}>New lesson</Text>
      </TouchableOpacity>

      <Modal
        visible={isBottomSheetVisible}
        transparent
        animationType="none"
        onRequestClose={handleCloseBottomSheet}
      >
        <Animated.View style={overlayStyle}>
          <SafeAreaView style={styles.modalContainer}>
            <Animated.View style={modalStyle}>
              <CreateStudySetBottomSheet 
                onClose={handleCloseBottomSheet} 
                visible={isBottomSheetVisible}
              />
            </Animated.View>
          </SafeAreaView>
        </Animated.View>
      </Modal>

      {isSettingsVisible && (
        <SettingsScreen 
          visible={isSettingsVisible}
          navigation={navigation}
          onClose={() => setIsSettingsVisible(false)}
          onProfileDeleted={() => {
            setIsSettingsVisible(false);
            navigation.reset({
              index: 0,
              routes: [{ name: 'ProfileSelection' }],
            });
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 32,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: theme.colors.background02,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  listContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100,
    flexGrow: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  lessonItem: {
    backgroundColor: 'transparent',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D2E33',
  },
  lessonTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    marginBottom: 4,
  },
  lessonDate: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontFamily: theme.fonts.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    textAlign: 'center',
  },
  newLessonButton: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  newLessonButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
}); 