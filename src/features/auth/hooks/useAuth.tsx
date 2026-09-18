import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import type { Json } from "@/integrations/supabase/types";
import { vaultSyncService } from '@/core/vault/VaultSyncService';

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_public: boolean;
  preferences: Json;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

type ProfileUpdate = {
  display_name?: string;
  bio?: string;
  is_public?: boolean;
  avatar_url?: string;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  updateProfile: (updates: ProfileUpdate) => Promise<{ error: Error | null }>;
  uploadAvatar: (file: File) => Promise<{ url: string | null; error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Rate limiting state
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

interface RateLimitState {
  attempts: number;
  lockoutUntil: number | null;
}

const getRateLimitState = (): RateLimitState => {
  const stored = localStorage.getItem('auth_rate_limit');
  if (stored) {
    return JSON.parse(stored);
  }
  return { attempts: 0, lockoutUntil: null };
};

const setRateLimitState = (state: RateLimitState) => {
  localStorage.setItem('auth_rate_limit', JSON.stringify(state));
};

const checkRateLimit = (): { allowed: boolean; remainingTime?: number } => {
  const state = getRateLimitState();
  
  if (state.lockoutUntil && Date.now() < state.lockoutUntil) {
    return { 
      allowed: false, 
      remainingTime: Math.ceil((state.lockoutUntil - Date.now()) / 1000 / 60) 
    };
  }
  
  if (state.lockoutUntil && Date.now() >= state.lockoutUntil) {
    setRateLimitState({ attempts: 0, lockoutUntil: null });
  }
  
  return { allowed: true };
};

const recordLoginAttempt = (success: boolean) => {
  if (success) {
    setRateLimitState({ attempts: 0, lockoutUntil: null });
    return;
  }
  
  const state = getRateLimitState();
  const newAttempts = state.attempts + 1;
  
  if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
    setRateLimitState({ 
      attempts: newAttempts, 
      lockoutUntil: Date.now() + LOCKOUT_DURATION 
    });
  } else {
    setRateLimitState({ attempts: newAttempts, lockoutUntil: null });
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile | null;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id).then(setProfile);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: displayName || email.split('@')[0],
        },
      },
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
      return { 
        error: new Error(`Too many login attempts. Please try again in ${rateCheck.remainingTime} minutes.`) 
      };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    recordLoginAttempt(!error);
    
    if (error) {
      const state = getRateLimitState();
      const remaining = MAX_LOGIN_ATTEMPTS - state.attempts;
      if (remaining > 0 && remaining < MAX_LOGIN_ATTEMPTS) {
        return { 
          error: new Error(`${error.message} (${remaining} attempts remaining)`) 
        };
      }
    }
    
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Clear local vault data for session-based persistence
    try {
      await vaultSyncService.clearLocalData();
      console.log('Local vault data cleared on logout');
    } catch (error) {
      console.error('Failed to clear local vault data:', error);
    }
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    
    // Clear any other session-specific local storage
    localStorage.removeItem('auth_rate_limit');
    localStorage.removeItem('graphConfig');
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?mode=update-password`,
    });
    
    return { error: error as Error | null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    return { error: error as Error | null };
  };

  const updateProfile = async (updates: ProfileUpdate) => {
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);
    
    if (!error) {
      await refreshProfile();
    }
    
    return { error: error as Error | null };
  };

  const uploadAvatar = async (file: File) => {
    if (!user) {
      return { url: null, error: new Error('Not authenticated') };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/avatar.${fileExt}`;
    
    // Delete old avatar first
    await supabase.storage.from('avatars').remove([fileName]);
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });
    
    if (uploadError) {
      return { url: null, error: uploadError as Error };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    // Update profile with new avatar URL
    await updateProfile({ avatar_url: `${publicUrl}?t=${Date.now()}` });
    
    return { url: publicUrl, error: null };
  };

  const deleteAccount = async () => {
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    // Delete avatar from storage
    const { data: files } = await supabase.storage
      .from('avatars')
      .list(user.id);
    
    if (files && files.length > 0) {
      const filesToDelete = files.map(f => `${user.id}/${f.name}`);
      await supabase.storage.from('avatars').remove(filesToDelete);
    }

    // Profile will be deleted automatically via CASCADE
    // Sign out the user
    await signOut();
    
    toast.success('Account deleted successfully');
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
        updateProfile,
        uploadAvatar,
        deleteAccount,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
