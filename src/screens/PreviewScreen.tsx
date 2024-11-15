import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';

type PreviewRouteParams = {
  Preview: {
    photo: {
      uri: string;
      base64?: string;
    };
  };
};

export default function PreviewScreen() {
  const route = useRoute<RouteProp<PreviewRouteParams, 'Preview'>>();
  const { photo } = route.params;

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: photo.uri }}
        style={styles.preview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  preview: {
    flex: 1,
  },
});
