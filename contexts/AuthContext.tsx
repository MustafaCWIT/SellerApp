import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { hashPin, verifyPin } from '../utils/pinUtils';
import { getFromStorage, saveToStorage, removeFromStorage, KEYS } from '../services/OfflineStorage';

type UserRole = 'salesman' | 'admin' | 'delivery';

interface AuthContextType {
  salesmanId: string | null;
  userId: string | null;
  salesmanName: string | null;
  email: string | null;
  phone: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole | null;
  isAdmin: boolean;
  isDelivery: boolean;
  assignedBookerIds: string[];
  session: Session | null;
  login: (id: string, name: string, pin?: string) => Promise<void>;
  signup: (id: string, name: string, email?: string, phone?: string, pin?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [salesmanId, setSalesmanId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [salesmanName, setSalesmanName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [assignedBookerIds, setAssignedBookerIds] = useState<string[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check for existing session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // First check for saved user session in local storage
        const savedSession = await getFromStorage(KEYS.USER_SESSION);
        if (savedSession) {
          setUserId(savedSession.userId);
          setSalesmanId(savedSession.salesmanId);
          setSalesmanName(savedSession.salesmanName);
          setEmail(savedSession.email);
          setPhone(savedSession.phone);
          setAssignedBookerIds(savedSession.assignedBookerIds || []);
          // Properly restore role - ensure admin and delivery roles are preserved
          const storedRole = savedSession.role as UserRole;
          if (storedRole === 'admin') {
            setRole('admin');
          } else if (storedRole === 'delivery') {
            setRole('delivery');
          } else {
            setRole(storedRole || 'salesman');
          }
        }

        // Also check Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        }
      } catch (error) {
      
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        // Clear user data on logout
        resetState();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const resetState = () => {
    setSalesmanId(null);
    setUserId(null);
    setSalesmanName(null);
    setEmail(null);
    setPhone(null);
    setRole(null);
    setAssignedBookerIds([]);
  };

  const fetchUserProfile = async (authUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (error) {
        return;
      }

      if (data) {
        setUserId(data.id);
        setSalesmanId(data.salesman_id);
        setSalesmanName(data.salesman_name);
        setEmail(data.email);
        setPhone(data.phone);
        setRole(data.role || 'salesman');

      }
    } catch (error) {
      // Silent fail on session restore
    }
  };

  const login = async (id: string, name: string, pin?: string) => {
    try {
      // Try to find user in database
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('salesman_id', id)
        .eq('is_active', true)
        .single();

      if (error || !userData) {
        throw new Error('User not found or inactive');
      }

      // Verify PIN if provided
      if (pin && userData.pin) {
        const isValidPin = await verifyPin(pin, userData.pin);
        if (!isValidPin) {
          throw new Error('Invalid PIN');
        }
      }

      // Set user data
      let userRole: UserRole;
      if (userData.role === 'admin') {
        userRole = 'admin';
      } else if (userData.role === 'delivery') {
        userRole = 'delivery';
      } else {
        userRole = 'salesman';
      }

      const bookerIds = userData.assigned_booker_ids || [];

      setUserId(userData.id);
      setSalesmanId(userData.salesman_id);
      setSalesmanName(userData.salesman_name);
      setEmail(userData.email);
      setPhone(userData.phone);
      setRole(userRole);
      setAssignedBookerIds(bookerIds);

      // Save session to local storage for persistence
      await saveToStorage(KEYS.USER_SESSION, {
        userId: userData.id,
        salesmanId: userData.salesman_id,
        salesmanName: userData.salesman_name,
        email: userData.email,
        phone: userData.phone,
        role: userRole,
        assignedBookerIds: bookerIds,
      });

      return; // Success
    } catch (error: any) {
      throw error; // Re-throw to be handled by login screen
    }
  };

  const signup = async (id: string, name: string, email?: string, phone?: string, pin?: string) => {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('salesman_id')
        .eq('salesman_id', id)
        .single();

      if (existingUser) {
        throw new Error('User with this Salesman ID already exists');
      }

      // Hash the PIN before storing
      const hashedPin = pin ? await hashPin(pin) : null;

      // Create user in database
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            salesman_id: id,
            salesman_name: name,
            email: email || null,
            phone: phone || null,
            pin: hashedPin,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to create user');
      }

      // Set local state after successful creation
      if (data) {
        setUserId(data.id);
        setSalesmanId(data.salesman_id);
        setSalesmanName(data.salesman_name);
        setEmail(data.email);
        setPhone(data.phone);
        return; // Success
      }
    } catch (error: any) {
      throw error; // Re-throw to be handled by the signup screen
    }
  };

  const logout = async () => {
    resetState();

    // Clear saved session from local storage
    await removeFromStorage(KEYS.USER_SESSION);

    // Sign out from Supabase if authenticated
    if (session) {
      await supabase.auth.signOut();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        salesmanId,
        userId,
        salesmanName,
        email,
        phone,
        isAuthenticated: !!salesmanId,
        isLoading,
        role,
        isAdmin: role === 'admin',
        isDelivery: role === 'delivery',
        assignedBookerIds,
        session,
        login,
        signup,
        logout,
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

