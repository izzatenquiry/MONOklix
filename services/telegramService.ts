import { loadData } from './indexedDBService';

const TOKEN_KEY = '1za7-ai-telegram-token';
const CHAT_ID_KEY = '1za7-ai-telegram-chat-id';

// Helper function to convert base64 to Blob
const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};

/**
 * Sends a message or file to a configured Telegram bot.
 * Fails silently if credentials are not configured.
 * @param output The content to send (text, base64 for images, or blob URL for video/audio).
 * @param type The type of content to send.
 * @param caption An optional caption for files.
 * @returns {Promise<{success: boolean, message?: string}>} An object indicating the result of the operation.
 */
export const sendToTelegram = async (
    output: string,
    type: 'text' | 'image' | 'video' | 'audio',
    caption: string = ''
): Promise<{ success: boolean; message?: string }> => {
    try {
        const token = await loadData<string>(TOKEN_KEY);
        const chatId = await loadData<string>(CHAT_ID_KEY);

        if (!token || !chatId) {
            // No credentials, this is not an error, just skipping.
            return { success: true, message: "Telegram not configured." };
        }

        const baseUrl = `https://api.telegram.org/bot${token}`;
        let response: Response;

        if (type === 'text') {
            response = await fetch(`${baseUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: output,
                    parse_mode: 'Markdown'
                }),
            });
        } else {
            let blob: Blob;
            let endpoint: string;
            let fieldName: string;
            let fileName: string;

            switch (type) {
                case 'image':
                    blob = base64ToBlob(output, 'image/png');
                    endpoint = 'sendPhoto';
                    fieldName = 'photo';
                    fileName = 'image.png';
                    break;
                case 'video':
                    const videoResponse = await fetch(output);
                    blob = await videoResponse.blob();
                    endpoint = 'sendVideo';
                    fieldName = 'video';
                    fileName = 'video.mp4';
                    break;
                case 'audio':
                    const audioResponse = await fetch(output);
                    blob = await audioResponse.blob();
                    endpoint = 'sendAudio';
                    fieldName = 'audio';
                    fileName = 'audio.mp3';
                    break;
            }

            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append(fieldName, blob, fileName);
            if (caption) {
                formData.append('caption', caption);
            }

            response = await fetch(`${baseUrl}/${endpoint}`, {
                method: 'POST',
                body: formData,
            });
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Telegram API Error:", JSON.stringify(errorData, null, 2));
            return { success: false, message: errorData.description || 'An unknown Telegram API error occurred.' };
        }
        
        return { success: true };

    } catch (error) {
        console.error("Failed to send to Telegram:", error);
        const errorMessage = error instanceof Error ? error.message : 'A network error occurred.';
        return { success: false, message: errorMessage };
    }
};