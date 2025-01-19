import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import theme from '../styles/theme';
import { Folder } from '../types/types';

interface FolderCardProps {
  folder: Folder & { study_set_count?: number };
  onPress: () => void;
}

export default function FolderCard({ folder, onPress }: FolderCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: folder.color }
      ]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{folder.name}</Text>
        <Text style={styles.count}>
          {folder.study_set_count === 1 
            ? '1 HARJOITTELUSETTI'
            : `${folder.study_set_count || 0} HARJOITTELUSETTIÄ`}
        </Text>
      </View>
      <View style={styles.iconContainer}>
        <View style={styles.iconBackground}>
          <ArrowRight color={theme.colors.text} size={20} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    color: theme.colors.background,
    marginBottom: theme.spacing.xs,
  },
  count: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: theme.colors.background,
  },
  iconContainer: {
    marginLeft: theme.spacing.md,
  },
  iconBackground: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 