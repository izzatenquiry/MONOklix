// supabase/functions/verify-and-save-key/index.ts

// FIX: Replaced invalid type reference URL with a valid one to provide correct Deno types for the TypeScript compiler.
/// <reference types="https://esm.sh/@supabase/functions-js@2.4.1/dist/edge-runtime.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Function to verify the API key against Google's endpoint
async function verifyGoogleApiKey(apiKey: string): Promise<boolean> {
  const model = 'gemini-2.5-flash'; // Use a lightweight model for verification
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "hi" }] }]
      })
    });
    // A 200 OK response means the key is valid. Any other status is a failure.
    return response.status === 200;
  } catch (error) {
    console.error("Google API Key verification fetch failed:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Set up CORS headers to allow requests from the app's origin
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Extract API key from the request body
    const { apiKey } = await req.json();
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length !== 39) {
      return new Response(JSON.stringify({ error: 'Invalid API key format. It must be 39 characters long.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create a Supabase client with the user's JWT to identify them
    // The Authorization header is passed automatically by the client library
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get the user from the JWT
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication failed. No user found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Verify the key with Google's API
    console.log(`Verifying API key for user: ${user.id}`);
    const isKeyValid = await verifyGoogleApiKey(apiKey);
    if (!isKeyValid) {
      console.log(`API key verification failed for user: ${user.id}`);
      return new Response(JSON.stringify({ error: 'API Key is not valid. Please check your key and try again.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    console.log(`API key is valid for user: ${user.id}`);
    
    // Key is valid, create an admin client to update the database
    // This uses the service_role key for elevated privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch user's current role to determine their new status
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
        throw new Error(`Could not fetch user profile: ${profileError.message}`);
    }

    // Admins keep their status, others are upgraded to 'lifetime'
    const newStatus = profileData.role === 'admin' ? 'admin' : 'lifetime';

    // Update the user's profile with the new key and status
    console.log(`Updating user ${user.id} status to '${newStatus}' and saving API key.`);
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        api_key: apiKey, 
        status: newStatus,
        subscription_expiry: null // Clear trial expiry when they get lifetime access
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to save key: ${updateError.message}`);
    }

    console.log(`Successfully updated profile for user: ${user.id}`);
    // Return the updated profile data on success
    return new Response(JSON.stringify(updatedProfile), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error('Edge Function Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});