import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuthInit = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeTenant = async () => {
      try {
        const cached = await AsyncStorage.getItem('tenantSettings');
        try {
          const tenant = await api.getTenant();
          const payload = api.buildTenantSettingsPayload(tenant);
          await AsyncStorage.setItem('tenantSettings', JSON.stringify(payload));
        } catch (error) {
          if (!cached) {
            if (__DEV__) {
              console.error('Error fetching tenant:', error);
            }
            throw error;
          }
        }
        setIsInitialized(true);
      } catch {
        const fallback = await AsyncStorage.getItem('tenantSettings');
        setIsInitialized(!!fallback);
      } finally {
        setIsLoading(false);
      }
    };

    initializeTenant();
  }, []);

  return { isInitialized, isLoading };
};
