import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import theme from '../styles/theme';
import { StudySet } from '../types/types';
import { useFolders } from '../hooks/useFolders';
import { useTranslation } from '../i18n/LanguageContext';

interface StudySetCardProps {
  studySet: StudySet;
  onPress: () => void;
}

export default function StudySetCard({ studySet, onPress }: StudySetCardProps) {
  const { t } = useTranslation();
  const { folders } = useFolders();
  
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
  
  const getFolderInfo = (studySetId: string): { name: string, color: string } | null => {
    if (!folders || !Array.isArray(folders)) {
      return null;
    }
    
    for (const folder of folders) {
      const studySets = (folder as any).study_sets;
      if (studySets && Array.isArray(studySets) && studySets.includes(studySetId)) {
        return { 
          name: folder.name, 
          color: standardizeColor(folder.color)
        };
      }
    }
    return null;
  };
  
  const folderInfo = getFolderInfo(studySet.id ?? '');
  
  const formatDate = (timestamp: any) => {
    // Handle case where timestamp is invalid
    if (!timestamp) return t('lessonHistory.dateFormats.unknownDate');
    
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
        return t('lessonHistory.dateFormats.invalidFormat');
      }
      
      // Check if the date object is valid
      if (isNaN(dateObj.getTime())) {
        return t('lessonHistory.dateFormats.invalidDate');
      }
      
      // Format for StudySetCard - use full date including year
      // Use translated month names from our i18n system
      const monthKey = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ][dateObj.getMonth()];
      
      const monthName = t(`common.months.${monthKey}`);
      return `${dateObj.getDate()} ${monthName} ${dateObj.getFullYear()}`;
    } catch (error) {
      console.error('Date formatting error:', error);
      return t('lessonHistory.dateFormats.dateError');
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Text style={styles.title}>{studySet.title}</Text>
      <View style={styles.detailsContainer}>
        <Text style={styles.date}>{formatDate(studySet.created_at)}</Text>
        <SubjectText studySet={studySet} />
        {folderInfo && (
          <Text style={[
            styles.folder,
            { color: folderInfo.color }
          ]}>• {folderInfo.name}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Helper component to handle subject rendering while awaiting type updates
const SubjectText = ({ studySet }: { studySet: StudySet }) => {
  const { t } = useTranslation();
  
  // Access subject safely using any type assertion for now
  // This is a temporary fix until the StudySet type is updated
  const subject = (studySet as any).subject;
  
  if (!subject) {
    return <Text style={styles.subject}>• {t('studySet.noSubject')}</Text>;
  }
  
  return <Text style={styles.subject}>• {subject}</Text>;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xxxxl,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#2D2E33',
  },
  title: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  detailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  date: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
  subject: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  folder: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
}); 