import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from '@/contexts/TranslationContext';

const Blog = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('blog.title')}</Text>
      <Text style={styles.comingSoon}>Blog coming soon...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#f9f9f9',
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

export default Blog;

