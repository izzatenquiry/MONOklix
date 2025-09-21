import React, { useState, useEffect, useCallback, useRef } from 'react';
import { type User, type AiLogItem } from '../../types';
import { updateUserProfile, saveUserApiKey, updateUserWebhookUrl } from '../../services/userService';
import { CreditCardIcon, CheckCircleIcon, XIcon, WebhookIcon, EyeIcon, EyeOffIcon, TrashIcon, ClipboardListIcon, AudioIcon, AlertTriangleIcon } from '../Icons';
import Spinner from '../common/Spinner';
import { getLogs, clearLogs } from '../../services/aiLogService';
import { sendTestUserWebhook } from '../../services/webhookService';
import AdminDashboardView from './AdminDashboardView';
import ETutorialAdminView from './ETutorialAdminView';
import Tabs, { type Tab } from '../common/Tabs';

// Define the types for the tabs in the settings view
type SettingsTabId = 'profile' | 'api' | 'log' | 'content-admin' | 'user-db';

const TABS: Tab<SettingsTabId>[] = [
    { id: 'profile', label: 'User Profile' },
    { id: 'api', label: 'API & Integrations' },
    { id: 'log', label: 'API Log' },
    { id: 'content-admin', label: 'Admin Content', adminOnly: true },
    { id: 'user-db', label: 'User Database', adminOnly: true },
];

interface SettingsViewProps {
  theme: string;
  setTheme: (theme: string) => void;
  currentUser: User;
  onUserUpdate: (user: User) => void;
}

// --- PANELS ---

const ProfilePanel: React.FC<SettingsViewProps> = ({ theme, setTheme, currentUser, onUserUpdate }) => {
    const [fullName, setFullName] = useState(currentUser.fullName || currentUser.username);
    const [email, setEmail] = useState(currentUser.email);
    const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error' | 'loading'; message: string }>({ type: 'idle', message: '' });
    const statusTimeoutRef = useRef<number | null>(null);

     useEffect(() => {
        return () => {
            if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
        };
    }, []);

    const getAccountStatus = (user: User): { text: string; colorClass: string } => {
        switch (user.status) {
            case 'admin': return { text: 'Admin (Lifetime)', colorClass: 'text-green-500' };
            case 'lifetime': return { text: 'Active (Lifetime)', colorClass: 'text-green-500' };
            default: return { text: 'Unknown', colorClass: 'text-neutral-500' };
        }
    };

    const handleSave = async () => {
        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
        setStatus({ type: 'loading', message: 'Saving profile...' });
        const result = await updateUserProfile(currentUser.id, { fullName, email });
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
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Account Status: <span className={`font-bold ${accountStatus.colorClass}`}>{accountStatus.text}</span></p>
            </div>
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Dark Mode</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{isDarkMode ? 'Enjoy a darker interface.' : 'Switch to a lighter interface.'}</p>
                </div>
                <label htmlFor="dark-mode-toggle" className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="dark-mode-toggle" className="sr-only peer" checked={isDarkMode} onChange={toggleTheme}/>
                    <div className="w-11 h-6 bg-neutral-200 dark:bg-neutral-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-primary-600"></div>
                </label>
            </div>
            <hr className="my-8 border-neutral-200 dark:border-neutral-700/50" />
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Full Name</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={status.type === 'loading'} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none transition disabled:opacity-50" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Email Address</label>
                    <input type="email" value={email} readOnly disabled className="w-full bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 cursor-not-allowed" />
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleSave} disabled={status.type === 'loading'} className="bg-primary-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors w-48 flex justify-center disabled:opacity-50">
                        {status.type === 'loading' ? <Spinner /> : 'Save Changes'}
                    </button>
                    {status.type !== 'idle' && (
                        <div className={`flex items-center gap-3 text-sm ${status.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
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

const ApiIntegrationsPanel: React.FC<{ currentUser: User, onUserUpdate: (user: User) => void }> = ({ currentUser, onUserUpdate }) => {
    const [apiKey, setApiKey] = useState('');
    const [isKeyVisible, setIsKeyVisible] = useState(false);
    const [apiKeyStatus, setApiKeyStatus] = useState<{ type: 'idle' | 'success' | 'error' | 'loading'; message: string }>({ type: 'idle', message: '' });
    
    const [webhookUrl, setWebhookUrl] = useState(currentUser.webhookUrl || '');
    const [webhookStatus, setWebhookStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

    const handleSaveApiKey = async () => {
        setApiKeyStatus({ type: 'loading', message: 'Saving API Key...' });
        const result = await saveUserApiKey(currentUser.id, apiKey);
        if (result.success === false) {
            setApiKeyStatus({ type: 'error', message: result.message });
        } else {
            setApiKeyStatus({ type: 'success', message: 'API Key successfully saved.' });
            onUserUpdate(result.user);
            setApiKey('');
        }
        setTimeout(() => setApiKeyStatus({ type: 'idle', message: '' }), 4000);
    };

    const handleSaveWebhook = async () => {
        setWebhookStatus({ type: 'loading', message: 'Saving...' });
        try {
            const urlToSave = webhookUrl.trim();
            if (urlToSave) new URL(urlToSave);
            const result = await updateUserWebhookUrl(currentUser.id, urlToSave || null);
            if (result.success === false) {
                setWebhookStatus({ type: 'error', message: result.message });
            } else {
                onUserUpdate(result.user);
                setWebhookStatus({ type: 'success', message: 'Webhook URL saved!' });
            }
        } catch (_) {
            setWebhookStatus({ type: 'error', message: 'Invalid URL format.' });
        }
        setTimeout(() => setWebhookStatus({ type: 'idle', message: '' }), 3000);
    };
    
    const handleTestWebhook = async () => {
        if (!currentUser.webhookUrl) return;
        setWebhookStatus({ type: 'loading', message: 'Sending test...' });
        const result = await sendTestUserWebhook();
        setWebhookStatus({ type: result.success ? 'success' : 'error', message: result.message });
        setTimeout(() => setWebhookStatus({ type: 'idle', message: '' }), 5000);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold mb-2">Google Gemini API Key</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                    Provide your key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline">Google AI Studio</a>.
                </p>
                {currentUser.apiKey && <p className="text-sm text-green-600 dark:text-green-400 mb-4 p-2 bg-green-500/10 rounded-md">Active Key: ...{currentUser.apiKey.slice(-4)}</p>}
                <div className="flex items-center gap-2">
                    <div className="relative flex-grow">
                        <input type={isKeyVisible ? 'text' : 'password'} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter new API Key to update" className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors disabled:opacity-50" disabled={apiKeyStatus.type === 'loading'} />
                        <button type="button" onClick={() => setIsKeyVisible(!isKeyVisible)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-500 hover:text-neutral-700" aria-label={isKeyVisible ? 'Hide' : 'Show'}>
                            {isKeyVisible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                    </div>
                    <button onClick={handleSaveApiKey} disabled={apiKeyStatus.type === 'loading'} className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 w-24 flex justify-center disabled:opacity-50">
                        {apiKeyStatus.type === 'loading' ? <Spinner /> : 'Save'}
                    </button>
                </div>
                {apiKeyStatus.type !== 'idle' && <p className={`text-sm mt-2 ${apiKeyStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{apiKeyStatus.message}</p>}
            </div>
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold flex items-center gap-2"><WebhookIcon className="w-6 h-6"/> Personal Webhook</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 my-4">Automatically send generated content to an external URL (e.g., n8n).</p>
                <input id="user-webhook-url" type="text" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://your-n8n-url.com/webhook/..." className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500" />
                <div className="flex items-center gap-2 mt-4">
                    <button onClick={handleSaveWebhook} disabled={webhookStatus.type === 'loading'} className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 w-24 flex justify-center">
                        {webhookStatus.type === 'loading' && webhookStatus.message.includes('Saving') ? <Spinner /> : 'Save'}
                    </button>
                    <button onClick={handleTestWebhook} disabled={!currentUser.webhookUrl || webhookStatus.type === 'loading'} className="bg-neutral-200 dark:bg-neutral-700 font-semibold py-2 px-4 rounded-lg hover:bg-neutral-300 disabled:opacity-50 w-40 flex justify-center">
                        {webhookStatus.type === 'loading' && webhookStatus.message.includes('Sending') ? <Spinner /> : 'Test Webhook'}
                    </button>
                </div>
                {webhookStatus.message && <p className={`text-sm mt-2 ${webhookStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{webhookStatus.message}</p>}
            </div>
        </div>
    );
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
        const newUrls = new Map<string, string>();
        logs.forEach(log => { if (log.mediaOutput instanceof Blob) newUrls.set(log.id, URL.createObjectURL(log.mediaOutput)); });
        setBlobUrls(newUrls);
        return () => { newUrls.forEach(url => URL.revokeObjectURL(url)); };
    }, [refreshLogs]);

    const handleClearLogs = async () => { if (window.confirm("Are you sure?")) { await clearLogs(); await refreshLogs(); } };
    
    const renderPreview = (log: AiLogItem) => {
        const baseClasses = "w-10 h-10 object-cover rounded bg-neutral-200 dark:bg-neutral-800 flex-shrink-0";
        if (!log.mediaOutput) return <div className={baseClasses}></div>;
        if (typeof log.mediaOutput === 'string') return <img src={`data:image/png;base64,${log.mediaOutput}`} alt="Preview" className={baseClasses} />;
        if (log.mediaOutput instanceof Blob) {
            const url = blobUrls.get(log.id);
            if (!url) return <div className={baseClasses}><Spinner /></div>;
            if (log.mediaOutput.type.startsWith('video/')) return <video src={url} className={`${baseClasses} bg-black`} muted loop playsInline />;
            if (log.mediaOutput.type.startsWith('audio/')) return <div className={`${baseClasses} flex items-center justify-center`}><AudioIcon className="w-5 h-5 text-neutral-500" /></div>;
        }
        return <div className={baseClasses}></div>;
    };

    return (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">AI API Log</h2>
                {logs.length > 0 && <button onClick={handleClearLogs} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-semibold"><TrashIcon className="w-4 h-4" /> Clear Log</button>}
            </div>
            {isLoading ? <div className="flex justify-center py-20"><Spinner /></div> : logs.length === 0 ? (
                <div className="text-center py-20 text-neutral-500">
                    <ClipboardListIcon className="w-16 h-16 mx-auto mb-4" />
                    <p className="font-semibold">No Log Entries Found</p>
                </div>
            ) : (
                <div className="overflow-x-auto"><table className="w-full text-sm text-left text-neutral-500 dark:text-neutral-400">
                    <thead className="text-xs text-neutral-700 uppercase bg-neutral-100 dark:bg-neutral-800/50"><tr>
                        <th scope="col" className="px-4 py-3">Preview</th><th scope="col" className="px-6 py-3">Timestamp</th><th scope="col" className="px-6 py-3">Model</th><th scope="col" className="px-6 py-3">Prompt</th><th scope="col" className="px-6 py-3">Output</th><th scope="col" className="px-6 py-3 text-right">Tokens</th>
                    </tr></thead>
                    <tbody>{logs.map(log => (
                        <tr key={log.id} className={`border-b dark:border-neutral-800 hover:bg-neutral-50 ${log.status === 'Error' ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                            <td className="px-4 py-3">{renderPreview(log)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="px-6 py-4 font-mono text-xs">{log.model}</td>
                            <td className="px-6 py-4 max-w-xs truncate" title={log.prompt}>{log.prompt}</td>
                            <td className="px-6 py-4 max-w-xs truncate" title={log.output}><span className={`${log.status === 'Error' ? 'text-red-500' : ''}`}>{log.output}</span></td>
                            <td className="px-6 py-4 text-right font-mono text-xs">{log.tokenCount > 0 ? log.tokenCount.toLocaleString() : 'N/A'}</td>
                        </tr>
                    ))}</tbody>
                </table></div>
            )}
        </div>
    );
};

// --- MAIN VIEW ---

const SettingsView: React.FC<SettingsViewProps> = (props) => {
    const [activeTab, setActiveTab] = useState<SettingsTabId>('profile');
    const { currentUser } = props;

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'profile': return <ProfilePanel {...props} />;
            case 'api': return <ApiIntegrationsPanel currentUser={currentUser} onUserUpdate={props.onUserUpdate} />;
            case 'log': return <AiLogPanel />;
            case 'content-admin': return <ETutorialAdminView />;
            case 'user-db': return <AdminDashboardView />;
            default: return <ProfilePanel {...props} />;
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold sm:text-3xl">Settings</h1>
            <div className="flex justify-center">
                <Tabs 
                    tabs={TABS}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isAdmin={currentUser.role === 'admin'}
                />
            </div>
            <div className="mt-6">
                {renderActiveTabContent()}
            </div>
        </div>
    );
};

export default SettingsView;