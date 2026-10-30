import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '@/contexts/TranslationContext';
import Header from '@/components/Header';
import SearchForm from '@/components/SearchForm';
import Features from '@/components/Features';
import Destinations from '@/components/Destinations';
import Blog from '@/components/Blog';
import Reviews from '@/components/Reviews';
import Footer from '@/components/Footer';
import BottomNavigation from '@/components/BottomNavigation';

const Index = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'rental' | 'transfer'>('rental');

  const handleReservationClick = () => {
    // Scroll to search form (hero section)
    // In React Native, we can use ScrollView ref or navigate to a specific section
  };

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{t('hero.title')}</Text>
            <Text style={styles.heroSubtitle}>{t('hero.subtitle')}</Text>
            <SearchForm onTabChange={setActiveTab} />
          </View>
        </View>

        {/* Features */}
        <Features />

        {/* Blog Section */}
        <Blog />

        {/* Destinations Section */}
        <Destinations />

        {/* Reviews Section */}
        <Reviews />

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>{t('cta.title')}</Text>
          <Text style={styles.ctaDescription}>{t('cta.description')}</Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleReservationClick}
          >
            <Text style={styles.ctaButtonText}>{t('cta.button')}</Text>
          </TouchableOpacity>
        </View>

        <Footer />
      </ScrollView>
      <BottomNavigation />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    backgroundColor: '#007AFF',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  heroContent: {
    maxWidth: 800,
    width: '100%',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 24,
  },
  ctaSection: {
    backgroundColor: '#007AFF',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  ctaButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  ctaButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Index;

