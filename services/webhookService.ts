import { supabase } from './supabaseClient';

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            // result is "data:mime/type;base64,the_base_64_string"
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export type WebhookPayload = {
    type: 'text' | 'image' | 'video' | 'audio';
    prompt: string;
    result: string; // Base64 for media, text for text
    mimeType?: string;
    timestamp: number;
    userId: string;
};

const getCurrentUserFromSession = (): { id: string } | null => {
    try {
        const savedUserJson = localStorage.getItem('currentUser');
        if (savedUserJson) {
            const user = JSON.parse(savedUserJson);
            if (user && user.id) {
                return user;
            }
        }
    } catch (error) {
        console.error("Failed to parse user from localStorage for webhook.", error);
    }
    return null;
}

export const triggerUserWebhook = async (
    data: Omit<WebhookPayload, 'timestamp' | 'userId' | 'result' | 'mimeType'> & { result: string | Blob, mimeType?: string }
) => {
    const user = getCurrentUserFromSession();
    if (!user?.id) {
        console.error("User not authenticated, cannot trigger webhook.");
        return;
    }
    
    const { data: profile, error } = await supabase
        .from('users')
        .select('webhook_url')
        .eq('id', user.id)
        .single();
    
    // FIX: `profile` is now correctly typed, so `profile.webhook_url` is accessible.
    if (error || !profile || !profile.webhook_url) {
        // No webhook configured, fail silently
        return;
    }

    // FIX: `profile.webhook_url` is accessible due to correct typing.
    const webhookUrl = profile.webhook_url;
    let resultData: string;
    let finalMimeType: string | undefined = data.mimeType;

    if (data.result instanceof Blob) {
        resultData = await blobToBase64(data.result);
        finalMimeType = data.result.type;
    } else {
        resultData = data.result;
        if (data.type === 'text' && !finalMimeType) finalMimeType = 'text/plain';
    }

    const payload: WebhookPayload = {
        type: data.type,
        prompt: data.prompt,
        result: resultData,
        mimeType: finalMimeType,
        timestamp: Date.now(),
        userId: user.id,
    };

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    } catch (e) {
        console.error('Failed to trigger user webhook:', e);
    }
};

export const sendTestUserWebhook = async (): Promise<{ success: boolean; message: string }> => {
    const user = getCurrentUserFromSession();
    if (!user?.id) {
        return { success: false, message: "You are not logged in." };
    }

    const { data: profile, error } = await supabase
        .from('users')
        .select('webhook_url')
        .eq('id', user.id)
        .single();
    
    // FIX: `profile` is now correctly typed, so `profile.webhook_url` is accessible.
    if (error || !profile || !profile.webhook_url) {
        return { success: false, message: "No webhook URL is saved for your account." };
    }

    // FIX: `profile.webhook_url` is accessible due to correct typing.
    const webhookUrl = profile.webhook_url;
    const testPayload = {
        type: 'test',
        message: 'This is a test message from MONOKlix.com',
        timestamp: Date.now(),
        userId: user.id,
    };

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPayload),
        });

        if (response.ok) {
            return { success: true, message: `Test successful! Your webhook server responded with status: ${response.status}.` };
        } else {
            return { success: false, message: `Test failed. Your webhook server responded with status: ${response.status}.` };
        }
    } catch (e) {
        console.error("Webhook test failed:", e);
        return { success: false, message: 'Test failed. Could not send request. Check console for details.' };
    }
};