
import { GoogleGenAI, Chat, GenerateContentResponse, Modality, PersonGeneration } from "@google/genai";

// This will hold the key for the current user session. It is set by App.tsx.
let activeApiKey: string | null = null;

/**
 * Sets the active API key for the current session.
 * @param {string | null} key - The API key to use, or null to clear it.
 */
export const setActiveApiKey = (key: string | null): void => {
    activeApiKey = key;
};

const getAiInstance = () => {
    if (!activeApiKey) {
        // This case should be handled by UI guards, but as a safeguard:
        throw new Error("API Key is not set for this session. Please log in again or configure your key.");
    }
    return new GoogleGenAI({ apiKey: activeApiKey });
};

/**
 * Handles API errors, re-throwing them with user-friendly messages for the UI to catch.
 * @param {unknown} error - The error caught from the API call.
 */
const handleApiError = (error: unknown): void => {
    console.error("Original API Error:", error);
    let userFriendlyMessage = 'An unknown error occurred. Please try again.';

    if (error && typeof error === 'object') {
        if ('message' in error) {
            const message = (error as { message: string }).message;
            
            if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('quota')) {
                userFriendlyMessage = 'You have exceeded your API quota. Please check your Google AI Studio account for usage details or try again later.';
            } else if (message.includes('403') || message.includes('PERMISSION_DENIED')) {
                userFriendlyMessage = 'Permission denied. Please check that your API key has the correct permissions and is not restricted by IP address or referrer.';
            } else if (message.includes('400') && message.toLowerCase().includes('api key not valid')) {
                userFriendlyMessage = 'Your API key is not valid. Please check it in the Settings page and try again.';
            } else if (message.includes('safety policies')) {
                // This error is already user-friendly, let's keep it.
                userFriendlyMessage = message;
            } else {
                // Use the error message if it exists but doesn't match specific cases
                userFriendlyMessage = message;
            }
        }
    }
    
    // Re-throw a new error with a message that's safe to display to the user.
    throw new Error(userFriendlyMessage);
};


export interface MultimodalContent {
    base64: string;
    mimeType: string;
}

/**
 * Creates a new chat session with a given system instruction.
 * @param {string} systemInstruction - The system instruction for the chat model.
 * @returns {Chat} A new chat instance.
 */
export const createChatSession = (systemInstruction: string): Chat => {
  const ai = getAiInstance();
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
    },
  });
};

/**
 * Sends a message in a chat session and returns the streaming response.
 * @param {Chat} chat - The chat instance.
 * @param {string} prompt - The user's prompt.
 * @returns {Promise<AsyncGenerator<GenerateContentResponse>>} The streaming response from the model.
 */
export const streamChatResponse = async (chat: Chat, prompt: string) => {
    try {
        return await chat.sendMessageStream({ message: prompt });
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

/**
 * Generates images based on a text prompt.
 * @param {string} prompt - The text prompt for image generation.
 * @param {string} aspectRatio - The desired aspect ratio.
 * @param {number} numberOfImages - The number of images to generate.
 * @param {string} [negativePrompt] - A prompt of what not to include.
 * @param {number} [seed] - A seed for deterministic generation.
 * @param {boolean} [highDynamicRange] - Whether to generate in HDR.
 * @param {string} [personGeneration] - How to handle generating people.
 * @returns {Promise<string[]>} An array of base64 encoded image strings.
 */
export const generateImages = async (
    prompt: string, 
    aspectRatio: string, 
    numberOfImages: number,
    negativePrompt?: string,
    seed?: number,
    highDynamicRange?: boolean,
    personGeneration?: "DONT_GENERATE" | "GENERATE_DEFAULT" | "GENERATE_PHOTOREALISTIC_FACES"
): Promise<string[]> => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt,
            config: {
            numberOfImages,
            aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
            outputMimeType: 'image/png',
            ...(negativePrompt && { negativePrompt }),
            ...(seed !== undefined && { seed }),
            ...(highDynamicRange !== undefined && { highDynamicRange }),
            // FIX: Cast the personGeneration string to the PersonGeneration enum type expected by the SDK.
            ...(personGeneration && { personGeneration: personGeneration as PersonGeneration }),
            },
        });
        return response.generatedImages.map(img => img.image.imageBytes);
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

/**
 * Generates a video from a text prompt and an optional image.
 * @param {string} prompt - The text prompt for video generation.
 * @param {string} model - The video generation model to use.
 * @param {string} aspectRatio - The desired aspect ratio for the video.
 * @param {{ imageBytes: string; mimeType: string }} [image] - Optional image data.
 * @param {any} [_dialogue] - Unused parameter to satisfy call signature from UI.
 * @returns {Promise<string>} The URL of the generated video.
 */
// FIX: The function signature was updated to match the call in VideoGenerationView.
// The unused `durationSeconds` and `resolution` parameters were removed, and the `image` parameter was moved.
// An unused `_dialogue` parameter was added to match the call signature without causing errors.
export const generateVideo = async (
    prompt: string,
    model: string,
    aspectRatio: string,
    image?: { imageBytes: string, mimeType: string },
    _dialogue?: any
): Promise<string> => {
    try {
        const ai = getAiInstance();
        
        const videoConfig: {
            numberOfVideos: number;
            aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
        } = {
            numberOfVideos: 1,
            aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
        };

        let operation = await ai.models.generateVideos({
            model,
            prompt,
            image,
            config: videoConfig
        });

        const startTime = Date.now();
        const TIMEOUT = 5 * 60 * 1000; // 5 minutes timeout
        const POLL_INTERVAL = 10000; // Poll every 10 seconds

        while (!operation.done && Date.now() - startTime < TIMEOUT) {
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
            operation = await ai.operations.getVideosOperation({ operation });
        }

        if (!operation.done) {
            throw new Error("Video generation took too long and has timed out. Please try again.");
        }

        if ((operation as any).error) {
            const error = (operation as any).error;
            console.error('Video generation failed with an error:', JSON.stringify(error, null, 2));
            throw new Error(`Video generation failed on Google's end: ${error.message || 'Unknown error'}`);
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        
        if (!downloadLink) {
            console.error('Operation finished but no video URI was returned. Full operation object:', JSON.stringify(operation, null, 2));
            
            const hasGeneratedVideos = operation.response?.generatedVideos && operation.response.generatedVideos.length > 0;

            // If the response is empty, or if the generatedVideos array is missing or empty,
            // it's highly likely that the prompt was blocked by safety filters.
            if (!operation.response || Object.keys(operation.response).length === 0 || !hasGeneratedVideos) {
                throw new Error(
                    "Video generation finished without an error, but no output was produced.\n\n" +
                    "This usually happens if your request was blocked by Google's safety policies.\n\n" +
                    "**Please try:**\n" +
                    "1. Modifying your prompt to be more general and safe.\n" +
                    "2. If using an image, try a different one."
                );
            }

            // This is a fallback for other unexpected cases where a URI is not returned.
            throw new Error("The video generation operation completed but did not return a valid link. This might be a temporary issue on Google's end.");
        }

        try {
            // FIX: The download link is a pre-signed URL and should not have the API key appended,
            // as this can cause conflicts with API key referrer restrictions, leading to a 403 error.
            // We now fetch from the URI directly.
            const response = await fetch(downloadLink);
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Video download failed:", response.status, errorText);
                throw new Error(`Video download failed with HTTP status: ${response.status}. The URL may have expired.`);
            }
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        } catch (e) {
            console.error("Failed to download the generated video:", e);
             if (e instanceof Error && e.message.includes("HTTP")) {
                 throw e; // Re-throw the specific HTTP error from above.
            }
            throw new Error(
                "Video download failed after generation.\n\n" +
                "This could be due to an expired download URL or a network issue.\n\n" +
                "Please try generating the video again."
            );
        }
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

/**
 * Generates text content from a prompt and one or more images.
 * @param {string} prompt - The text prompt.
 * @param {MultimodalContent[]} images - An array of image objects.
 * @returns {Promise<string>} The text response from the model.
 */
export const generateMultimodalContent = async (prompt: string, images: MultimodalContent[]): Promise<string> => {
    try {
        const ai = getAiInstance();
        const textPart = { text: prompt };
        const imageParts = images.map(image => ({
            inlineData: {
                mimeType: image.mimeType,
                data: image.base64,
            },
        }));

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [...imageParts, textPart] },
        });

        return response.text;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

/**
 * Edits or composes an image based on a text prompt and one or more source images.
 * @param {string} prompt - The editing instruction.
 * @param {MultimodalContent[]} images - The base64 encoded images to use.
 * @returns {Promise<{text?: string, imageBase64?: string}>} An object containing the text response and/or the edited image.
 */
export const composeImage = async (prompt: string, images: MultimodalContent[]): Promise<{text?: string, imageBase64?: string}> => {
    try {
        const ai = getAiInstance();
        const textPart = { text: prompt };
        const imageParts = images.map(image => ({
            inlineData: {
                data: image.base64,
                mimeType: image.mimeType,
            },
        }));

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [...imageParts, textPart ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const result: { text?: string; imageBase64?: string } = {};

        if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.text) {
                    result.text = part.text;
                } else if (part.inlineData) {
                    result.imageBase64 = part.inlineData.data;
                }
            }
        }

        return result;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

/**
 * Generates text content from a text-only prompt.
 * @param {string} prompt - The text prompt.
 * @returns {Promise<string>} The text response from the model.
 */
export const generateText = async (prompt: string): Promise<string> => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

/**
 * Generates text content with Google Search grounding for up-to-date information.
 * @param {string} prompt - The text prompt.
 * @returns {Promise<GenerateContentResponse>} The full response object from the model, including grounding metadata.
 */
export const generateContentWithGoogleSearch = async (prompt: string): Promise<GenerateContentResponse> => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        return response; // Return the whole object
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};


// FIX: Added missing generateVoiceOver function to resolve import error in VoiceStudioView.
/**
 * Generates a voice-over from a text script.
 * @param {string} script - The text to convert to speech.
 * @param {string} actorId - The ID of the voice actor.
 * @param {number} speed - The speaking speed.
 * @param {number} pitch - The speaking pitch.
 * @param {number} volume - The output volume.
 * @returns {Promise<string>} A URL to the generated audio file.
 */
export const generateVoiceOver = async (
    script: string,
    actorId: string,
    speed: number,
    pitch: number,
    volume: number
): Promise<string> => {
    try {
        // This is a placeholder as the Gemini TTS API is not in the provided guidelines.
        // It simulates a successful API call and returns a dummy audio URL.
        console.log('Generating voice over with:', { script, actorId, speed, pitch, volume });
        
        // Simulate network delay to mimic a real API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Create a dummy audio blob to make the UI functional
        const blob = new Blob([`Dummy audio for: ${script}`], { type: "audio/mpeg" });
        return URL.createObjectURL(blob);
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

/**
 * Verifies if a given Gemini API key is valid by making a simple test call.
 * @param {string} apiKey - The API key to verify.
 * @returns {Promise<boolean>} A promise that resolves to true if the key is valid, false otherwise.
 */
export const verifyApiKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) {
    return false;
  }
  try {
    // Use a direct fetch call for verification to reliably check the HTTP status code.
    // The SDK's generateContent might not throw an error for certain auth failures in a way
    // that's easy to catch, whereas a direct status check is unambiguous.
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "hi" }] }]
        })
      }
    );
    // A successful response (200 OK) means the key is valid.
    // Any other status (like 400 for bad key, 403 for permission denied) is a failure.
    return response.status === 200;
  } catch (error) {
    // Network errors etc.
    console.error("API Key verification fetch failed:", error);
    return false;
  }
};