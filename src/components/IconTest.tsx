import React from 'react';
import { View, Text } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react';
import { SearchIcon } from '@hugeicons/core-free-icons';

export const IconTest = () => {
  return (
    <View style={{ padding: 20 }}>
      <Text>Testing Hugeicons:</Text>
      <HugeiconsIcon
        icon={SearchIcon}
        size={24}
        color="white"
        strokeWidth={1.5}
      />
    </View>
  );
}; 