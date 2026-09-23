export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'guest' | 'user' | 'owner' | 'admin' | 'renter';
export type AppRole = 'renter' | 'owner' | 'admin';
export type OwnerApplicationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  firebase_uid?: string | null;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: UserRole;
  app_role?: AppRole;
  avatar_url?: string | null;
  university?: string | null;
  student_year?: string | null;
  school?: string | null;
  year?: string | null;
  bio?: string | null;
  address?: string | null;
  rating?: number | null;
  verified?: boolean;
  phone_verified?: boolean;
  email_verified?: boolean;
  student_verified?: boolean;
  student_card_url?: string | null;
  social_link?: string | null;
  facebook_link?: string | null;
  zalo_link?: string | null;
  owner_application_status?: OwnerApplicationStatus;
  owner_application_date?: string | null;
  owner_rejection_reason?: string | null;
  onboarding_completed?: boolean;
  owner_onboarding_completed?: boolean;
  is_demo_account?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id?: string;
          firebase_uid?: string | null;
          full_name?: string | null;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          role?: UserRole;
          app_role?: AppRole;
          avatar_url?: string | null;
          university?: string | null;
          student_year?: string | null;
          school?: string | null;
          year?: string | null;
          bio?: string | null;
          address?: string | null;
          rating?: number | null;
          verified?: boolean;
          phone_verified?: boolean;
          email_verified?: boolean;
          student_verified?: boolean;
          student_card_url?: string | null;
          social_link?: string | null;
          facebook_link?: string | null;
          zalo_link?: string | null;
          owner_application_status?: OwnerApplicationStatus;
          owner_application_date?: string | null;
          owner_rejection_reason?: string | null;
          onboarding_completed?: boolean;
          owner_onboarding_completed?: boolean;
          is_demo_account?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          firebase_uid?: string | null;
          full_name?: string | null;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          role?: UserRole;
          app_role?: AppRole;
          avatar_url?: string | null;
          university?: string | null;
          student_year?: string | null;
          school?: string | null;
          year?: string | null;
          bio?: string | null;
          address?: string | null;
          rating?: number | null;
          verified?: boolean;
          phone_verified?: boolean;
          email_verified?: boolean;
          student_verified?: boolean;
          student_card_url?: string | null;
          social_link?: string | null;
          facebook_link?: string | null;
          zalo_link?: string | null;
          owner_application_status?: OwnerApplicationStatus;
          owner_application_date?: string | null;
          owner_rejection_reason?: string | null;
          onboarding_completed?: boolean;
          owner_onboarding_completed?: boolean;
          is_demo_account?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      [key: string]: any;
    };
    Views: {
      [key: string]: any;
    };
    Functions: {
      [key: string]: any;
    };
    Enums: {
      [key: string]: any;
    };
  };
}
