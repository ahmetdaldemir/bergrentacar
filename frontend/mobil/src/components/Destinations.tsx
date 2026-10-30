import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '@/contexts/TranslationContext';

const Destinations = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('destinations.title')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AllDestinations' as never)}>
          <Text style={styles.viewAll}>{t('destinations.viewAll')}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.comingSoon}>Destinations coming soon...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  viewAll: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  comingSoon: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
});

export default Destinations;

