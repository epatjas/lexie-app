import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import theme from '../styles/theme';

type StudySetItemProps = {
  title: string;
  date: string;
  onPress: () => void;
};

const TestSVG = () => (
  <Svg height="24" width="24" viewBox="0 0 24 24">
    <Path d="M9 18l6-6-6-6" stroke={theme.colors.textSecondary} strokeWidth={2} fill="none" />
  </Svg>
);

export default function StudySetItem({ title, date, onPress }: StudySetItemProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.date}>{date}</Text>
      </View>
      <TestSVG />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background02,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    marginBottom: theme.spacing.sm,
  },
  content: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  title: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.md,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  date: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },
});
