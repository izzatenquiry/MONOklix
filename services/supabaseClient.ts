import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xbbhllhgbachkzvpxvam.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiYmhsbGhnYmFjaGt6dnB4dmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4Njk1NjksImV4cCI6MjA3MzQ0NTU2OX0.l--gaQSJ5hPnJyZOC9-QsRRQjr-hnsX_WeGSglbNP8E';

// Define types for your database for type-safe queries
export interface Database {
  public: {
    Tables: {
      users: {
        Row: { // The data coming from the database
          id: string
          created_at: string
          full_name: string | null
          email: string
          phone: string
          // FIX: Use string literals instead of circular enum reference for correct type inference
          role: 'admin' | 'user'
          // FIX: Use string literals instead of circular enum reference for correct type inference
          status: 'pending_payment' | 'trial' | 'inactive' | 'lifetime' | 'admin'
          api_key: string | null
          avatar_url: string | null
          subscription_expiry: string | null
          webhook_url: string | null
        }
        Insert: { // The data you can insert
          id?: string // id is auto-generated
          full_name?: string | null
          email: string
          phone: string
          // FIX: Use string literals instead of circular enum reference for correct type inference
          role?: 'admin' | 'user'
          // FIX: Use string literals instead of circular enum reference for correct type inference
          status?: 'pending_payment' | 'trial' | 'inactive' | 'lifetime' | 'admin'
          api_key?: string | null
          avatar_url?: string | null
          subscription_expiry?: string | null
          webhook_url?: string | null
        }
        Update: { // The data you can update
          full_name?: string | null
          email?: string
          phone?: string
          // FIX: Use string literals instead of circular enum reference for correct type inference
          role?: 'admin' | 'user'
          // FIX: Use string literals instead of circular enum reference for correct type inference
          status?: 'pending_payment' | 'trial' | 'inactive' | 'lifetime' | 'admin'
          api_key?: string | null
          avatar_url?: string | null
          subscription_expiry?: string | null
          webhook_url?: string | null
        }
        // FIX: Added Relationships array to fix Supabase type inference issues, resolving 'never' types.
        Relationships: []
      }
    }
    Functions: {}
    Enums: {
      user_role: 'admin' | 'user'
      user_status: 'pending_payment' | 'trial' | 'inactive' | 'lifetime' | 'admin'
    }
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);