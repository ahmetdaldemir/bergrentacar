import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TranslationProvider } from '@/contexts/TranslationContext';
import { useAuthInit } from '@/hooks/useAuthInit';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// Import pages
import Index from '@/pages/Index';
import DestinationDetail from '@/pages/DestinationDetail';
import Reservations from '@/pages/Reservations';
import HelpCenter from '@/pages/HelpCenter';
import ContactUs from '@/pages/ContactUs';
import FAQ from '@/pages/FAQ';
import LiveChat from '@/pages/LiveChat';
import VehicleSearch from '@/pages/VehicleSearch';
import CompanyInfo from '@/pages/CompanyInfo';
import NotFound from '@/pages/NotFound';
import AydinlatmaMetni from '@/pages/AydinlatmaMetni';
import CerezAydinlatmaPolitikasi from '@/pages/CerezAydinlatmaPolitikasi';
import KVKPolitikasi from '@/pages/KVKPolitikasi';
import YonetimBilgiSistemleriPolitikasi from '@/pages/YonetimBilgiSistemleriPolitikasi';
import CerezAyarlari from '@/pages/CerezAyarlari';
import ReservationSuccess from '@/pages/ReservationSuccess';
import AllDestinations from '@/pages/AllDestinations';
import BlogDetail from '@/pages/BlogDetail';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

const AppContent = () => {
  const { isLoading } = useAuthInit();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Index"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Index" component={Index} />
        <Stack.Screen name="DestinationDetail" component={DestinationDetail} />
        <Stack.Screen name="Reservations" component={Reservations} />
        <Stack.Screen name="HelpCenter" component={HelpCenter} />
        <Stack.Screen name="ContactUs" component={ContactUs} />
        <Stack.Screen name="FAQ" component={FAQ} />
        <Stack.Screen name="LiveChat" component={LiveChat} />
        <Stack.Screen name="VehicleSearch" component={VehicleSearch} />
        <Stack.Screen name="CompanyInfo" component={CompanyInfo} />
        <Stack.Screen name="AydinlatmaMetni" component={AydinlatmaMetni} />
        <Stack.Screen name="CerezAydinlatmaPolitikasi" component={CerezAydinlatmaPolitikasi} />
        <Stack.Screen name="KVKPolitikasi" component={KVKPolitikasi} />
        <Stack.Screen name="YonetimBilgiSistemleriPolitikasi" component={YonetimBilgiSistemleriPolitikasi} />
        <Stack.Screen name="CerezAyarlari" component={CerezAyarlari} />
        <Stack.Screen name="ReservationSuccess" component={ReservationSuccess} />
        <Stack.Screen name="AllDestinations" component={AllDestinations} />
        <Stack.Screen name="BlogDetail" component={BlogDetail} />
        <Stack.Screen name="NotFound" component={NotFound} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App = () => (
  <SafeAreaProvider>
    <QueryClientProvider client={queryClient}>
      <TranslationProvider>
        <AppContent />
      </TranslationProvider>
    </QueryClientProvider>
  </SafeAreaProvider>
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default App;
