import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { api, authStorage } from '@/lib/api';

type AuthUser = {
  email?: string | null;
  name?: string | null;
};

type AuthSession = {
  access_token: string;
};

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAdminLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  checkAdminRole: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminLoading, setIsAdminLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminRole = useCallback(async (): Promise<boolean> => {
    if (!authStorage.getToken()) {
      setIsAdminLoading(false);
      return false;
    }
    
    setIsAdminLoading(true);
    
    try {
      const data = await api.adminDashboard();
      setIsAdmin(true);
      setIsAdminLoading(false);
      if (data?.user?.email) {
        setUser((prev) => ({ ...(prev || {}), email: data.user.email }));
        authStorage.setEmail(data.user.email);
      }
      return true;
    } catch (err) {
      console.error('Error in checkAdminRole:', err);
      setIsAdmin(false);
      authStorage.clear();
      setIsAdminLoading(false);
      return false;
    }
  }, []);

  useEffect(() => {
    const token = authStorage.getToken();
    const email = authStorage.getEmail();
    if (token) {
      setSession({ access_token: token });
      setUser(email ? { email } : null);
      checkAdminRole().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
      setIsAdmin(false);
      setIsAdminLoading(false);
    }
  }, []);

  // Check admin role when user changes
  useEffect(() => {
    if (user) {
      checkAdminRole();
    }
  }, [user, checkAdminRole]);

  const signIn = async (email: string, password: string) => {
    try {
      const data = await api.adminLogin(email, password);
      const token = data?.token || data?.access_token;
      if (!token) {
        return { error: new Error("Missing token from login response") };
      }
      authStorage.setToken(token);
      authStorage.setEmail(data?.user?.email || email);
      setSession({ access_token: token });
      setUser({ email: data?.user?.email || email, name: data?.user?.name });
      setIsAdmin(true);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    console.warn("Signup requested but not supported by backend API", { email, fullName });
    return { error: new Error("Signup is not supported. Please contact an administrator.") };
  };

  const signOut = async () => {
    authStorage.clear();
    setSession(null);
    setUser(null);
    setIsAdmin(false);
    setIsAdminLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAdminLoading,
        isAdmin,
        signIn,
        signUp,
        signOut,
        checkAdminRole
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
