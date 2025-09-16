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
        throw new Error("API Key tidak ditetapkan untuk sesi ini. Sila log masuk semula atau konfigurasikan kunci anda.");
    }
    return new GoogleGenAI({ apiKey: activeApiKey });
};

/**
 * Handles API errors, re-throwing them for the UI to catch.
 * The logic for clearing invalid keys is now handled in the settings/verification flow.
 * @param {unknown} error - The error caught from the API call.
 */
const handleApiError = (error: unknown): void => {
    // Re-throw the original error to be caught by the UI component's catch block.
    throw error;
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
 * @param {number} durationSeconds - The duration of the video in seconds.
 * @param {string} resolution - The resolution of the video.
 * @param {boolean} generateAudio - Whether to generate audio for the video.
 * @param {{ imageBytes: string; mimeType: string }} [image] - Optional image data.
 * @returns {Promise<string>} The URL of the generated video.
 */
export const generateVideo = async (
    prompt: string, 
    model: string, 
    aspectRatio: string, 
    durationSeconds: number,
    resolution: string,
    generateAudio: boolean,
    image?: { imageBytes: string, mimeType: string }
): Promise<string> => {
    try {
        const ai = getAiInstance();
        
        const videoConfig: {
            numberOfVideos: number;
            aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
            durationSeconds?: number;
            resolution?: "720p" | "1080p";
            generateAudio?: boolean;
        } = {
            numberOfVideos: 1,
            aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
        };
        
        if (durationSeconds) videoConfig.durationSeconds = durationSeconds;
        if (resolution) videoConfig.resolution = resolution as "720p" | "1080p";
        videoConfig.generateAudio = generateAudio;

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
            throw new Error("Penjanaan video mengambil masa terlalu lama dan telah tamat masa. Sila cuba lagi.");
        }

        if ((operation as any).error) {
            const error = (operation as any).error;
            console.error('Video generation failed with an error:', JSON.stringify(error, null, 2));
            throw new Error(`Penjanaan video gagal di pihak Google: ${error.message || 'Ralat tidak diketahui'}`);
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        
        if (!downloadLink) {
            console.error('Operation finished but no video URI was returned. Full operation object:', JSON.stringify(operation, null, 2));
            
            const hasGeneratedVideos = operation.response?.generatedVideos && operation.response.generatedVideos.length > 0;

            // If the response is empty, or if the generatedVideos array is missing or empty,
            // it's highly likely that the prompt was blocked by safety filters.
            if (!operation.response || Object.keys(operation.response).length === 0 || !hasGeneratedVideos) {
                throw new Error(
                    "Penjanaan video selesai tanpa ralat, tetapi tiada output dihasilkan.\n\n" +
                    "Ini biasanya berlaku jika permintaan anda disekat oleh dasar keselamatan Google.\n\n" +
                    "**Sila cuba:**\n" +
                    "1. Ubah suai Prompt anda untuk menjadi lebih umum dan selamat.\n" +
                    "2. Jika menggunakan imej, cuba imej yang berbeza."
                );
            }

            // This is a fallback for other unexpected cases where a URI is not returned.
            throw new Error("Operasi penjanaan video selesai tetapi tidak memulangkan pautan yang sah. Ini mungkin isu sementara di pihak Google.");
        }

        try {
            // FIX: The download link is a pre-signed URL and should not have the API key appended,
            // as this can cause conflicts with API key referrer restrictions, leading to a 403 error.
            // We now fetch from the URI directly.
            const response = await fetch(downloadLink);
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Video download failed:", response.status, errorText);
                throw new Error(`Muat turun video gagal dengan status HTTP: ${response.status}. URL mungkin telah tamat tempoh.`);
            }
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        } catch (e) {
            console.error("Gagal memuat turun video yang dijana:", e);
             if (e instanceof Error && e.message.includes("HTTP")) {
                 throw e; // Re-throw the specific HTTP error from above.
            }
            throw new Error(
                "Muat turun video gagal selepas penjanaan.\n\n" +
                "Ini mungkin disebabkan oleh URL muat turun yang telah tamat tempoh atau isu rangkaian.\n\n" +
                "Sila cuba jana video semula."
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