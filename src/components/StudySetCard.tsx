import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import theme from '../styles/theme';
import { StudySet } from '../types/types';

interface StudySetCardProps {
  studySet: StudySet;
  onPress: () => void;
}

export default function StudySetCard({ studySet, onPress }: StudySetCardProps) {
  const formattedDate = new Date(studySet.created_at).toLocaleDateString('fi-FI', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).toUpperCase();

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Text style={styles.title}>{studySet.title}</Text>
      <Text style={styles.date}>{formattedDate}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background02,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xxxxl,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
  },
  title: {
    fontSize: theme.fontSizes.lg,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  date: {
    fontSize: theme.fontSizes.sm,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
}); 