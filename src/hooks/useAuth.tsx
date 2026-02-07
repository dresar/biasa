
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/api/client";

export interface User {
  id: string;
  email: string;
  role?: string;
  full_name?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInAsDemo: () => Promise<{ error: Error | null }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_EMAIL = "demo@cloudorchestrator.app";
const DEMO_PASSWORD = "demo123456";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }
      const response = await api.auth.me();
      setUser(response.data.user);
    } catch (error: any) {
      // Ignore 401/403 errors as they are handled by interceptor/expected for invalid sessions
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        console.error("Failed to fetch user:", error);
      }
      localStorage.removeItem('auth_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await api.auth.signIn({ email, password });
      localStorage.setItem('auth_token', response.data.token);
      setUser(response.data.user);
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.response?.data?.error || "Login failed") };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const response = await api.auth.signUp({ email, password, fullName });
      localStorage.setItem('auth_token', response.data.token);
      setUser(response.data.user);
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.response?.data?.error || "Signup failed") };
    }
  };

  const signOut = async () => {
    await api.auth.signOut();
    setUser(null);
    window.location.href = '/auth';
  };

  const signInAsDemo = async () => {
    // Try to login
    const loginRes = await signIn(DEMO_EMAIL, DEMO_PASSWORD);
    if (!loginRes.error) return loginRes;

    // If login fails, try to signup
    const signupRes = await signUp(DEMO_EMAIL, DEMO_PASSWORD, "Demo User");
    if (!signupRes.error) return signupRes;

    // If signup also fails (e.g. user exists but login failed due to password), return login error
    return loginRes;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, signInAsDemo, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
