/**
 * Handles API errors, re-throwing them with user-friendly messages for the UI to catch.
 * This function is centralized here to be reused across different AI service calls.
 * @param {unknown} error - The error caught from the API call.
 */
export const handleApiError = (error: unknown): void => {
    console.error("Original API Error:", error);
    let userFriendlyMessage = 'An unexpected error occurred. Please check the console for details and try again.';

    if (error instanceof Error) {
        const message = error.message.toLowerCase();

        // Network Errors
        if (message.includes('failed to fetch')) {
            userFriendlyMessage = 'Network error. Please check your internet connection and try again.';
        } 
        // Quota/Billing Errors
        else if (message.includes('429') || message.includes('resource_exhausted') || message.includes('quota')) {
            userFriendlyMessage = 'API quota exceeded. Please check your Google AI Studio billing and usage details, or try again later.';
        } 
        // API Key and Permission Errors
        else if (message.includes('api key not valid') || message.includes('api_key_invalid')) {
            userFriendlyMessage = 'Your API key is not valid. Please verify it in the Settings page and try again.';
        } else if (message.includes('permission_denied')) {
            userFriendlyMessage = 'Permission denied. Ensure your API key has the correct permissions and is not restricted (e.g., by IP address).';
        }
        // Input/Request Errors
        else if (message.includes('400 bad request') || message.includes('invalid argument')) {
            userFriendlyMessage = `Invalid request. The prompt or parameters might be malformed. Details: ${error.message}`;
        }
        // Safety Policy Errors
        else if (message.includes('safety policies') || message.includes('safety settings')) {
             // The safety message from Google is already user-friendly.
            userFriendlyMessage = error.message;
        }
        // Server-side errors
        else if (message.includes('503') || message.includes('unavailable')) {
            userFriendlyMessage = "The AI service is temporarily unavailable. This is usually a temporary issue. Please wait a moment and try again.";
        }
        else if (message.includes('500') || message.includes('internal')) {
            userFriendlyMessage = "An internal error occurred on the server. Please wait a few moments and try again.";
        }
        // Fallback to the original error message if it seems descriptive
        else {
             userFriendlyMessage = error.message;
        }
    }
    
    // Re-throw a new error with a message that's safe to display to the user.
    throw new Error(userFriendlyMessage);
};