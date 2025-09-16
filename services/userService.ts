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
    return { success: false, message: 'API Key cannot be empty.' };
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
        return { success: false, message: "Failed to get current user details." };
    }

    // Admins keep 'admin' status, others are upgraded to 'lifetime'.
    const newStatus = typedUser.role === 'admin' ? 'admin' : 'lifetime';

    // FIX: The auto-inferred type for the update payload is 'never'. Casting to the correct Update type from the Database interface to resolve this.
    const { data: updatedData, error: updateError } = await supabase
      .from('users')
      .update({ api_key: key.trim(), status: newStatus } as Database['public']['Tables']['users']['Update'])
      .eq('id', userId)
      .select()
      .single();

    if (updateError || !updatedData) {
      return { success: false, message: `Failed to save key: ${getErrorMessage(updateError)}` };
    }
    
    const typedUpdatedData = updatedData as UserProfileData;
    const updatedUser = mapProfileToUser(typedUpdatedData, typedUpdatedData.email, typedUpdatedData.id);

    return { success: true, user: updatedUser };
  } else {
    return { success: false, message: 'Invalid API Key. Please check it and try again.' };
  }
};

/**
 * Helper to extract a readable error message from various error types.
 * @param error The error object.
 * @returns A readable string message.
 */
const getErrorMessage = (error: unknown): string => {
    let message = 'An unknown error occurred.';
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
            message = 'Unserializable error object.';
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
    const cleanedUsername = username.trim();
    const cleanedEmail = email.trim().toLowerCase();
    const cleanedPhone = phone.trim();

    if (!cleanedUsername || !cleanedEmail || !cleanedPhone) {
        return { success: false, message: 'All fields are required.' };
    }

    // Use the cleaned phone number as the password for simplicity in this insecure flow.
    const password = cleanedPhone;

    // 1. Sign up the user in Supabase Auth.
    const { data: authData, error: authError } = await (supabase.auth as any).signUp({
        email: cleanedEmail,
        password: password,
    });

    if (authError) {
        return { success: false, message: getErrorMessage(authError) };
    }
    if (!authData.user) {
        return { success: false, message: 'Registration failed: user was not created.' };
    }
    
    // Set subscription to expire in 30 minutes for trial users
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 30);

    // 2. Create a corresponding profile in the public.users table
    const profileToInsert = {
        id: authData.user.id,
        full_name: cleanedUsername,
        email: cleanedEmail,
        phone: cleanedPhone,
        role: 'user' as const,
        status: 'trial' as const,
        api_key: null,
        avatar_url: null,
        subscription_expiry: expiryDate.toISOString(),
    };
    // FIX: The auto-inferred type for the insert payload is 'never'. Casting to the correct Insert type from the Database interface to resolve this.
    const { error: profileError } = await supabase.from('users').insert(profileToInsert as Database['public']['Tables']['users']['Insert']);
    
    if (profileError) {
        const detailedMessage = getErrorMessage(profileError);
        console.error("Profile creation failed after signup:", detailedMessage);
        return { success: false, message: `Account created but failed to save profile: ${detailedMessage}` };
    }

    // 3. Construct the user object to return for immediate login session
    const newUser: User = {
        id: authData.user.id,
        email: authData.user.email!,
        username: cleanedEmail.split('@')[0],
        fullName: cleanedUsername,
        phone: cleanedPhone,
        role: 'user',
        status: 'trial',
        subscriptionExpiry: expiryDate.getTime(),
    };

    await triggerWebhook(newUser);
    return { success: true, user: newUser };
};

// Log in a user by creating a valid Supabase session.
export const loginUser = async (email: string): Promise<LoginResult> => {
    const cleanedEmail = email.trim().toLowerCase();
    if (!cleanedEmail) {
        return { success: false, message: 'Please enter an email.' };
    }

    const adminEmail = 'izzat.enquiry@gmail.com';
    const adminPassword = 'M!m@Sept2025';
    let password;

    if (cleanedEmail === adminEmail) {
        password = adminPassword;
    } else {
        // For regular users, the phone number is the password.
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('phone')
            .eq('email', cleanedEmail)
            .single();

        const typedProfile = profile as Pick<UserProfileData, 'phone'> | null;

        if (profileError || !typedProfile) {
            return { success: false, message: 'Email not found. Please register if you are a new user.' };
        }
        password = typedProfile.phone;
    }

    // Sign in with Supabase Auth to create a session
    const { data: signInData, error: signInError } = await (supabase.auth as any).signInWithPassword({
        email: cleanedEmail,
        password: password,
    });

    if (signInError) {
        console.error('Login failed for user:', cleanedEmail, signInError.message);
        return { success: false, message: `Log in failed: ${getErrorMessage(signInError)}` };
    }

    if (!signInData.user) {
        return { success: false, message: 'Log in failed: User not found after authentication.' };
    }

    const userProfile = await getUserProfile(signInData.user.id);
    if (!userProfile) {
        return { success: false, message: 'Login successful but failed to retrieve user profile.' };
    }
    
    return { success: true, user: userProfile };
};

// Sign out the current user (clears Supabase session)
export const signOutUser = async (): Promise<void> => {
    const { error } = await (supabase.auth as any).signOut();
    if (error) {
        console.error("Error signing out:", getErrorMessage(error));
    }
};


// Get a single user's profile from the database
export const getUserProfile = async (userId: string): Promise<User | null> => {
    const { data: authData, error: authError } = await (supabase.auth as any).getUser();
    if (authError || !authData.user) {
        if (getErrorMessage(authError) !== "User not found") {
            // Don't log expected "Auth session missing!" for insecure local user flow.
        }
    }

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error || !data) {
        console.error('Error fetching user profile:', getErrorMessage(error));
        return null;
    }
    
    const typedData = data as UserProfileData;
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
    const { data: updatedData, error } = await supabase
        .from('users')
        .update(profileUpdates as Database['public']['Tables']['users']['Update'])
        .eq('id', userId)
        .select()
        .single();

    if (error || !updatedData) {
        return { success: false, message: getErrorMessage(error) };
    }
    
    const typedData = updatedData as UserProfileData;
    const updatedProfile = mapProfileToUser(typedData, typedData.email, typedData.id);
    
    return { success: true, user: updatedProfile };
};


/**
 * Replaces the entire user database with an imported list.
 */
export const replaceUsers = async (importedUsers: User[]): Promise<{ success: boolean; message: string }> => {
    try {
        if (!Array.isArray(importedUsers)) {
            return { success: false, message: 'Import file must be an array of users.' };
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
            subscription_expiry: user.subscriptionExpiry ? new Date(user.subscriptionExpiry).toISOString() : null,
        }));
        
        const { error: deleteError } = await supabase.from('users').delete().neq('role', 'admin');
        if (deleteError) throw deleteError;

        // FIX: The auto-inferred type for the insert payload is 'never'. Casting to the correct Insert type from the Database interface to resolve this.
        const { error: insertError } = await supabase.from('users').insert(profilesToInsert as Database['public']['Tables']['users']['Insert'][]);
        if (insertError) throw insertError;

        return { success: true, message: 'User database successfully imported.' };

    } catch (error) {
        const message = getErrorMessage(error);
        console.error("Failed to import users:", message);
        return { success: false, message: `An error occurred during import: ${message}` };
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
 * Initializes/repairs the admin account.
 */
export const initializeAdminAccount = async () => {
    await (supabase.auth as any).signOut();
    console.log("Session cleared. Forcibly checking/repairing admin account...");

    const adminEmail = 'izzat.enquiry@gmail.com';
    const adminPassword = 'M!m@Sept2025';
    let adminUserId: string | undefined;

    const { data: signInData, error: signInError } = await (supabase.auth as any).signInWithPassword({
        email: adminEmail,
        password: adminPassword,
    });

    if (signInError && signInError.message.includes('Invalid login credentials')) {
        console.log("Admin login failed, attempting to create admin account in Auth service...");
        const { data: signUpData, error: signUpError } = await (supabase.auth as any).signUp({
            email: adminEmail,
            password: adminPassword,
        });

        if (signUpError) {
            if (signUpError.message.includes('User already registered')) {
                console.error('CRITICAL: Admin user exists in auth but could not log in. Manual intervention is required.');
            } else {
                console.error('Admin initialization failed during signup:', getErrorMessage(signUpError));
            }
            await (supabase.auth as any).signOut();
            return;
        }
        adminUserId = signUpData?.user?.id;
        console.log('Admin account created in Auth service.');

    } else if (signInError) {
        console.error('Admin initialization failed during sign-in:', getErrorMessage(signInError));
        await (supabase.auth as any).signOut();
        return;
    } else {
        adminUserId = signInData?.user?.id;
    }

    if (!adminUserId) {
        console.error('Could not determine admin user ID during initialization.');
        await (supabase.auth as any).signOut();
        return;
    }

    console.log(`Ensuring admin profile for user ID: ${adminUserId}.`);
    
    const { data: existingProfile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', adminUserId)
        .single();
    
    const typedExistingProfile = existingProfile as UserProfileData | null;
        
    if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching admin profile before upsert:', getErrorMessage(fetchError));
    }

    const profileData = {
        ...(typedExistingProfile || {}),
        id: adminUserId,
        full_name: typedExistingProfile?.full_name || 'Izzat Admin',
        email: adminEmail,
        phone: typedExistingProfile?.phone || '0000000000',
        role: 'admin' as const,
        status: 'admin' as const,
        subscription_expiry: null,
    };
    
    // FIX: The auto-inferred type for the upsert payload is 'never'. Casting to the correct Insert type from the Database interface to resolve this.
    const { error: upsertError } = await supabase.from('users').upsert(profileData as Database['public']['Tables']['users']['Insert'], { onConflict: 'id' });

    if (upsertError) {
        console.error('Failed to upsert admin profile:', getErrorMessage(upsertError));
    } else {
        console.log('Admin profile successfully configured in database.');
    }
    
    // FIX: The auto-inferred type for the update payload is 'never'. Casting to the correct Update type from the Database interface to resolve this.
    const { error: cleanupError } = await supabase
        .from('users')
        .update({ role: 'user', status: 'inactive' } as Database['public']['Tables']['users']['Update'])
        .eq('role', 'admin')
        .neq('id', adminUserId);
    
    if (cleanupError) {
         console.error('Failed to clean up orphaned admin profiles:', getErrorMessage(cleanupError));
    } else {
        console.log('Orphaned admin profile cleanup complete.');
    }

    await (supabase.auth as any).signOut();
    console.log("Admin check/repair complete. Session cleared for user login.");
};