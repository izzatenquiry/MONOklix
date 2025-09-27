import { GoogleGenAI, Chat, GenerateContentResponse, Modality, PersonGeneration } from "@google/genai";
import { addLogEntry } from './aiLogService';
import { triggerUserWebhook } from './webhookService';
import { MODELS } from './aiConfig';
import { handleApiError } from "./errorHandler";

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
    model: MODELS.text,
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
            model: `${MODELS.text} (stream)`,
            prompt,
            output: 'Streaming response started...',
            tokenCount: 0, // Token count is not available until the end of the stream
            status: 'Success'
        });
        return stream;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addLogEntry({
            model: `${MODELS.text} (stream)`,
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
 * @param {boolean} [highDynamicRange] - Whether to generate in HDR.
 * @returns {Promise<string[]>} An array of base64 encoded image strings.
 */
export const generateImages = async (
    prompt: string, 
    aspectRatio: string, 
    numberOfImages: number,
    negativePrompt?: string,
    highDynamicRange?: boolean
): Promise<string[]> => {
    const model = MODELS.imageGeneration;
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
            ...(highDynamicRange !== undefined && { highDynamicRange }),
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
 * @param {string} resolution - The desired resolution for the video.
 * @param {string} negativePrompt - A prompt of what not to include.
 * @param {{ imageBytes: string; mimeType: string }} [image] - Optional image data.
 * @returns {Promise<Blob>} The blob of the generated video.
 */
export const generateVideo = async (
    prompt: string,
    model: string,
    aspectRatio: string,
    resolution: string,
    negativePrompt: string,
    image?: { imageBytes: string, mimeType: string }
): Promise<Blob> => {
    try {
        const ai = getAiInstance();
        
        const videoConfig: {
            numberOfVideos: number;
            aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
            negativePrompt?: string;
            resolution?: "720p" | "1080p";
        } = {
            numberOfVideos: 1,
            aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
            ...(negativePrompt && { negativePrompt }),
        };

        if (model.includes('veo-3.0')) {
            videoConfig.resolution = resolution as '720p' | '1080p';
        }

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
            const response = await fetch(`${downloadLink}&key=${activeApiKey}`);
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
    const model = MODELS.text;
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
    const model = MODELS.imageEdit;
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
    const model = MODELS.text;
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
    const model = MODELS.text;
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

const base64ToBlob = (base64: string, contentType: string = 'audio/mpeg'): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
};

/**
 * Generates a voice-over from a text script using Google Cloud's Text-to-Speech API.
 * @param {string} script - The text to convert to speech.
 * @param {string} actorId - The ID of the voice actor (e.g., 'en-US-Standard-A').
 * @param {number} speed - The speaking speed (0.25 to 4.0).
 * @param {number} pitch - The speaking pitch (-20.0 to 20.0).
 * @param {number} volume - The output volume in dB (-96.0 to 16.0).
 * @returns {Promise<Blob>} A blob containing the generated audio file.
 */
export const generateVoiceOver = async (
    script: string,
    actorId: string,
    speed: number,
    pitch: number,
    volume: number
): Promise<Blob> => {
    const model = 'Google Cloud TTS';
    const webhookPrompt = `Voice: ${actorId}, Script: ${script.substring(0, 100)}...`;
    
    if (!activeApiKey) {
        throw new Error("API Key is not set for this session. Please configure your key in Settings.");
    }

    try {
        const languageCode = actorId.split('-').slice(0, 2).join('-');

        const requestBody = {
            input: { text: script },
            voice: { languageCode: languageCode, name: actorId },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: speed,
                pitch: pitch,
                volumeGainDb: volume,
            },
        };

        const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${activeApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData.error?.message || `HTTP error! status: ${response.status}`;
            // Add a user-friendly hint about enabling the API
            const helpfulMessage = `${errorMessage}. Please ensure the "Cloud Text-to-Speech API" is enabled for your API key in your Google Cloud project.`;
            throw new Error(helpfulMessage);
        }

        const data = await response.json();

        if (!data.audioContent) {
            throw new Error("API response did not contain audio content.");
        }

        const audioBlob = base64ToBlob(data.audioContent, 'audio/mpeg');
        
        addLogEntry({
            model,
            prompt: webhookPrompt,
            output: '1 audio file generated.',
            tokenCount: 0, // Not applicable
            status: 'Success',
            mediaOutput: audioBlob
        });
        
        triggerUserWebhook({ type: 'audio', prompt: webhookPrompt, result: audioBlob });
        return audioBlob;

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