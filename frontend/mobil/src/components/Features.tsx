import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from '@/contexts/TranslationContext';

const Features = () => {
  const { t } = useTranslation();

  const features = [
    { key: 'safeRental', icon: '🛡️' },
    { key: 'service24', icon: '🕐' },
    { key: 'wideNetwork', icon: '📍' },
    { key: 'flexiblePayment', icon: '💳' },
    { key: 'customerSupport', icon: '👥' },
    { key: 'qualityCars', icon: '🚗' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('features.title')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        {features.map((feature) => (
          <View key={feature.key} style={styles.featureCard}>
            <Text style={styles.icon}>{feature.icon}</Text>
            <Text style={styles.featureTitle}>
              {t(`features.${feature.key}.title`)}
            </Text>
            <Text style={styles.featureDescription}>
              {t(`features.${feature.key}.description`)}
            </Text>
          </View>
        ))}
      </ScrollView>
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
    marginBottom: 24,
    textAlign: 'center',
  },
  scrollView: {
    marginHorizontal: -20,
  },
  featureCard: {
    width: 160,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    marginRight: 16,
    alignItems: 'center',
  },
  icon: {
    fontSize: 40,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default Features;

