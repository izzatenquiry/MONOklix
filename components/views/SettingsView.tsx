import React, { useState, useEffect, useCallback, useRef } from 'react';
import { type User, type AiLogItem } from '../../types';
import { updateUserProfile, verifyAndSaveUserApiKey, updateUserWebhookUrl } from '../../services/userService';
import { CreditCardIcon, CheckCircleIcon, XIcon, GoogleDriveIcon, WebhookIcon, TelegramIcon, EyeIcon, EyeOffIcon, TrashIcon, ClipboardListIcon, AudioIcon } from '../Icons';
import Spinner from '../common/Spinner';
import { saveData, loadData, removeData } from '../../services/indexedDBService';
import { sendToTelegram } from '../../services/telegramService';
import { verifyApiKey } from '../../services/geminiService';
import { getLogs, clearLogs } from '../../services/aiLogService';
import { sendTestUserWebhook } from '../../services/webhookService';

interface SettingsViewProps {
  theme: string;
  setTheme: (theme: string) => void;
  currentUser: User;
  onUserUpdate: (user: User) => void;
}

// --- Panels from UserProfileView ---

const TrialCountdownDisplay: React.FC<{ expiry: number }> = ({ expiry }) => {
    const calculateTimeLeft = useCallback(() => {
        const now = Date.now();
        const timeLeft = expiry - now;

        if (timeLeft <= 0) {
            return " - Expired";
        }

        const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
        const seconds = Math.floor((timeLeft / 1000) % 60);

        return ` - Expires in ${minutes}m ${seconds}s`;
    }, [expiry]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        if (timeLeft.includes("Expired")) {
            return; // No need to set up an interval if already expired
        }

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, calculateTimeLeft]);

    return <span className="italic">{timeLeft}</span>;
};

const AiLogPanel: React.FC = () => {
    const [logs, setLogs] = useState<AiLogItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [blobUrls, setBlobUrls] = useState<Map<string, string>>(new Map());

    const refreshLogs = useCallback(async () => {
        setIsLoading(true);
        const fetchedLogs = await getLogs();
        setLogs(fetchedLogs);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        refreshLogs();
    }, [refreshLogs]);
    
    // Effect to create and revoke blob URLs for media previews
    useEffect(() => {
        const newUrls = new Map<string, string>();
        logs.forEach(log => {
            if (log.mediaOutput instanceof Blob) {
                const url = URL.createObjectURL(log.mediaOutput);
                newUrls.set(log.id, url);
            }
        });
        setBlobUrls(newUrls);

        // Cleanup function to revoke URLs when the component unmounts or logs change
        return () => {
            newUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [logs]);

    const handleClearLogs = async () => {
        if (window.confirm("Are you sure you want to clear the entire AI log? This action cannot be undone.")) {
            await clearLogs();
            await refreshLogs();
        }
    };
    
    const renderPreview = (log: AiLogItem) => {
        const baseClasses = "w-10 h-10 object-cover rounded bg-neutral-200 dark:bg-neutral-800 flex-shrink-0";
        if (!log.mediaOutput) {
            return <div className={baseClasses}></div>;
        }
        if (typeof log.mediaOutput === 'string') { // base64 image
            return <img src={`data:image/png;base64,${log.mediaOutput}`} alt="Preview" className={baseClasses} />;
        }
        if (log.mediaOutput instanceof Blob) {
            const url = blobUrls.get(log.id);
            if (!url) return <div className={baseClasses}><Spinner /></div>;
    
            if (log.mediaOutput.type.startsWith('video/')) {
                return <video src={url} className={`${baseClasses} bg-black`} muted loop playsInline />;
            }
            if (log.mediaOutput.type.startsWith('audio/')) {
                return <div className={`${baseClasses} flex items-center justify-center`}><AudioIcon className="w-5 h-5 text-neutral-500" /></div>;
            }
        }
        return <div className={baseClasses}></div>;
    };


    return (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">AI API Log</h2>
                {logs.length > 0 && (
                    <button onClick={handleClearLogs} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 font-semibold">
                        <TrashIcon className="w-4 h-4" />
                        Clear Log
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20"><Spinner /></div>
            ) : logs.length === 0 ? (
                <div className="text-center py-20 text-neutral-500 dark:text-neutral-400">
                    <ClipboardListIcon className="w-16 h-16 mx-auto mb-4" />
                    <p className="font-semibold">No Log Entries Found</p>
                    <p className="text-sm">Your interactions with the AI will be logged here automatically.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-neutral-500 dark:text-neutral-400">
                        <thead className="text-xs text-neutral-700 uppercase bg-neutral-100 dark:bg-neutral-800/50 dark:text-neutral-400">
                            <tr>
                                <th scope="col" className="px-4 py-3">Preview</th>
                                <th scope="col" className="px-6 py-3">Timestamp</th>
                                <th scope="col" className="px-6 py-3">Model</th>
                                <th scope="col" className="px-6 py-3">Prompt</th>
                                <th scope="col" className="px-6 py-3">Output</th>
                                <th scope="col" className="px-6 py-3 text-right">Tokens</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id} className={`border-b dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 ${log.status === 'Error' ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                                    <td className="px-4 py-3">{renderPreview(log)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4 font-mono text-xs">{log.model}</td>
                                    <td className="px-6 py-4 max-w-xs truncate" title={log.prompt}>{log.prompt}</td>
                                    <td className="px-6 py-4 max-w-xs truncate" title={log.output}>
                                        <span className={`${log.status === 'Error' ? 'text-red-500' : ''}`}>{log.output}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-xs">{log.tokenCount > 0 ? log.tokenCount.toLocaleString() : 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const BillingUsagePanel: React.FC = () => {
    const BILLING_CONNECTED_KEY = '1za7-ai-billing-connected';
    const [isConnected, setIsConnected] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [isKeyVisible, setIsKeyVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCheckingStatus, setIsCheckingStatus] = useState(true);

    useEffect(() => {
        const checkStatus = async () => {
            const connected = await loadData<boolean>(BILLING_CONNECTED_KEY);
            setIsConnected(!!connected);
            setIsCheckingStatus(false);
        };
        checkStatus();
    }, []);

    const handleConnect = async () => {
        if (!apiKey.trim()) {
            setError('Please enter an API key.');
            return;
        }
        setIsLoading(true);
        setError(null);
        
        const isValid = await verifyApiKey(apiKey);

        if (isValid) {
            await saveData(BILLING_CONNECTED_KEY, true);
            setIsConnected(true);
            setApiKey('');
            setIsKeyVisible(false);
        } else {
            setError('Connection failed. The provided API key is invalid or lacks the necessary permissions.');
        }

        setIsLoading(false);
    };

    const handleDisconnect = async () => {
        await removeData(BILLING_CONNECTED_KEY);
        setIsConnected(false);
        setError(null);
    };
    
    // Mock data for demonstration
    const totalCredits = 5000;
    const usedCredits = 1850;
    const remainingCredits = totalCredits - usedCredits;
    const usagePercentage = (usedCredits / totalCredits) * 100;
    const currentBill = 25.00;
    
    const BillingInfoPanel = () => {
        if (isCheckingStatus) {
            return (
                 <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm flex justify-center items-center h-48">
                    <Spinner />
                </div>
            )
        }
    
        if (!isConnected) {
            return (
                <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-3">
                        <CreditCardIcon className="w-6 h-6" />
                        API Usage & Billing
                    </h2>
                    <div className="bg-neutral-100 dark:bg-neutral-800/50 p-4 rounded-lg space-y-4">
                        <h3 className="font-semibold text-neutral-800 dark:text-neutral-200">Connect to Google Cloud</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            To view usage and billing data, please provide a Google Cloud Project API key. This key requires the <strong>Cloud Billing API</strong> to be enabled.
                        </p>
                        <div className="flex flex-col gap-2">
                             <div className="relative flex-grow">
                                <input
                                    type={isKeyVisible ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Enter your Google Cloud API Key"
                                    className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors disabled:opacity-50"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsKeyVisible(!isKeyVisible)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                                    aria-label={isKeyVisible ? 'Hide API key' : 'Show API key'}
                                >
                                    {isKeyVisible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                </button>
                            </div>
                            <button 
                                onClick={handleConnect} 
                                disabled={isLoading}
                                className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center w-32 disabled:opacity-50"
                            >
                                {isLoading ? <Spinner /> : 'Connect'}
                            </button>
                        </div>
                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </div>
                </div>
            );
        }
    
        return (
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-3">
                        <CreditCardIcon className="w-6 h-6" />
                        API Usage & Billing
                    </h2>
                    <button onClick={handleDisconnect} className="text-sm font-semibold text-red-500 hover:underline">Disconnect</button>
                </div>
                
                <div className="text-sm text-green-600 dark:text-green-400 mb-4 p-2 bg-green-500/10 rounded-md flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4" />
                    Connected to Google Cloud Project.
                </div>
    
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1 text-sm">
                            <span className="font-medium text-neutral-600 dark:text-neutral-400">Monthly Usage</span>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{usedCredits.toLocaleString()} / {totalCredits.toLocaleString()} Credits</span>
                        </div>
                        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2.5">
                            <div className="bg-primary-500 h-2.5 rounded-full" style={{ width: `${usagePercentage}%` }}></div>
                        </div>
                    </div>
    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
                        <div className="bg-neutral-100 dark:bg-neutral-800/50 p-4 rounded-lg">
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Credits Used</p>
                            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{usedCredits.toLocaleString()}</p>
                        </div>
                         <div className="bg-neutral-100 dark:bg-neutral-800/50 p-4 rounded-lg">
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Remaining Balance</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{remainingCredits.toLocaleString()}</p>
                        </div>
                         <div className="bg-neutral-100 dark:bg-neutral-800/50 p-4 rounded-lg">
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Current Bill</p>
                            <p className="text-2xl font-bold text-neutral-900 dark:text-white">${currentBill.toFixed(2)}</p>
                        </div>
                    </div>
    
                    <div className="text-right mt-2">
                        <a href="#" className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-semibold">View Billing Details</a>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            <BillingInfoPanel />
            <AiLogPanel />
        </div>
    );
};

const ProfileAndAppearancePanel: React.FC<SettingsViewProps> = ({ theme, setTheme, currentUser, onUserUpdate }) => {
    const [fullName, setFullName] = useState(currentUser.fullName || currentUser.username);
    const [email, setEmail] = useState(currentUser.email);
    const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error' | 'loading'; message: string }>({ type: 'idle', message: '' });
    const statusTimeoutRef = useRef<number | null>(null);

     useEffect(() => {
        return () => {
            if (statusTimeoutRef.current) {
                clearTimeout(statusTimeoutRef.current);
            }
        };
    }, []);

    const getAccountStatus = (user: User): { text: string; colorClass: string } => {
        switch (user.status) {
            case 'admin':
                return { text: 'Admin (Lifetime)', colorClass: 'text-green-500' };
            case 'lifetime':
                return { text: 'Active (Lifetime)', colorClass: 'text-green-500' };
            case 'trial':
                return { text: 'Active (Trial)', colorClass: 'text-yellow-500 dark:text-yellow-400' };
            case 'inactive':
                return { text: 'Inactive (Trial Expired)', colorClass: 'text-red-500' };
            default:
                return { text: 'Unknown', colorClass: 'text-neutral-500' };
        }
    };
    

    const handleSave = async () => {
        if (statusTimeoutRef.current) {
            clearTimeout(statusTimeoutRef.current);
        }

        setStatus({ type: 'loading', message: 'Saving profile...' });
        const result = await updateUserProfile(currentUser.id, {
            fullName: fullName,
            email: email,
        });

        if (result.success === false) {
            setStatus({ type: 'error', message: `Failed: ${result.message}` });
        } else {
            onUserUpdate(result.user);
            setStatus({ type: 'success', message: 'Profile updated successfully!' });
        }
        
        statusTimeoutRef.current = window.setTimeout(() => setStatus({ type: 'idle', message: '' }), 4000);
    };

    const isDarkMode = theme === 'dark';
    const toggleTheme = () => setTheme(isDarkMode ? 'light' : 'dark');
    const accountStatus = getAccountStatus(currentUser);

    return (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-6">User Profile & Appearance</h2>

            <div className="mb-6 p-4 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Account Status: <span className={`font-bold ${accountStatus.colorClass}`}>{accountStatus.text}</span>
                    {currentUser.status === 'trial' && currentUser.subscriptionExpiry && (
                        <TrialCountdownDisplay expiry={currentUser.subscriptionExpiry} />
                    )}
                </p>
            </div>
           
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Dark Mode</h3>
                     <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        {isDarkMode ? 'Enjoy a darker interface.' : 'Switch to a lighter interface.'}
                    </p>
                </div>
                <label htmlFor="dark-mode-toggle" className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="dark-mode-toggle" className="sr-only peer" checked={isDarkMode} onChange={toggleTheme}/>
                    <div className="w-11 h-6 bg-neutral-200 dark:bg-neutral-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-primary-600"></div>
                </label>
            </div>

            <hr className="my-8 border-neutral-200 dark:border-neutral-700/50" />

            <div className="space-y-6">
                
                <div>
                    <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Full Name</label>
                    <input 
                        type="text" 
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)} 
                        disabled={status.type === 'loading'}
                        className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none transition disabled:opacity-50" 
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Email Address</label>
                    <input type="email" value={email} readOnly disabled className="w-full bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none transition cursor-not-allowed" />
                    <p className="text-xs text-neutral-400 mt-1">Changing email is not currently supported.</p>
                </div>
                <div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleSave} 
                            disabled={status.type === 'loading'}
                            className="bg-primary-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center w-48 disabled:opacity-50"
                        >
                           {status.type === 'loading' ? <Spinner /> : 'Save Changes'}
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
            </div>
        </div>
    );
};

// --- Panels from IntegrationsView ---

const ApiKeyPanel: React.FC<{ currentUser: User, onUserUpdate: (user: User) => void }> = ({ currentUser, onUserUpdate }) => {
    const [apiKey, setApiKey] = useState('');
    const [isKeyVisible, setIsKeyVisible] = useState(false);
    const [validation, setValidation] = useState<{ status: 'idle' | 'invalid' | 'valid'; message: string }>({ status: 'idle', message: '' });
    const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error' | 'loading'; message: string }>({ type: 'idle', message: '' });
    const statusTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (statusTimeoutRef.current) {
                clearTimeout(statusTimeoutRef.current);
            }
        };
    }, []);

    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newKey = e.target.value;
        setApiKey(newKey);
        if (!newKey) {
            setValidation({ status: 'idle', message: '' });
        } else if (newKey.length !== 39) {
            setValidation({ status: 'invalid', message: 'Key must be 39 characters long.' });
        } else {
            setValidation({ status: 'valid', message: 'Key format looks correct.' });
        }
    };

    const handleSave = async () => {
        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
        if (validation.status === 'invalid' && apiKey.trim() !== '') {
            setStatus({ type: 'error', message: 'The API key format is incorrect. It must be 39 characters.'});
            return;
        }

        setStatus({ type: 'loading', message: 'Verifying API Key...' });
        const result = await verifyAndSaveUserApiKey(currentUser.id, apiKey);

        // FIX: The logic here was inverted. The success case was handled in the 'else' block
        // and the error case in the 'if' block, causing type errors. This has been corrected.
        // @FIX: Fix TypeScript error by explicitly checking for failure case (`result.success === false`) to ensure correct type narrowing for the discriminated union return type of `verifyAndSaveUserApiKey`.
        if (result.success === false) {
            setStatus({ type: 'error', message: result.message });
            statusTimeoutRef.current = window.setTimeout(() => setStatus({ type: 'idle', message: '' }), 5000);
        } else {
            setStatus({ type: 'success', message: 'API Key successfully verified and saved.' });
            setValidation({ status: 'idle', message: '' });
            onUserUpdate(result.user);
            setApiKey('');
            statusTimeoutRef.current = window.setTimeout(() => setStatus({ type: 'idle', message: '' }), 3000);
        }
    };
    
    const validationBorderClasses = {
        idle: 'border-neutral-300 dark:border-neutral-700 focus:ring-primary-500 focus:border-primary-500',
        invalid: 'border-red-500 dark:border-red-400 focus:ring-red-500 focus:border-red-500',
        valid: 'border-green-500 dark:border-green-400 focus:ring-green-500 focus:border-green-500',
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
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <div className="relative flex-grow">
                        <input
                            type={isKeyVisible ? 'text' : 'password'}
                            value={apiKey}
                            onChange={handleApiKeyChange}
                            placeholder="Enter a new API Key here to update"
                            className={`w-full bg-white dark:bg-neutral-800 border rounded-lg p-2 pr-10 focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 ${validationBorderClasses[validation.status]}`}
                            disabled={status.type === 'loading'}
                        />
                        <button
                            type="button"
                            onClick={() => setIsKeyVisible(!isKeyVisible)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                            aria-label={isKeyVisible ? 'Hide API key' : 'Show API key'}
                        >
                            {isKeyVisible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                    </div>
                    <button 
                        onClick={handleSave} 
                        disabled={status.type === 'loading' || !apiKey.trim()} 
                        className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center w-24 disabled:opacity-50"
                    >
                        {status.type === 'loading' ? <Spinner /> : 'Save'}
                    </button>
                </div>
                {validation.message && (
                    <p className={`text-xs mt-1 ${
                        validation.status === 'invalid' ? 'text-red-500' :
                        validation.status === 'valid' ? 'text-green-500' :
                        'text-neutral-500'
                    }`}>{validation.message}</p>
                )}
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
        const result = await sendToTelegram('Hello from MONOKlix.com! Your Telegram integration is working.', 'text');

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
                            let userMessage = 'An unknown Google authentication error occurred.';

                            if (error && typeof error === 'object') {
                                const errorType = error.type;
                                const errorDetails = error.details;
                                const errorMsg = error.error || (typeof error.toString === 'function' ? error.toString() : '');
                    
                                if (errorType === 'popup_closed_by_user' || errorMsg.includes('popup_closed_by_user')) {
                                    userMessage = 'The popup was closed. If you saw an "Error 403: access_denied" message, this is a Google Cloud configuration issue. Please ensure this app\'s URL is listed in BOTH "Authorized JavaScript origins" and "Authorized redirect URIs" for your Client ID.';
                                } else if (errorDetails && (errorDetails.includes('access_denied') || errorDetails.includes('redirect_uri_mismatch'))) {
                                    userMessage = 'Access Denied or Redirect URI Mismatch. This is a Google Cloud configuration issue. Please ensure this app\'s URL is listed in BOTH "Authorized JavaScript origins" and "Authorized redirect URIs" for your Client ID.';
                                } else if (errorType === 'popup_blocked_by_browser' || errorMsg.includes('popup_blocked_by_browser')) {
                                     userMessage = 'Your browser blocked the popup. Please disable your popup blocker for this site and try again.';
                                } else if (errorMsg.includes("idpiframe_initialization_failed")) {
                                    userMessage = "Authentication failed to initialize. This may be due to third-party cookie restrictions in your browser. Please ensure cookies for accounts.google.com are not blocked.";
                                } else if (errorDetails) {
                                    userMessage = `Authentication failed: ${errorDetails}`;
                                } else {
                                     userMessage = `Google authentication error. Common causes: 1) Invalid Client ID. 2) The app's URL is not listed as an "Authorized JavaScript origin" in your Google Cloud project. 3) Browser is blocking third-party cookies.`;
                                }
                            }
                            setError(userMessage);
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
                         <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                            You can get this from the Google Cloud Console under "APIs & Services" &gt; "Credentials".
                            <br />
                            <strong>Important:</strong> You must add this app's URL (<code>{window.location.origin}</code>) to the list of "Authorized JavaScript origins" for your Client ID.
                        </p>
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

const AdminWebhookSettings: React.FC = () => {
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
            <h2 className="text-xl font-semibold flex items-center gap-2"><WebhookIcon className="w-6 h-6"/> Admin Webhook (New Users)</h2>
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

const UserWebhookSettings: React.FC<{ currentUser: User, onUserUpdate: (user: User) => void }> = ({ currentUser, onUserUpdate }) => {
    const [inputUrl, setInputUrl] = useState(currentUser.webhookUrl || '');
    const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
    const statusTimeoutRef = useRef<number | null>(null);

     useEffect(() => {
        return () => {
            if (statusTimeoutRef.current) {
                clearTimeout(statusTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        setInputUrl(currentUser.webhookUrl || '');
    }, [currentUser.webhookUrl]);


    const handleSave = async () => {
        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
        setStatus({ type: 'loading', message: 'Saving...' });
        try {
            const urlToSave = inputUrl.trim();
            if (urlToSave) {
                new URL(urlToSave); // Validate
            }
            const result = await updateUserWebhookUrl(currentUser.id, urlToSave || null);
            // @FIX: Fix TypeScript error by explicitly checking for failure case (`result.success === false`) to ensure correct type narrowing for the discriminated union returned by `updateUserWebhookUrl`.
            if (result.success === false) {
                 setStatus({ type: 'error', message: result.message });
            } else {
                onUserUpdate(result.user);
                setStatus({ type: 'success', message: 'Webhook URL saved!' });
            }
        } catch (_) {
            setStatus({ type: 'error', message: 'Invalid URL. Please enter a correct URL.' });
        }
        statusTimeoutRef.current = window.setTimeout(() => setStatus({ type: 'idle', message: '' }), 3000);
    };
    
    const handleTest = async () => {
        if (!currentUser.webhookUrl) {
            setStatus({ type: 'error', message: 'You must save a webhook URL before testing.' });
             setTimeout(() => setStatus({ type: 'idle', message: '' }), 3000);
            return;
        }
        setStatus({ type: 'loading', message: 'Sending test event...' });
        const result = await sendTestUserWebhook();
        if (result.success) {
            setStatus({ type: 'success', message: result.message });
        } else {
            setStatus({ type: 'error', message: result.message });
        }
         setTimeout(() => setStatus({ type: 'idle', message: '' }), 5000);
    };

    return (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg space-y-4 shadow-sm">
            <h2 className="text-xl font-semibold flex items-center gap-2"><WebhookIcon className="w-6 h-6"/> Your Personal Webhook</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Automatically send your generated content (text, images, videos) to a webhook URL, for example, to an n8n workflow.
            </p>
            <div>
                <label htmlFor="user-webhook-url" className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                    Your Webhook URL
                </label>
                <input
                    id="user-webhook-url"
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://your-n8n-url.com/webhook/..."
                    className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                />
            </div>
            <div className="flex items-center gap-2">
                <button onClick={handleSave} disabled={status.type === 'loading'} className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors w-24 flex justify-center">
                    {status.type === 'loading' && status.message === 'Saving...' ? <Spinner /> : 'Save'}
                </button>
                <button onClick={handleTest} disabled={!currentUser.webhookUrl || status.type === 'loading'} className="bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-2 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50 w-40 flex justify-center">
                    {status.type === 'loading' && status.message !== 'Saving...' ? <Spinner /> : 'Test Webhook'}
                </button>
            </div>
            {status.message && (
                <p className={`text-sm mt-2 ${
                    status.type === 'success' ? 'text-green-600 dark:text-green-400' : 
                    status.type === 'error' ? 'text-red-500 dark:text-red-400' : 
                    'text-neutral-500'}`}>{status.message}
                </p>
            )}
        </div>
    );
};

const AIAgentPanel: React.FC = () => {
    const SETTINGS_KEY = '1za7-ai-agent-settings';
    
    const allAgents = [
        { id: 'chat', label: 'Chat GPT' },
        { id: 'content-ideas', label: 'Content Ideas Generator' },
        { id: 'marketing-copy', label: 'Copywriting Generator' },
        { id: 'image-generation', label: 'Image Generation' },
        { id: 'background-remover', label: 'Image Background Remover' },
        { id: 'image-enhancer', label: 'Image Enhancer' },
        { id: 'product-photo', label: 'Image Product Photos' },
        { id: 'tiktok-affiliate', label: 'Image Model Photos' },
        { id: 'product-ad', label: 'Video Storyline Generator' },
        { id: 'product-review', label: 'Video Storyboard Generator' },
        { id: 'video-generation', label: 'Video Generation' },
        { id: 'video-combiner', label: 'Video Combiner' },
        { id: 'voice-studio', label: 'Voice Studio' },
    ];

    const [enabledAgents, setEnabledAgents] = useState<Record<string, boolean> | null>(null);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedSettings = await loadData<Record<string, boolean>>(SETTINGS_KEY);
                if (savedSettings) {
                    setEnabledAgents(savedSettings);
                    return;
                }
            } catch (e) {
                console.error("Failed to parse AI Agent settings:", e);
            }
            // Default state if nothing is loaded
            const defaultState: Record<string, boolean> = {};
            allAgents.forEach(agent => {
                defaultState[agent.id] = true;
            });
            setEnabledAgents(defaultState);
        };
        loadSettings();
    }, []);


    const handleToggle = (id: string) => {
        setEnabledAgents(prev => {
            if (!prev) return null;
            const newState = { ...prev, [id]: !prev[id] };
            try {
                saveData(SETTINGS_KEY, newState);
            } catch (e) {
                console.error("Failed to save AI Agent settings:", e);
            }
            return newState;
        });
    };
    
    if (!enabledAgents) {
        return <div className="flex justify-center p-8"><Spinner /></div>;
    }


    return (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold">AI Agent</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 mb-6">
                Enable or disable AI generation features for all users. Changes take effect immediately.
            </p>
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {allAgents.map(service => (
                        <div key={service.id} className="flex items-center justify-between p-4 bg-white dark:bg-neutral-900/50">
                            <label htmlFor={`toggle-${service.id}`} className="font-medium text-neutral-800 dark:text-neutral-200 cursor-pointer flex-1 pr-4">
                                {service.label}
                            </label>
                            <label htmlFor={`toggle-${service.id}`} className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                <input
                                    type="checkbox"
                                    id={`toggle-${service.id}`}
                                    className="sr-only peer"
                                    checked={!!enabledAgents[service.id]}
                                    onChange={() => handleToggle(service.id)}
                                />
                                <div className="w-11 h-6 bg-neutral-200 dark:bg-neutral-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-primary-600"></div>
                            </label>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


// --- Main View Component ---

const SettingsView: React.FC<SettingsViewProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'integrations' | 'billing' | 'ai-agent'>('profile');

    const allTabs = [
        { id: 'profile', label: 'Profile & Appearance', roles: ['admin', 'user'] },
        { id: 'integrations', label: 'API & Integrations', roles: ['admin', 'user'] },
        { id: 'billing', label: 'Billing & Usage', roles: ['admin', 'user'] },
        { id: 'ai-agent', label: 'AI Agent', roles: ['admin'] }
    ];

    const tabs = allTabs.filter(tab => tab.roles.includes(props.currentUser.role));

    const renderContent = () => {
        switch (activeTab) {
            case 'profile':
                return <ProfileAndAppearancePanel {...props} />;
            case 'integrations':
                return (
                    <div className="space-y-8">
                        <ApiKeyPanel currentUser={props.currentUser} onUserUpdate={props.onUserUpdate} />
                        <UserWebhookSettings currentUser={props.currentUser} onUserUpdate={props.onUserUpdate} />
                        <TelegramSettings />
                        <GoogleDriveSettings />
                        {props.currentUser.role === 'admin' && <AdminWebhookSettings />}
                    </div>
                );
            case 'billing':
                return <BillingUsagePanel />;
            case 'ai-agent':
                return props.currentUser.role === 'admin' ? <AIAgentPanel /> : null;
            default:
                return null;
        }
    };
    
    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-8 sm:text-3xl">Settings</h1>
            
             <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-8 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2 text-sm font-semibold transition-colors relative whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'text-primary-600 dark:text-primary-400'
                                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white'
                        }`}
                    >
                        {tab.label}
                        {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />}
                    </button>
                ))}
            </div>
            
            <div>
                {renderContent()}
            </div>
        </div>
    );
};

export default SettingsView;