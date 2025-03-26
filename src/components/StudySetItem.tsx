import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import theme from '../styles/theme';
import { StudySet } from '../types/types';
import { useTranslation } from '../i18n/LanguageContext';

interface StudySetItemProps {
  studySet: StudySet;
  onPress: () => void;
}

export default function StudySetItem({ studySet, onPress }: StudySetItemProps) {
  const { language } = useTranslation();
  
  const locale = language === 'fi' ? 'fi-FI' : 'en-US';
  
  const formattedDate = new Date(studySet.created_at).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).toUpperCase();

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {studySet.title}
        </Text>
        <Text style={styles.date}>{formattedDate}</Text>
      </View>
      <View style={styles.iconContainer}>
        <ArrowRight color={theme.colors.text} size={20} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background02,
    borderRadius: theme.borderRadius.lg,
  },
  content: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSizes.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  date: {
    fontSize: theme.fontSizes.xs,
    letterSpacing: 0.5,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.xxxl,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
