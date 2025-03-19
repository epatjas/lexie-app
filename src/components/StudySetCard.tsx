import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import theme from '../styles/theme';
import { StudySet } from '../types/types';
import { useFolders } from '../hooks/useFolders';

interface StudySetCardProps {
  studySet: StudySet;
  onPress: () => void;
}

export default function StudySetCard({ studySet, onPress }: StudySetCardProps) {
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
  
  const folderInfo = getFolderInfo(studySet.id);
  
  const formatDate = (timestamp: any) => {
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
      
      // Format for StudySetCard - use full date including year
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
      return `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Date error';
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Text style={styles.title}>{studySet.title}</Text>
      <View style={styles.detailsContainer}>
        <Text style={styles.date}>{formatDate(studySet.created_at)}</Text>
        {studySet.subject && (
          <Text style={styles.subject}>• {studySet.subject}</Text>
        )}
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