import { type User, type LoginResult, UserRole, UserStatus } from '../types';
import { supabase, type Database } from './supabaseClient';
import { verifyApiKey } from './geminiService';

// --- New API Key Management ---
type UserProfileData = Database['public']['Tables']['users']['Row'];

/**
 * Fetches the API key from the admin account to be used by trial users.
 * @returns {Promise<string | null>} The admin's API key or null if not found.
 */
export const getTrialApiKey = async (): Promise<string | null> => {
    const { data, error } = await supabase
        .from('users')
        .select('api_key')
        .eq('role', 'admin')
        .limit(1)
        .single();
    
    // FIX: Cast `data` to the correct partial type to access `api_key`.
    const typedData = data as Pick<UserProfileData, 'api_key'> | null;

    if (error || !typedData || !typedData.api_key) {
        console.error("CRITICAL: Could not fetch admin API key for trial users.", error);
        return null;
    }
    // Assuming the key is stored unencrypted in the database as we can't decrypt on client.
    return typedData.api_key;
};


export const verifyAndSaveUserApiKey = async (
    userId: string,
    key: string
): Promise<{ success: true; user: User } | { success: false; message: string }> => {
  if (!key.trim()) {
    return { success: false, message: 'API Key tidak boleh kosong.' };
  }

  const isValid = await verifyApiKey(key.trim());

  if (isValid) {
    // Fetch the user's current role to ensure an admin's status is preserved.
    const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
    
    // FIX: Cast `user` to the correct partial type to access `role`.
    const typedUser = user as Pick<UserProfileData, 'role'> | null;

    if (fetchError || !typedUser) {
        console.error("Could not fetch user role before API key save:", fetchError);
        return { success: false, message: "Gagal mendapatkan butiran pengguna semasa." };
    }

    // Admins keep 'admin' status, others are upgraded to 'lifetime'.
    const newStatus = typedUser.role === 'admin' ? 'admin' : 'lifetime';

    // FIX: The auto-inferred type for the update payload is 'never'. Casting to the correct Update type from the Database interface to resolve this.
    const { error: updateError } = await supabase
      .from('users')
      .update({ api_key: key.trim(), status: newStatus } as Database['public']['Tables']['users']['Update'])
      .eq('id', userId);

    if (updateError) {
      return { success: false, message: `Gagal menyimpan kunci: ${getErrorMessage(updateError)}` };
    }

    const updatedUser = await getUserProfile(userId);
    if (!updatedUser) {
      return { success: false, message: 'Kunci disimpan tetapi gagal memuatkan semula profil pengguna.' };
    }

    return { success: true, user: updatedUser };
  } else {
    return { success: false, message: 'API Key tidak sah. Sila semak semula.' };
  }
};

/**
 * Helper to extract a readable error message from various error types.
 * @param error The error object.
 * @returns A readable string message.
 */
const getErrorMessage = (error: unknown): string => {
    let message = 'Ralat tidak diketahui berlaku.';
    if (error instanceof Error) {
        message = error.message;
    } else if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        message = (error as any).message;
    } else if (typeof error === 'string') {
        message = error;
    } else {
        try {
            message = JSON.stringify(error);
        } catch {
            // Fallback if stringify fails (e.g., circular reference)
            message = 'Objek ralat yang tidak dapat disirikan.';
        }
    }
    return message;
};

/**
 * Triggers a webhook with new user data.
 * @param user The newly registered user object.
 */
const triggerWebhook = async (user: User) => {
    const webhookUrl = localStorage.getItem('1za7-ai-webhook-url');
    if (!webhookUrl) return;

    const payload = {
        event: 'user.registered',
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            status: user.status,
            role: user.role,
        },
        timestamp: new Date().toISOString(),
    };

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            console.error(`Webhook trigger failed with status: ${response.status}`);
        }
    } catch (error) {
        console.error('Failed to trigger webhook:', error);
    }
};


// --- Insecure Local Session Management ---
// This stores a user object WITHOUT the API key for session persistence on refresh.
export const setLocalUser = (user: User | null): void => {
  if (!user) {
    clearLocalUser();
    return;
  }
  try {
    // IMPORTANT: Never store the API key in localStorage.
    const { apiKey, ...userToStore } = user;
    localStorage.setItem('localUser', JSON.stringify(userToStore));
  } catch (e) {
    console.error('Failed to save user to local storage', e);
  }
};

export const getLocalUser = (): User | null => {
  try {
    const userJson = localStorage.getItem('localUser');
    return userJson ? JSON.parse(userJson) : null;
  } catch (e) {
    console.error('Failed to parse user from local storage', e);
    return null;
  }
};

export const clearLocalUser = (): void => {
  localStorage.removeItem('localUser');
};



/**
 * Maps a user profile from the database to the application's User type.
 */
const mapProfileToUser = (
  profile: UserProfileData,
  authEmail: string,
  authId: string
): User => {
  return {
    id: authId,
    email: authEmail,
    username: profile.email.split('@')[0], // Fallback username
    fullName: profile.full_name || undefined,
    phone: profile.phone,
    role: profile.role as UserRole,
    status: profile.status as UserStatus,
    apiKey: profile.api_key,
    avatarUrl: profile.avatar_url || undefined,
    subscriptionExpiry: profile.subscription_expiry ? new Date(profile.subscription_expiry).getTime() : undefined,
  };
};

// Register a new user and log them in immediately.
export const registerUser = async (username: string, email: string, phone: string): Promise<LoginResult> => {
    if (!username.trim() || !email.trim() || !phone.trim()) {
        return { success: false, message: 'Semua medan diperlukan.' };
    }

    // Generate a secure, random password since the user won't use it.
    const password = Math.random().toString(36).slice(-16);

    // 1. Sign up the user in Supabase Auth. Assuming email confirmation is OFF in Supabase settings.
    // This will create the user and log them in, returning a session.
    // FIX: Cast supabase.auth to any to resolve type error for signUp method.
    const { data: authData, error: authError } = await (supabase.auth as any).signUp({
        email: email,
        password: password,
    });

    if (authError) {
        return { success: false, message: getErrorMessage(authError) };
    }
    if (!authData.user) {
        return { success: false, message: 'Pendaftaran gagal: pengguna tidak dicipta.' };
    }
    
    // Set subscription to expire in 30 minutes for trial users
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 30);

    // 2. Create a corresponding profile in the public.users table
    // FIX: The auto-inferred type for the insert payload is 'never'. Casting to the correct Insert type from the Database interface to resolve this.
    const profileToInsert = {
        id: authData.user.id,
        full_name: username,
        email: email,
        phone: phone,
        role: 'user',
        status: 'trial', // Default status
        api_key: null,
        avatar_url: null,
        subscription_expiry: expiryDate.toISOString(),
    };
    const { error: profileError } = await supabase.from('users').insert(profileToInsert as Database['public']['Tables']['users']['Insert']);
    
    if (profileError) {
        const detailedMessage = getErrorMessage(profileError);
        console.error("Profile creation failed after signup:", detailedMessage);
        // Attempt to clean up the created auth user if profile creation fails
        // This requires an admin client, which we don't have on the frontend.
        // For now, the user will exist in auth but not in profiles, which is a recoverable state.
        return { success: false, message: `Akaun dicipta tetapi gagal menyimpan profil: ${detailedMessage}` };
    }

    // 3. Construct the user object to return for immediate login
    const newUser: User = {
        id: authData.user.id,
        email: authData.user.email!,
        username: email.split('@')[0],
        fullName: username,
        phone: phone,
        role: 'user',
        status: 'trial',
        subscriptionExpiry: expiryDate.getTime(),
    };

    // Trigger webhook after successful registration and profile creation
    await triggerWebhook(newUser);

    // Return the user object for immediate login session
    return { success: true, user: newUser };
};

// Log in a user instantly by checking if their email exists in the DB.
// NOTE: This is highly insecure as it does not verify email ownership.
export const loginUser = async (email: string): Promise<LoginResult> => {
    if (!email.trim()) {
        return { success: false, message: 'Sila masukkan e-mel.' };
    }

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
    
    // FIX: Cast `data` to the correct type to access its properties.
    const typedData = data as UserProfileData | null;

    if (error || !typedData) {
        console.error('Login error:', error?.message);
        return { success: false, message: 'E-mel tidak ditemui. Sila daftar jika anda pengguna baru.' };
    }
    
    const user = mapProfileToUser(typedData, typedData.email, typedData.id);
    return { success: true, user };
};

// Sign out the current user (clears both Supabase and local sessions)
export const signOutUser = async (): Promise<void> => {
    // FIX: Cast supabase.auth to any to resolve type error for signOut method.
    const { error } = await (supabase.auth as any).signOut();
    if (error) {
        console.error("Error signing out:", getErrorMessage(error));
    }
    clearLocalUser(); // Also clear our insecure local session
};


// Get a single user's profile from the database, including sensitive info like API key
export const getUserProfile = async (userId: string): Promise<User | null> => {
    // FIX: Cast supabase.auth to any to resolve type error for getUser method.
    const { data: authData, error: authError } = await (supabase.auth as any).getUser();
    if (authError || !authData.user) {
        if (getErrorMessage(authError) !== "User not found") {
            console.error("Error getting auth user:", getErrorMessage(authError));
        }
        // It might be our local user, let's try fetching profile anyway if we have a userId
    }

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    
    // FIX: Add a check for null `data` and cast it to the correct type.
    if (error || !data) {
        console.error('Error fetching user profile:', getErrorMessage(error));
        return null;
    }
    
    const typedData = data as UserProfileData;
    // Use auth email if available, otherwise fallback to profile email
    const email = authData.user?.email ?? typedData.email;
    return mapProfileToUser(typedData, email, typedData.id);
};

// Get all users (for admin dashboard)
export const getAllUsers = async (): Promise<User[] | null> => {
    const { data, error } = await supabase.from('users').select('*');

    if (error) {
        console.error('Error fetching all users:', getErrorMessage(error));
        return null;
    }

    // FIX: Cast each profile object to the correct type before mapping.
    return (data as UserProfileData[]).map(profile => mapProfileToUser(profile, profile.email, profile.id));
};

// Update a user's status
export const updateUserStatus = async (userId: string, status: UserStatus): Promise<boolean> => {
    // FIX: The auto-inferred type for the update payload is 'never'. Casting to the correct Update type from the Database interface to resolve this.
    const { error } = await supabase
        .from('users')
        .update({ status: status } as Database['public']['Tables']['users']['Update'])
        .eq('id', userId);

    if (error) {
        console.error("Failed to update status:", getErrorMessage(error));
        return false;
    }
    return true;
};

/**
 * Checks if a trial user's subscription has expired and updates their status if needed.
 * @param user The user object to check.
 * @returns {Promise<User>} The original user object or an updated one if the status changed.
 */
export const checkAndDeactivateTrialUser = async (user: User): Promise<User> => {
    const isTrial = user.status === 'trial';
    const isExpired = user.subscriptionExpiry && user.subscriptionExpiry < Date.now();

    if (isTrial && isExpired) {
        console.log(`Trial for user ${user.id} has expired. Updating status to inactive.`);
        const success = await updateUserStatus(user.id, 'inactive');
        if (success) {
            return { ...user, status: 'inactive' };
        }
    }
    // Return original user if not a trial, not expired, or if DB update failed
    return user;
};

// Update user profile details (non-sensitive)
export const updateUserProfile = async (
  userId: string,
  updates: { fullName?: string; email?: string; avatarUrl?: string }
): Promise<{ success: true; user: User } | { success: false; message: string }> => {
    
    const profileUpdates: { full_name?: string; avatar_url?: string } = {};
    if (updates.fullName) profileUpdates.full_name = updates.fullName;
    if (updates.avatarUrl) profileUpdates.avatar_url = updates.avatarUrl;

    // FIX: The auto-inferred type for the update payload is 'never'. Casting to the correct Update type from the Database interface to resolve this.
    const { error } = await supabase
        .from('users')
        .update(profileUpdates as Database['public']['Tables']['users']['Update'])
        .eq('id', userId);

    if (error) {
        return { success: false, message: getErrorMessage(error) };
    }

    const updatedProfile = await getUserProfile(userId);
    if (!updatedProfile) {
        return { success: false, message: "Gagal mendapatkan semula profil selepas kemas kini." };
    }
    
    return { success: true, user: updatedProfile };
};


/**
 * Replaces the entire user database with an imported list.
 */
export const replaceUsers = async (importedUsers: User[]): Promise<{ success: boolean; message: string }> => {
    try {
        if (!Array.isArray(importedUsers)) {
            return { success: false, message: 'Fail import mestilah tatasusunan pengguna.' };
        }
        
        const profilesToInsert = importedUsers.map(user => ({
            id: user.id,
            full_name: user.fullName || null,
            email: user.email,
            phone: user.phone,
            role: user.role as UserRole,
            status: user.status as UserStatus,
            api_key: user.apiKey || null,
            avatar_url: user.avatarUrl || null,
            // Include subscription_expiry in the import/export logic
            subscription_expiry: user.subscriptionExpiry ? new Date(user.subscriptionExpiry).toISOString() : null,
        }));
        
        const { error: deleteError } = await supabase.from('users').delete().neq('role', 'admin');
        if (deleteError) throw deleteError;

        // FIX: The auto-inferred type for the insert payload is 'never'. Casting to the correct Insert type from the Database interface to resolve this.
        const { error: insertError } = await supabase.from('users').insert(profilesToInsert as Database['public']['Tables']['users']['Insert'][]);
        if (insertError) throw insertError;

        return { success: true, message: 'Pangkalan data pengguna berjaya diimport.' };

    } catch (error) {
        const message = getErrorMessage(error);
        console.error("Gagal mengimport pengguna:", message);
        return { success: false, message: `Berlaku ralat semasa mengimport: ${message}` };
    }
};

export const exportAllUserData = async (): Promise<UserProfileData[] | null> => {
     const { data, error } = await supabase.from('users').select('*');
     if (error) {
        console.error('Error exporting user data:', getErrorMessage(error));
        return null;
     }
     return data as UserProfileData[];
};

/**
 * Initializes/repairs the admin account. This is an aggressive function that will sign out any
 * active user session to ensure the admin account is correctly configured in both Auth and the database.
 */
export const initializeAdminAccount = async () => {
    // Force sign out to ensure we can run the admin check, even if a user is logged in.
    // FIX: Cast supabase.auth to any to resolve type error for signOut method.
    await (supabase.auth as any).signOut();
    console.log("Session cleared. Forcibly checking/repairing admin account...");

    const adminEmail = 'izzat.enquiry@gmail.com';
    const adminPassword = 'M!m@Sept2025';
    let adminUserId: string | undefined;

    // Try to sign in as admin
    // FIX: Cast supabase.auth to any to resolve type error for signInWithPassword method.
    const { data: signInData, error: signInError } = await (supabase.auth as any).signInWithPassword({
        email: adminEmail,
        password: adminPassword,
    });

    if (signInError && signInError.message.includes('Invalid login credentials')) {
        // If sign-in fails, the account might not exist in Auth, so try to create it.
        console.log("Admin login failed, attempting to create admin account in Auth service...");
        // FIX: Cast supabase.auth to any to resolve type error for signUp method.
        const { data: signUpData, error: signUpError } = await (supabase.auth as any).signUp({
            email: adminEmail,
            password: adminPassword,
        });

        if (signUpError) {
            // If sign-up fails because the user is already there, it's a weird state (e.g., unconfirmed email). We can't proceed.
            if (signUpError.message.includes('User already registered')) {
                console.error('CRITICAL: Admin user exists in auth but could not log in. Manual intervention is required (e.g., email confirmation or password reset in Supabase).');
            } else {
                console.error('Admin initialization failed during signup:', getErrorMessage(signUpError));
            }
            // FIX: Cast supabase.auth to any to resolve type error for signOut method.
            await (supabase.auth as any).signOut(); // Ensure clean state on exit
            return;
        }
        adminUserId = signUpData?.user?.id;
        console.log('Admin account created in Auth service.');

    } else if (signInError) {
        // Any other sign-in error is a problem.
        console.error('Admin initialization failed during sign-in:', getErrorMessage(signInError));
        // FIX: Cast supabase.auth to any to resolve type error for signOut method.
        await (supabase.auth as any).signOut(); // Ensure clean state on exit
        return;
    } else {
        // Sign-in was successful.
        adminUserId = signInData?.user?.id;
    }

    if (!adminUserId) {
        console.error('Could not determine admin user ID during initialization.');
        // FIX: Cast supabase.auth to any to resolve type error for signOut method.
        await (supabase.auth as any).signOut();
        return;
    }

    console.log(`Ensuring admin profile for user ID: ${adminUserId}.`);
    
    // Step 1: Fetch existing profile to preserve data like API key.
    const { data: existingProfile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', adminUserId)
        .single();
    
    // FIX: Cast `existingProfile` to handle `never` type and potential null value.
    const typedExistingProfile = existingProfile as UserProfileData | null;
        
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means "exact one row not found", which is fine.
        console.error('Error fetching admin profile before upsert:', getErrorMessage(fetchError));
    }

    // Prepare data for upsert, preserving existing values where possible.
    const profileData = {
        ...(typedExistingProfile || {}), // This carries over api_key, avatar_url etc. if they exist
        id: adminUserId,
        full_name: typedExistingProfile?.full_name || 'Izzat Admin',
        email: adminEmail,
        phone: typedExistingProfile?.phone || '0000000000',
        role: 'admin' as const,
        status: 'admin' as const,
        subscription_expiry: null, // Admins do not have an expiry
    };
    
    // Step 2: Upsert the correct admin profile.
    // FIX: The auto-inferred type for the upsert payload is 'never'. Casting to the correct Insert type from the Database interface to resolve this.
    const { error: upsertError } = await supabase.from('users').upsert(profileData as Database['public']['Tables']['users']['Insert'], { onConflict: 'id' });

    if (upsertError) {
        console.error('Failed to upsert admin profile:', getErrorMessage(upsertError));
        // We don't return here, still attempt cleanup and sign out.
    } else {
        console.log('Admin profile successfully configured in database.');
    }
    
    // Step 3: Clean up any other potential admin accounts to ensure only one exists.
    // This is safer than deleting, as it preserves user data but demotes their role.
    // FIX: The auto-inferred type for the update payload is 'never'. Casting to the correct Update type from the Database interface to resolve this.
    const { error: cleanupError } = await supabase
        .from('users')
        .update({ role: 'user', status: 'inactive' } as Database['public']['Tables']['users']['Update']) // Demote to a safe, non-privileged state
        .eq('role', 'admin')
        .neq('id', adminUserId); // Do not demote the actual admin
    
    if (cleanupError) {
         console.error('Failed to clean up orphaned admin profiles:', getErrorMessage(cleanupError));
    } else {
        console.log('Orphaned admin profile cleanup complete.');
    }

    // Final sign out to leave the app in a clean state for the actual user.
    // FIX: Cast supabase.auth to any to resolve type error for signOut method.
    await (supabase.auth as any).signOut();
    console.log("Admin check/repair complete. Session cleared for user login.");
};