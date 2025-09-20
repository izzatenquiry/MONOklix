import { GoogleGenAI, Chat, GenerateContentResponse, Modality, PersonGeneration } from "@google/genai";
import { addLogEntry } from './aiLogService';
import { triggerUserWebhook } from './webhookService';

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
      thinkingConfig: { thinkingBudget: 0 },
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
        const stream = await chat.sendMessageStream({ message: prompt });
        // Note: Logging for streaming is complex. We'll log the initial prompt.
        // A more advanced implementation could aggregate chunks, but for now this is sufficient.
        addLogEntry({
            model: 'gemini-2.5-flash (stream)',
            prompt,
            output: 'Streaming response started...',
            tokenCount: 0, // Token count is not available until the end of the stream
            status: 'Success'
        });
        return stream;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addLogEntry({
            model: 'gemini-2.5-flash (stream)',
            prompt,
            output: `Error: ${errorMessage}`,
            tokenCount: 0,
            status: 'Error',
            error: errorMessage
        });
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
    const model = 'imagen-4.0-generate-001';
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateImages({
            model,
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
        addLogEntry({
            model,
            prompt,
            output: `${response.generatedImages.length} image(s) generated.`,
            tokenCount: 0, // Not provided by this API endpoint
            status: 'Success',
            mediaOutput: response.generatedImages.length > 0 ? response.generatedImages[0].image.imageBytes : undefined
        });

        const images = response.generatedImages.map(img => img.image.imageBytes);
        images.forEach(imgBase64 => {
            triggerUserWebhook({ type: 'image', prompt, result: imgBase64, mimeType: 'image/png' });
        });
        return images;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addLogEntry({ model, prompt, output: `Error: ${errorMessage}`, tokenCount: 0, status: 'Error', error: errorMessage });
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
 * @returns {Promise<Blob>} The blob of the generated video.
 */
export const generateVideo = async (
    prompt: string,
    model: string,
    aspectRatio: string,
    image?: { imageBytes: string, mimeType: string },
    _dialogue?: any
): Promise<Blob> => {
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
            
            const errorMessage = error.message || 'Unknown error';

            // Check for the specific face generation safety error
            if (typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('person/face generation')) {
                throw new Error(
                    "Video Generation Blocked by Safety Policy\n\n" +
                    "The provided image was blocked because it contains a person's face. Google's video model has strict safety settings to prevent the generation of videos with specific people.\n\n" +
                    "**Please try one of the following:**\n" +
                    "1. **Use an image without a clear face.** A photo showing a person from behind or from a distance might work.\n" +
                    "2. **Use a product-only image.** The model is excellent at animating objects.\n" +
                    "3. **Generate a video from text only,** without providing a reference image."
                );
            }

            throw new Error(`Video generation failed on Google's end: ${errorMessage}`);
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        
        if (!downloadLink) {
            console.error('Operation finished but no video URI was returned. Full operation object:', JSON.stringify(operation, null, 2));
            
            const hasGeneratedVideos = operation.response?.generatedVideos && operation.response.generatedVideos.length > 0;

            if (!operation.response || Object.keys(operation.response).length === 0 || !hasGeneratedVideos) {
                throw new Error(
                    "Video generation finished without an error, but no output was produced.\n\n" +
                    "This usually happens if your request was blocked by Google's safety policies.\n\n" +
                    "**Please try:**\n" +
                    "1. Modifying your prompt to be more general and safe.\n" +
                    "2. If using an image, try a different one."
                );
            }

            throw new Error("The video generation operation completed but did not return a valid link. This might be a temporary issue on Google's end.");
        }

        try {
            const response = await fetch(downloadLink);
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Video download failed:", response.status, errorText);
                throw new Error(`Video download failed with HTTP status: ${response.status}. The URL may have expired.`);
            }
            const blob = await response.blob();
            addLogEntry({
                model,
                prompt,
                output: '1 video generated successfully.',
                tokenCount: 0, // Not provided
                status: 'Success',
                mediaOutput: blob
            });
            triggerUserWebhook({ type: 'video', prompt, result: blob });
            return blob;
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        addLogEntry({ model, prompt, output: `Error: ${errorMessage}`, tokenCount: 0, status: 'Error', error: errorMessage });
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
    const model = 'gemini-2.5-flash';
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
            model,
            contents: { parts: [...imageParts, textPart] },
            config: {
                thinkingConfig: { thinkingBudget: 0 },
            }
        });

        addLogEntry({
            model,
            prompt: `${prompt} [${images.length} image(s)]`,
            output: response.text,
            tokenCount: response.usageMetadata?.totalTokenCount ?? 0,
            status: 'Success'
        });
        triggerUserWebhook({ type: 'text', prompt, result: response.text });
        return response.text;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addLogEntry({ model, prompt: `${prompt} [${images.length} image(s)]`, output: `Error: ${errorMessage}`, tokenCount: 0, status: 'Error', error: errorMessage });
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
    const model = 'gemini-2.5-flash-image-preview';
    const webhookPrompt = `${prompt} [${images.length} image(s)]`;
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
            model,
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
        
        addLogEntry({
            model,
            prompt: webhookPrompt,
            output: result.imageBase64 ? '1 image generated.' : (result.text || 'No output.'),
            tokenCount: response.usageMetadata?.totalTokenCount ?? 0,
            status: 'Success',
            mediaOutput: result.imageBase64
        });

        if (result.imageBase64) {
            triggerUserWebhook({ type: 'image', prompt: webhookPrompt, result: result.imageBase64, mimeType: 'image/png' });
        }
        if (result.text) {
             triggerUserWebhook({ type: 'text', prompt: webhookPrompt, result: result.text });
        }
        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addLogEntry({ model, prompt: webhookPrompt, output: `Error: ${errorMessage}`, tokenCount: 0, status: 'Error', error: errorMessage });
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
    const model = 'gemini-2.5-flash';
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }] },
            config: {
                thinkingConfig: { thinkingBudget: 0 },
            }
        });
        addLogEntry({
            model,
            prompt,
            output: response.text,
            tokenCount: response.usageMetadata?.totalTokenCount ?? 0,
            status: 'Success'
        });
        triggerUserWebhook({ type: 'text', prompt, result: response.text });
        return response.text;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addLogEntry({ model, prompt, output: `Error: ${errorMessage}`, tokenCount: 0, status: 'Error', error: errorMessage });
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
    const model = 'gemini-2.5-flash';
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }] },
            config: {
                tools: [{ googleSearch: {} }],
                thinkingConfig: { thinkingBudget: 0 },
            },
        });
        addLogEntry({
            model,
            prompt,
            output: response.text,
            tokenCount: response.usageMetadata?.totalTokenCount ?? 0,
            status: 'Success'
        });
        triggerUserWebhook({ type: 'text', prompt, result: response.text });
        return response; // Return the whole object
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addLogEntry({ model, prompt, output: `Error: ${errorMessage}`, tokenCount: 0, status: 'Error', error: errorMessage });
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
 * @returns {Promise<Blob>} A blob containing the generated audio file.
 */
export const generateVoiceOver = async (
    script: string,
    actorId: string,
    speed: number,
    pitch: number,
    volume: number
): Promise<Blob> => {
    const model = 'TTS (simulated)';
    const webhookPrompt = `Voice: ${actorId}, Script: ${script.substring(0, 100)}...`;
    try {
        // This is a placeholder as the Gemini TTS API is not in the provided guidelines.
        // It simulates a successful API call and returns a dummy audio URL.
        console.log('Generating voice over with:', { script, actorId, speed, pitch, volume });
        
        // Simulate network delay to mimic a real API call
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const dummyBlob = new Blob([`Dummy audio for: ${script}`], { type: "audio/mpeg" });
        
        addLogEntry({
            model,
            prompt: webhookPrompt,
            output: '1 audio file generated.',
            tokenCount: 0, // Not applicable
            status: 'Success',
            mediaOutput: dummyBlob
        });
        
        triggerUserWebhook({ type: 'audio', prompt: webhookPrompt, result: dummyBlob });
        return dummyBlob;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addLogEntry({
            model,
            prompt: webhookPrompt,
            output: `Error: ${errorMessage}`,
            tokenCount: 0,
            status: 'Error',
            error: errorMessage
        });
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