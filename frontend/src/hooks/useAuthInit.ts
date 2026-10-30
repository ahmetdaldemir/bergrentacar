import { useEffect, useState } from 'react';
import { api } from '@/services/api';

export const useAuthInit = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeTenant = async () => {
      try {
        const cached = localStorage.getItem('tenantSettings');
        try {
          const tenant = await api.getTenant();
          const payload = api.buildTenantSettingsPayload(tenant);
          localStorage.setItem('tenantSettings', JSON.stringify(payload));
        } catch (error) {
          if (!cached) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Error fetching tenant:', error);
            }
            throw error;
          }
        }
        setIsInitialized(true);
      } catch {
        // Still allow app to render if cached tenant exists (handled above)
        setIsInitialized(!!localStorage.getItem('tenantSettings'));
      } finally {
        setIsLoading(false);
      }
    };

    initializeTenant();
  }, []);

  return { isInitialized, isLoading };
};
