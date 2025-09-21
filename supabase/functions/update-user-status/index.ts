// FIX: Replaced invalid type reference URL with a valid one to provide correct Deno types for the TypeScript compiler.
/// <reference types="https://esm.sh/@supabase/functions-js@2.4.1/deno/edge-runtime.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { v5 } from "https://deno.land/std@0.112.0/uuid/mod.ts";

// Interface for expected WooCommerce webhook data
interface WooWebhookPayload {
  billing: {
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
  };
}

// UUID Namespace for generating consistent user IDs from emails
const MONOKLIX_NAMESPACE = "1b671a64-40d5-491e-99b0-da01ff1f3341";

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const payload: WooWebhookPayload = await req.json();
    const billingInfo = payload.billing;

    if (!billingInfo?.email) {
      console.error('Webhook received without customer email.');
      return new Response('Customer email not found in payload', { status: 400 });
    }
    
    const email = billingInfo.email.trim().toLowerCase();
    const fullName = `${billingInfo.first_name || ''} ${billingInfo.last_name || ''}`.trim();
    const phone = billingInfo.phone || '0000000000'; // Use a placeholder if phone is missing

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Generate a deterministic UUID based on the user's email.
    // This allows us to link the public.users record to a Supabase auth.users record
    // if we decide to create one later via an admin process.
    const userId = await v5.generate(MONOKLIX_NAMESPACE, new TextEncoder().encode(email));

    const userProfile = {
      id: userId,
      email: email,
      full_name: fullName,
      phone: phone,
      status: 'lifetime' as const,
      role: 'user' as const,
    };
    
    console.log(`Upserting user profile for email: ${email}`);
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert(userProfile, { onConflict: 'email', ignoreDuplicates: false })
      .select()
      .single();

    if (error) {
      throw error;
    }
    
    console.log(`Successfully upserted profile for ${email}. User ID: ${data.id}`);

    return new Response(JSON.stringify({ success: true, message: `User ${data.email} created/updated.` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error('Error in Edge Function:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 500 });
  }
});