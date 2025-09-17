export type View =
  | 'e-course'
  // Text suite already exists and handles its own internal views
  | 'ai-text-suite'
  // The new suites for image and video
  | 'ai-image-suite'
  | 'ai-video-suite'
  // Standalone tools/pages
  | 'gallery'
  | 'library'
  // Settings & Admin
  | 'user-profile'
  | 'user-database'
  | 'integrations'
  | 'e-tutorial-admin';

export interface NavItem {
  id: View | 'logout';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: 'main' | 'free' | 'ugc' | 'bottom' | 'admin';
  isNew?: boolean;
  isExternal?: boolean;
  roles?: ('admin' | 'user')[];
}

// FIX: Added 'Audio' to the HistoryItemType to support it as a valid type for history items.
export type HistoryItemType = 'Image' | 'Video' | 'Storyboard' | 'Canvas' | 'Audio' | 'Copy';

export interface HistoryItem {
  id: string;
  type: HistoryItemType;
  prompt: string;
  // result can be a base64 string, a blob URL, or plain text
  result: string; 
  timestamp: number;
}

export interface Tutorial {
  title: string;
  description: string;
  thumbnailUrl: string; // Will be an empty string if not set
}

export interface TutorialContent {
  mainVideoUrl: string;
  mainTitle: string;
  mainDescription: string;
  tutorials: Tutorial[];
}

export type UserRole = 'admin' | 'user';
export type UserStatus = 'trial' | 'inactive' | 'lifetime' | 'admin';

export interface User {
  id: string; // from Supabase auth
  email: string; // from Supabase auth
  // from public.users table
  fullName?: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  apiKey?: string | null;
  avatarUrl?: string;
  username: string; // Keeping this for consistency in UI
  subscriptionExpiry?: number; // Added back for trial management
}

export type LoginResult = 
  | { success: true; user: User; }
  | { success: false; message: string; };

// The RegisterResult type is no longer needed as registration now logs the user in directly.
// export type RegisterResult = 
//   | { success: true; message: string; } // User object is not returned as confirmation is required
//   | { success: false; message: string; };