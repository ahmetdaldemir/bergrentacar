import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from '@/contexts/TranslationContext';

const Reviews = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('reviews.satisfaction')}</Text>
      <Text style={styles.comingSoon}>Reviews coming soon...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  comingSoon: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
});

export default Reviews;

