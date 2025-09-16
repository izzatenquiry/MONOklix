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
          role: string
          status: string
          api_key: string | null
          avatar_url: string | null
          subscription_expiry: string | null
        }
        Insert: { // The data you can insert
          id: string
          full_name?: string | null
          email: string
          phone: string
          role?: string
          status?: string
          api_key?: string | null
          avatar_url?: string | null
          subscription_expiry?: string | null
        }
        Update: { // The data you can update
          full_name?: string | null
          email?: string
          phone?: string
          role?: string
          status?: string
          api_key?: string | null
          avatar_url?: string | null
          subscription_expiry?: string | null
        }
      }
    }
    Functions: {}
    Enums: {}
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);