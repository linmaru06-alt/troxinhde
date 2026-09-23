import { supabase, isSupabaseConfigured } from '../supabase';

export interface SignUpParams {
  phone: string;
  password?: string;
  fullName: string;
  role?: 'user' | 'owner' | 'admin';
}

export interface SignInParams {
  phone: string;
  password?: string;
}

export async function signUp({ phone, password = 'DefaultPassword123!', fullName, role = 'user' }: SignUpParams) {
  if (!isSupabaseConfigured) {
    return {
      user: {
        id: `user_${Date.now()}`,
        phone,
        name: fullName,
        role,
        avatarUrl: '/images/user-avatar.jpg',
        createdAt: new Date().toISOString(),
      },
      session: null,
      error: null,
    };
  }

  const email = `${phone.replace(/\D/g, '')}@troxinh.vn`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        role,
        avatar_url: '/images/user-avatar.jpg',
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signIn({ phone, password = 'DefaultPassword123!' }: SignInParams) {
  if (!isSupabaseConfigured) {
    return {
      user: {
        id: `user_${Date.now()}`,
        phone,
        name: 'Người dùng Trọ Xinh',
        role: 'user',
        avatarUrl: '/images/user-avatar.jpg',
        createdAt: new Date().toISOString(),
      },
      session: null,
      error: null,
    };
  }

  const email = `${phone.replace(/\D/g, '')}@troxinh.vn`;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut();
  }
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured) return null;

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    phone: profile?.phone || user.user_metadata?.phone || '',
    name: profile?.full_name || user.user_metadata?.full_name || 'Người dùng',
    role: (profile?.role || user.user_metadata?.role || 'user') as 'user' | 'owner' | 'admin',
    avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || '/images/user-avatar.jpg',
    ownerApplicationStatus: profile?.owner_application_status || 'none',
    onboardingCompleted: profile?.onboarding_completed ?? false,
    ownerOnboardingCompleted: profile?.owner_onboarding_completed ?? false,
    createdAt: profile?.created_at || user.created_at,
  };
}

export async function updateProfile(userId: string, updates: Record<string, any>) {
  if (!isSupabaseConfigured) return updates;
  if (!userId || userId === 'undefined') {
    throw new Error('ID người dùng không hợp lệ');
  }

  const updatePayload: Record<string, any> = { ...updates, updated_at: new Date().toISOString() };
  delete updatePayload.id;

  console.log("Update Payload:", updatePayload);

  const { data, error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
