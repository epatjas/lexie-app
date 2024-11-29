import React from 'react';
import { View, StyleSheet } from 'react-native';
import theme from '../styles/theme';

export default function DragHandle() {
  return <View style={styles.dragHandle} />;
}

const styles = StyleSheet.create({
  dragHandle: {
    width: 32,
    height: 4,
    backgroundColor: theme.colors.stroke,
    borderRadius: 2,
    marginVertical: theme.spacing.sm,
  },
}); 