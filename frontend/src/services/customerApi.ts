import { API_BASE_URL } from '@/config/api';
import {
  CustomerLoginRequest,
  CustomerLoginResponse,
  CustomerProfile,
  CustomerReservation,
  ChangePasswordRequest,
  Customer,
} from '@/types/customer';

export const customerApi = {
  login: async (credentials: CustomerLoginRequest): Promise<CustomerLoginResponse> => {
    const response = await fetch(`${API_BASE_URL}/customers/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(errorData.message || 'Login failed');
    }

    return response.json();
  },

  getProfile: async (token: string): Promise<{ success: boolean; data: CustomerProfile }> => {
    const response = await fetch(`${API_BASE_URL}/customers/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch profile' }));
      throw new Error(errorData.message || 'Failed to fetch profile');
    }

    return response.json();
  },

  getReservations: async (token: string): Promise<{ success: boolean; data: CustomerReservation[] }> => {
    const response = await fetch(`${API_BASE_URL}/customers/auth/reservations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch reservations' }));
      throw new Error(errorData.message || 'Failed to fetch reservations');
    }

    return response.json();
  },

  changePassword: async (token: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    const response = await fetch(`${API_BASE_URL}/customers/auth/change-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      } as ChangePasswordRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to change password' }));
      throw new Error(errorData.message || 'Failed to change password');
    }

    return response.json();
  },

  logout: async (token: string): Promise<{ success: boolean; message?: string }> => {
    const response = await fetch(`${API_BASE_URL}/customers/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to logout' }));
      throw new Error(errorData.message || 'Failed to logout');
    }

    return response.json();
  },

  forgotPassword: async (emailOrIdNumber: { email?: string; idNumber?: string }): Promise<{ success: boolean; message?: string }> => {
    const response = await fetch(`${API_BASE_URL}/customers/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailOrIdNumber),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to send password reset request' }));
      throw new Error(errorData.message || 'Failed to send password reset request');
    }

    return response.json();
  },

  resetPassword: async (resetToken: string, newPassword: string, tenantId?: string): Promise<{ success: boolean; message?: string }> => {
    const response = await fetch(`${API_BASE_URL}/customers/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: resetToken,
        newPassword,
        tenantId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to reset password' }));
      throw new Error(errorData.message || 'Failed to reset password');
    }

    return response.json();
  },

  updateProfile: async (token: string, profileData: Partial<Customer>): Promise<{ success: boolean; data: CustomerProfile }> => {
    const response = await fetch(`${API_BASE_URL}/customers/auth/me`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to update profile' }));
      throw new Error(errorData.message || 'Failed to update profile');
    }

    return response.json();
  },

  cancelReservation: async (token: string, reservationId: string): Promise<{ success: boolean; message?: string }> => {
    const response = await fetch(`${API_BASE_URL}/customers/auth/reservations/${reservationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to cancel reservation' }));
      throw new Error(errorData.message || 'Failed to cancel reservation');
    }

    return response.json();
  },
};

