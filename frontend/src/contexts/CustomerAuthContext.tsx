import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Customer, CustomerProfile, CustomerLoginRequest, CustomerReservation } from '@/types/customer';
import { customerApi } from '@/services/customerApi';
import { getTenantId } from '@/config/api';

interface CustomerAuthContextType {
  customer: Customer | null;
  profile: CustomerProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: CustomerLoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  fetchReservations: () => Promise<CustomerReservation[]>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (profileData: Partial<Customer>) => Promise<void>;
  cancelReservation: (reservationId: string) => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

const CUSTOMER_TOKEN_KEY = 'customerToken';
const CUSTOMER_PROFILE_KEY = 'customerProfile';

export const CustomerAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load customer data from localStorage on mount
  useEffect(() => {
    const loadCustomerData = async () => {
      try {
        const savedToken = localStorage.getItem(CUSTOMER_TOKEN_KEY);
        const savedProfile = localStorage.getItem(CUSTOMER_PROFILE_KEY);

        if (savedToken && savedProfile) {
          setToken(savedToken);
          const profileData = JSON.parse(savedProfile);
          setProfile(profileData);
          setCustomer(profileData.customer);
          
          // Verify token is still valid by fetching profile with savedToken
          try {
            const response = await customerApi.getProfile(savedToken);
            if (response.success && response.data) {
              setProfile(response.data);
              setCustomer(response.data.customer);
              localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(response.data));
            }
          } catch (error) {
            // Token invalid, clear data
            setToken(null);
            setCustomer(null);
            setProfile(null);
            localStorage.removeItem(CUSTOMER_TOKEN_KEY);
            localStorage.removeItem(CUSTOMER_PROFILE_KEY);
          }
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading customer data:', error);
        setToken(null);
        setCustomer(null);
        setProfile(null);
        localStorage.removeItem(CUSTOMER_TOKEN_KEY);
        localStorage.removeItem(CUSTOMER_PROFILE_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomerData();
  }, []);

  const login = async (credentials: CustomerLoginRequest) => {
    try {
      setIsLoading(true);
      
      // Add tenantId if not provided
      if (!credentials.tenantId) {
        credentials.tenantId = getTenantId();
      }

      const response = await customerApi.login(credentials);

      if (response.success && response.data) {
        const { token: newToken, customer: newCustomer, tenant } = response.data;
        
        setToken(newToken);
        setCustomer(newCustomer);
        
        // Save to localStorage
        localStorage.setItem(CUSTOMER_TOKEN_KEY, newToken);
        
        // Fetch full profile
        await fetchProfile();
      } else {
        throw new Error('Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await customerApi.logout(token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setCustomer(null);
      setProfile(null);
      localStorage.removeItem(CUSTOMER_TOKEN_KEY);
      localStorage.removeItem(CUSTOMER_PROFILE_KEY);
    }
  };

  const fetchProfile = async () => {
    if (!token) {
      throw new Error('No token available');
    }

    try {
      const response = await customerApi.getProfile(token);
      
      if (response.success && response.data) {
        setProfile(response.data);
        setCustomer(response.data.customer);
        
        // Save to localStorage
        localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  };

  const fetchReservations = async (): Promise<CustomerReservation[]> => {
    if (!token) {
      throw new Error('No token available');
    }

    try {
      const response = await customerApi.getReservations(token);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching reservations:', error);
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!token) {
      throw new Error('No token available');
    }

    try {
      await customerApi.changePassword(token, currentPassword, newPassword);
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  };

  const updateProfile = async (profileData: Partial<Customer>) => {
    if (!token) {
      throw new Error('No token available');
    }

    try {
      const response = await customerApi.updateProfile(token, profileData);
      
      if (response.success && response.data) {
        setProfile(response.data);
        setCustomer(response.data.customer);
        
        // Save to localStorage
        localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const cancelReservation = async (reservationId: string) => {
    if (!token) {
      throw new Error('No token available');
    }

    try {
      await customerApi.cancelReservation(token, reservationId);
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      throw error;
    }
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        profile,
        token,
        isAuthenticated: !!token && !!customer,
        isLoading,
        login,
        logout,
        fetchProfile,
        fetchReservations,
        changePassword,
        updateProfile,
        cancelReservation,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};

