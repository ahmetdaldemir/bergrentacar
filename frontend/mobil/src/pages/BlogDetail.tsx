import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BottomNavigation from '@/components/BottomNavigation';

const BlogDetail = () => {
  const route = useRoute();
  const { slug } = route.params as { slug?: string };

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Blog Detail</Text>
          <Text style={styles.text}>Slug: {slug || 'N/A'}</Text>
          <Text style={styles.comingSoon}>Blog detail coming soon...</Text>
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
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    marginBottom: 8,
  },
  comingSoon: {
    fontSize: 14,
    color: '#666',
    marginTop: 20,
  },
});

export default BlogDetail;

