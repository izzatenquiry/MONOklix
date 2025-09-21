import React, { useState, useEffect, useRef } from 'react';
import { type User } from '../../types';
// FIX: Added verifyAndSaveUserApiKey to the import to resolve the module export error.
import { verifyAndSaveUserApiKey } from '../../services/userService';
import { GoogleDriveIcon, WebhookIcon, TelegramIcon, CheckCircleIcon, XIcon } from '../Icons';
import Spinner from '../common/Spinner';
import { saveData, loadData, removeData } from '../../services/indexedDBService';
import { sendToTelegram } from '../../services/telegramService';

interface IntegrationsViewProps {
  currentUser: User;
  onUserUpdate: (user: User) => void;
}

const ApiKeyPanel: React.FC<{ currentUser: User, onUserUpdate: (user: User) => void }> = ({ currentUser, onUserUpdate }) => {
    const [apiKey, setApiKey] = useState('');
    const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error' | 'loading'; message: string }>({ type: 'idle', message: '' });
    const statusTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (statusTimeoutRef.current) {
                clearTimeout(statusTimeoutRef.current);
            }
        };
    }, []);


    const handleSave = async () => {
        if (statusTimeoutRef.current) {
            clearTimeout(statusTimeoutRef.current);
        }
        setStatus({ type: 'loading', message: 'Verifying API Key...' });
        const result = await verifyAndSaveUserApiKey(currentUser.id, apiKey);

        if (result.success === false) {
            setStatus({ type: 'error', message: result.message });
            statusTimeoutRef.current = window.setTimeout(() => {
                setStatus({ type: 'idle', message: '' });
            }, 5000);
        } else {
            setStatus({ type: 'success', message: `API Key successfully verified and saved.` });
            onUserUpdate(result.user);
            setApiKey('');
            statusTimeoutRef.current = window.setTimeout(() => {
                setStatus({ type: 'idle', message: '' });
            }, 3000);
        }
    };
    
    return (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg mt-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-2">Google Gemini API Key</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                {currentUser.role === 'admin'
                    ? "As an admin, your API Key is required for all AI features and will also be used for users on a trial period."
                    : "Enter your personal API Key for lifetime access to all features."
                }
                You can get your key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline">Google AI Studio</a>.
            </p>
             {currentUser.apiKey && (
                <p className="text-sm text-green-600 dark:text-green-400 mb-4 p-2 bg-green-500/10 rounded-md">
                    Your API Key is active: ...{currentUser.apiKey.slice(-4)}
                </p>
            )}
            <div className="flex items-center gap-2">
                 <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter a new API Key here to update"
                    className="flex-grow bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none transition disabled:opacity-50"
                    disabled={status.type === 'loading'}
                />
                 <button 
                    onClick={handleSave} 
                    disabled={status.type === 'loading' || !apiKey.trim()} 
                    className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center w-24 disabled:opacity-50"
                >
                    {status.type === 'loading' ? <Spinner /> : 'Save'}
                </button>
            </div>
             {status.type !== 'idle' && (
                <div className={`flex items-center gap-3 p-3 mt-4 rounded-md text-sm ${
                    status.type === 'success' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200' :
                    status.type === 'error' ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200' :
                    'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
                }`}>
                    {status.type === 'loading' && <Spinner />}
                    {status.type === 'success' && <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />}
                    {status.type === 'error' && <XIcon className="w-5 h-5 flex-shrink-0" />}
                    <span>{status.message}</span>
                </div>
            )}
        </div>
    );
};

const TelegramSettings: React.FC = () => {
    const TOKEN_KEY = '1za7-ai-telegram-token';
    const CHAT_ID_KEY = '1za7-ai-telegram-chat-id';
    const [token, setToken] = useState('');
    const [chatId, setChatId] = useState('');
    const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

    useEffect(() => {
        const loadCredentials = async () => {
            const savedToken = await loadData<string>(TOKEN_KEY);
            const savedChatId = await loadData<string>(CHAT_ID_KEY);
            if (savedToken) setToken(savedToken);
            if (savedChatId) setChatId(savedChatId);
        };
        loadCredentials();
    }, []);

    const handleSave = async () => {
        try {
            await saveData(TOKEN_KEY, token);
            await saveData(CHAT_ID_KEY, chatId);
            setStatus({ type: 'success', message: 'Telegram settings saved!' });
        } catch (e) {
            setStatus({ type: 'error', message: 'Failed to save settings.' });
        }
        setTimeout(() => setStatus({ type: 'idle', message: '' }), 3000);
    };

    const handleTest = async () => {
        setStatus({ type: 'loading', message: 'Sending test message...' });
        const result = await sendToTelegram('Hello from MONOklix.com! Your Telegram integration is working.', 'text');

        if (result.success) {
            setStatus({ type: 'success', message: 'Test message sent! Check your Telegram.' });
            setTimeout(() => setStatus({ type: 'idle', message: '' }), 4000);
        } else {
            let userFriendlyMessage = result.message || "An unknown error occurred.";
            const lowerCaseMessage = userFriendlyMessage.toLowerCase();

            if (lowerCaseMessage.includes("chat not found")) {
                userFriendlyMessage = "Chat not found. Please verify your Chat ID and ensure you have started a conversation with your bot.";
            } else if (lowerCaseMessage.includes("unauthorized") || lowerCaseMessage.includes("bot token")) {
                userFriendlyMessage = "Authorization failed. Please double-check your Bot Token.";
            }
            setStatus({ type: 'error', message: userFriendlyMessage });
        }
    };

    return (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg space-y-4 shadow-sm">
            <h2 className="text-xl font-semibold flex items-center gap-2"><TelegramIcon className="w-6 h-6 text-sky-500"/>Telegram Integration</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Automatically receive your generated content in a Telegram chat. You will need to create a bot and get your Chat ID.
            </p>
            <div>
                <label htmlFor="telegram-token" className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                    Telegram Bot Token
                </label>
                <input
                    id="telegram-token"
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Your bot token from @BotFather"
                    className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                />
            </div>
             <div>
                <label htmlFor="telegram-chat-id" className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                    Chat ID
                </label>
                <input
                    id="telegram-chat-id"
                    type="text"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    placeholder="Your personal or group chat ID"
                    className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                />
                 <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    To get your ID, message <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline">@userinfobot</a>. You must start a chat with your own bot first.
                </p>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={handleSave} className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors">
                    Save
                </button>
                <button
                    onClick={handleTest}
                    disabled={!token.trim() || !chatId.trim() || status.type === 'loading'}
                    className="bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-2 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50 flex items-center justify-center w-40"
                >
                    {status.type === 'loading' ? <Spinner /> : 'Test Integration'}
                </button>
            </div>
             {status.message && (
                <p className={`text-sm mt-2 ${
                    status.type === 'success' ? 'text-green-600 dark:text-green-400' :
                    status.type === 'error' ? 'text-red-500 dark:text-red-400' :
                    'text-neutral-500'
                }`}>
                    {status.message}
                </p>
            )}
        </div>
    );
};


const IntegrationPanel: React.FC<IntegrationsViewProps> = ({ currentUser, onUserUpdate }) => (
    <div className="space-y-6">
        <GoogleDriveSettings />
        <ApiKeyPanel currentUser={currentUser} onUserUpdate={onUserUpdate} />
        <TelegramSettings />
        {currentUser.role === 'admin' && <WebhookSettings />}
    </div>
);


const GoogleDriveSettings: React.FC = () => {
    const [clientId, setClientId] = useState('');
    const [inputClientId, setInputClientId] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [userEmail, setUserEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const tokenClient = useRef<any>(null);
    const accessToken = useRef<string | null>(null);

    useEffect(() => {
        const loadSettings = async () => {
            const savedClientId = await loadData<string>('googleClientId');
            const savedIsConnected = await loadData<boolean>('googleDriveConnected');
            const savedUserEmail = await loadData<string>('googleDriveUserEmail');
            const savedToken = await loadData<string>('googleDriveToken');

            if (savedClientId) {
                setClientId(savedClientId);
                setInputClientId(savedClientId);
            }
            if (savedIsConnected) setIsConnected(true);
            if (savedUserEmail) setUserEmail(savedUserEmail);
            if (savedToken) accessToken.current = savedToken;
        };
        loadSettings();
    }, []);

    const isClientIdConfigured = clientId && !clientId.startsWith("YOUR_");

    useEffect(() => {
        if(isConnected) handleDisconnect();
        
        if (!isClientIdConfigured) {
            return;
        }

        const checkGoogleClient = () => {
            if ((window as any).google && (window as any).google.accounts) {
                try {
                    tokenClient.current = (window as any).google.accounts.oauth2.initTokenClient({
                        client_id: clientId,
                        scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.file',
                        callback: (tokenResponse: any) => {
                            if (tokenResponse && tokenResponse.access_token) {
                                accessToken.current = tokenResponse.access_token;
                                saveData('googleDriveToken', tokenResponse.access_token);
                                
                                fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                    headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
                                })
                                .then(res => res.json())
                                .then(data => {
                                    setUserEmail(data.email);
                                    setIsConnected(true);
                                    saveData('googleDriveConnected', true);
                                    saveData('googleDriveUserEmail', data.email);
                                })
                                .catch(err => {
                                    console.error("Failed to fetch user info", err);
                                    setError("Failed to get user information.");
                                    handleDisconnect();
                                });
                            } else {
                                setError("Failed to get access token from Google.");
                            }
                        },
                        error_callback: (error: any) => {
                            console.error('Google Auth Error:', error);
                            setError(`Google authentication error: ${error.details || 'Please check your Client ID.'}`);
                        }
                    });
                } catch(e) {
                    console.error("Error initializing Google client:", e);
                    setError("Failed to initialize Google client. Please ensure your Client ID is valid.");
                }
            } else {
                setTimeout(checkGoogleClient, 100);
            }
        };

        checkGoogleClient();

    }, [isClientIdConfigured, clientId]);

    const handleSaveClientId = () => {
        const trimmedId = inputClientId.trim();
        if (trimmedId && trimmedId.endsWith('.apps.googleusercontent.com')) {
            saveData('googleClientId', trimmedId);
            setClientId(trimmedId);
            setError(null);
        } else {
            setError("Please enter a valid Google Client ID. It should end with '.apps.googleusercontent.com'.");
        }
    };

    const handleConnect = () => {
        setError(null);
        if (tokenClient.current) {
            tokenClient.current.requestAccessToken({ prompt: 'consent' });
        } else {
            setError("Google client could not be initialized. Please check your Client ID and refresh the page.");
        }
    };

    const handleDisconnect = () => {
        if (accessToken.current && (window as any).google && (window as any).google.accounts.oauth2.revoke) {
            (window as any).google.accounts.oauth2.revoke(accessToken.current, () => {});
        }
        accessToken.current = null;
        setIsConnected(false);
        setUserEmail("");
        removeData('googleDriveConnected');
        removeData('googleDriveUserEmail');
        removeData('googleDriveToken');
    }

    const handleClearClientId = () => {
        handleDisconnect();
        setClientId('');
        setInputClientId('');
        removeData('googleClientId');
        setError(null);
    }

    return (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><GoogleDriveIcon className="w-6 h-6"/> Google Drive Integration</h2>
            {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
             <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                Automatically back up all the images and videos you generate to a folder in your Google Drive.
            </p>

            {!isClientIdConfigured ? (
                <div className="space-y-4">
                    <div className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-400/10 p-3 rounded-md">
                        <p className="font-semibold">Configuration required.</p>
                        <p>Please enter your Google Client ID to enable Google Drive integration.</p>
                    </div>
                     <div>
                        <label htmlFor="google-client-id" className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Google Client ID</label>
                        <input
                            id="google-client-id"
                            type="text"
                            value={inputClientId}
                            onChange={(e) => setInputClientId(e.target.value)}
                            placeholder="xxxx-xxxx.apps.googleusercontent.com"
                            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                        />
                    </div>
                    <button onClick={handleSaveClientId} className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors">
                        Save & Activate
                    </button>
                </div>
            ) : isConnected ? (
                <div>
                    <p className="text-green-600 dark:text-green-400 font-semibold">Successfully connected to Google Drive.</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">Backing up to: <span className="font-medium">{userEmail}</span></p>
                    <div className="flex gap-2">
                        <button onClick={handleDisconnect} className="mt-4 bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors text-sm">
                            Disconnect
                        </button>
                         <button onClick={handleClearClientId} className="mt-4 bg-neutral-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-neutral-600 transition-colors text-sm">
                            Change Client ID
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm">Client ID saved: <code className="text-xs bg-neutral-200 dark:bg-neutral-700 p-1 rounded">{clientId.substring(0, 20)}...</code></p>
                    <button onClick={handleConnect} className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors">
                        Connect to Google Drive
                    </button>
                     <button onClick={handleClearClientId} className="bg-neutral-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-neutral-600 transition-colors text-sm">
                        Change Client ID
                    </button>
                </div>
            )}
        </div>
    );
};

const WebhookSettings: React.FC = () => {
    const WEBHOOK_URL_KEY = '1za7-ai-webhook-url';
    const [inputUrl, setInputUrl] = useState('');
    const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

    useEffect(() => {
        const loadUrl = async () => {
            const savedUrl = await loadData<string>(WEBHOOK_URL_KEY);
            if (savedUrl) {
                setInputUrl(savedUrl);
            }
        };
        loadUrl();
    }, []);

    const handleSave = async () => {
        try {
            if (inputUrl.trim()) {
                new URL(inputUrl); // Validate URL format
                await saveData(WEBHOOK_URL_KEY, inputUrl);
                setStatus({ type: 'success', message: 'Webhook URL saved!' });
            } else {
                await removeData(WEBHOOK_URL_KEY);
                setStatus({ type: 'success', message: 'Webhook URL deleted.' });
            }
        } catch (_) {
            setStatus({ type: 'error', message: 'Invalid URL. Please enter a correct URL.' });
        }
        setTimeout(() => setStatus({ type: 'idle', message: '' }), 3000);
    };
    
    const handleTest = async () => {
        const savedUrl = await loadData<string>(WEBHOOK_URL_KEY);
        if (!savedUrl) {
            setStatus({ type: 'error', message: 'No webhook URL saved to test.' });
            return;
        }

        const testPayload = {
            event: 'user.test',
            user: {
                id: 'user-test-123',
                username: 'testuser',
                email: 'test@example.com',
                phone: '0123456789',
                status: 'trial',
                role: 'user',
            },
            timestamp: new Date().toISOString(),
        };

        try {
            const response = await fetch(savedUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testPayload),
            });

            if (response.ok) {
                setStatus({ type: 'success', message: `Test successful! Sent to your URL (Status: ${response.status})` });
            } else {
                setStatus({ type: 'error', message: `Test failed. The webhook server responded with status: ${response.status}` });
            }
        } catch (error) {
            console.error("Webhook test failed:", error);
            setStatus({ type: 'error', message: 'Test failed. Check the console for error details.' });
        }
    };


    return (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg space-y-4 shadow-sm">
            <h2 className="text-xl font-semibold flex items-center gap-2"><WebhookIcon className="w-6 h-6"/> Webhook Configuration</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Automatically send new user data to a specified URL when they register. Useful for custom integrations.
            </p>
            <div>
                <label htmlFor="webhook-url" className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                    Webhook URL
                </label>
                <input
                    id="webhook-url"
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://your-automation-url.com/webhook"
                    className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                />
            </div>
            <div className="flex items-center gap-2">
                <button onClick={handleSave} className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors">
                    Save
                </button>
                <button onClick={handleTest} disabled={!inputUrl.trim()} className="bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-2 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50">
                    Test Webhook
                </button>
            </div>
            {status.message && (
                <p className={`text-sm ${status.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{status.message}</p>
            )}
        </div>
    );
};

const IntegrationsView: React.FC<IntegrationsViewProps> = (props) => {
    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Integrations</h1>
            <IntegrationPanel {...props} />
        </div>
    );
};

export default IntegrationsView;