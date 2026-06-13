import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types/api';
import { 
  login as loginApi, 
  signup as signupApi, 
  getAuthMe
} from '../api/client';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  role: 'user' | 'admin' | null;
  loading: boolean;
  login: (payload: any) => Promise<any>;
  adminLogin: (payload: any) => Promise<any>;
  signup: (payload: any) => Promise<any>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(localStorage.getItem('docai_token'));
  const [user, setUser] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem('docai_user');
    try {
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(false);

  const refreshMe = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const profile = await getAuthMe();
      setUser(profile);
      localStorage.setItem('docai_user', JSON.stringify(profile));
    } catch (error: any) {
      console.error("Failed to restore session profile:", error);
      // Only logout automatically if /auth/me returns 401 or 403.
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        localStorage.removeItem('docai_token');
        localStorage.removeItem('docai_user');
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = async (payload: any) => {
    localStorage.removeItem('docai_token');
    localStorage.removeItem('docai_user');
    setToken(null);
    setUser(null);

    const data = await loginApi(payload);
    localStorage.setItem('docai_token', data.access_token);
    localStorage.setItem('docai_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    
    let redirectPath = '/';
    try {
      const profile = await getAuthMe();
      setUser(profile);
      localStorage.setItem('docai_user', JSON.stringify(profile));
      if (profile.role === 'admin') {
        redirectPath = '/admin/dashboard';
      }
    } catch (error) {
      console.error("Session verification failed after login:", error);
      if (data.user.role === 'admin') {
        redirectPath = '/admin/dashboard';
      }
    }
    
    navigate(redirectPath);
    return data;
  };

  const adminLogin = async (payload: any) => {
    localStorage.removeItem('docai_token');
    localStorage.removeItem('docai_user');
    setToken(null);
    setUser(null);

    const data = await loginApi({
      identifier: payload.username,
      password: payload.password
    });

    if (data.user.role !== 'admin') {
      throw {
        response: {
          status: 403,
          data: { detail: 'Administrative privileges required.' }
        }
      };
    }

    localStorage.setItem('docai_token', data.access_token);
    localStorage.setItem('docai_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    
    try {
      const profile = await getAuthMe();
      setUser(profile);
      localStorage.setItem('docai_user', JSON.stringify(profile));
    } catch (error) {
      console.error("Admin session verification failed:", error);
    }
    
    navigate('/admin/dashboard');
    return data;
  };

  const signup = async (payload: any) => {
    localStorage.removeItem('docai_token');
    localStorage.removeItem('docai_user');
    setToken(null);
    setUser(null);

    const data = await signupApi(payload);
    // Return data directly, redirect to login manually without setting auth state
    return data;
  };

  const logout = () => {
    localStorage.removeItem('docai_token');
    localStorage.removeItem('docai_user');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  const role = user ? user.role : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        loading,
        login,
        adminLogin,
        signup,
        logout,
        refreshMe
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
