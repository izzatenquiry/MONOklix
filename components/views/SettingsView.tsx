import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type TutorialContent, type User, type UserStatus, type View } from '../../types';
import { getContent, saveContent } from '../../services/contentService';
import { updateUserProfile, verifyAndSaveUserApiKey } from '../../services/userService';
import AdminDashboardView from './AdminDashboardView';
import { UserIcon, ImageIcon, GoogleDriveIcon, BookOpenIcon, UsersIcon, WebhookIcon, XIcon, AIAgentIcon } from '../Icons';
import Spinner from '../common/Spinner';

interface SettingsViewProps {
  theme: string;
  setTheme: (theme: string) => void;
  currentUser: User;
  onUserUpdate: (user: User) => void;
  // FIX: Add missing setActiveView prop to fix type error in App.tsx
  setActiveView: (view: View) => void;
}

type Tab = 'profile' | 'integration' | 'user-lists' | 'e-tutorial';

const SettingsView: React.FC<SettingsViewProps> = ({ theme, setTheme, currentUser, onUserUpdate }) => {
    const [activeTab, setActiveTab] = useState<Tab>(currentUser.role === 'admin' ? 'user-lists' : 'profile');
    
    const allTabs = [
        { id: 'profile', label: 'Profil Pengguna', icon: UserIcon, roles: ['admin', 'user'] },
        { id: 'user-lists', label: 'User Database', icon: UsersIcon, roles: ['admin'] },
        { id: 'integration', label: 'Integrasi', icon: WebhookIcon, roles: ['admin', 'user'] },
        { id: 'e-tutorial', label: 'e-Tutorial', icon: BookOpenIcon, roles: ['admin'] },
    ];

    const visibleTabs = allTabs.filter(tab => tab.roles.includes(currentUser.role));

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Tetapan</h1>
            <div className="flex flex-col md:flex-row gap-8">
                {/* Tab Navigation */}
                <div className="md:w-1/4">
                    <nav className="flex flex-col gap-2">
                        {visibleTabs.map(tab => (
                            <TabButton
                                key={tab.id}
                                label={tab.label}
                                icon={tab.icon}
                                isActive={activeTab === tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                            />
                        ))}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="flex-1">
                    {activeTab === 'profile' && <ProfileAndAppearancePanel theme={theme} setTheme={setTheme} currentUser={currentUser} onUserUpdate={onUserUpdate} />}
                    {activeTab === 'integration' && <IntegrationPanel currentUser={currentUser} onUserUpdate={onUserUpdate} />}
                    {activeTab === 'user-lists' && currentUser.role === 'admin' && <AdminDashboardView />}
                    {activeTab === 'e-tutorial' && currentUser.role === 'admin' && <TutorialManagementPanel />}
                </div>
            </div>
        </div>
    );
};

const TabButton: React.FC<{label: string; icon: React.FC<{className?: string}>; isActive: boolean; onClick: () => void;}> = ({label, icon: Icon, isActive, onClick}) => (
    <button onClick={onClick} className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${isActive ? 'bg-primary-500/10 text-primary-500' : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'}`}>
        <Icon className="w-5 h-5" />
        <span className="font-semibold">{label}</span>
    </button>
);

const TrialCountdownDisplay: React.FC<{ expiry: number }> = ({ expiry }) => {
    const calculateTimeLeft = useCallback(() => {
        const now = Date.now();
        const timeLeft = expiry - now;

        if (timeLeft <= 0) {
            return " - Telah tamat";
        }

        const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
        const seconds = Math.floor((timeLeft / 1000) % 60);

        return ` - Tamat dalam ${minutes}m ${seconds}s`;
    }, [expiry]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        if (timeLeft.includes("Telah tamat")) {
            return; // No need to set up an interval if already expired
        }

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, calculateTimeLeft]);

    return <span className="italic">{timeLeft}</span>;
};


const ProfileAndAppearancePanel: React.FC<{
  theme: string;
  setTheme: (theme: string) => void;
  currentUser: User;
  onUserUpdate: (user: User) => void;
}> = ({ theme, setTheme, currentUser, onUserUpdate }) => {
    const [fullName, setFullName] = useState(currentUser.fullName || currentUser.username);
    const [email, setEmail] = useState(currentUser.email);
    const [avatarUrl] = useState<string | null>(currentUser.avatarUrl || null);
    const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

    const getAccountStatus = (user: User): { text: string; colorClass: string } => {
        switch (user.status) {
            case 'admin':
                return { text: 'Admin (Seumur Hidup)', colorClass: 'text-green-500' };
            case 'lifetime':
                return { text: 'Aktif (Seumur Hidup)', colorClass: 'text-green-500' };
            case 'trial':
                return { text: 'Aktif (Percubaan)', colorClass: 'text-yellow-500 dark:text-yellow-400' };
            case 'inactive':
                return { text: 'Tidak Aktif (Percubaan Tamat)', colorClass: 'text-red-500' };
            default:
                return { text: 'Tidak Diketahui', colorClass: 'text-gray-500' };
        }
    };
    

    const handleSave = async () => {
        setStatus({ type: 'idle', message: '' });
        const result = await updateUserProfile(currentUser.id, {
            fullName: fullName,
            email: email,
        });

        // FIX: Added a type guard to correctly handle the discriminated union return type from `updateUserProfile`.
        if (result.success) {
            onUserUpdate(result.user);
            setStatus({ type: 'success', message: 'Profil berjaya dikemas kini!' });
        } else {
            setStatus({ type: 'error', message: `Gagal: ${result.message}` });
        }
        
        setTimeout(() => setStatus({ type: 'idle', message: '' }), 4000);
    };

    const isDarkMode = theme === 'dark';
    const toggleTheme = () => setTheme(isDarkMode ? 'light' : 'dark');
    const accountStatus = getAccountStatus(currentUser);

    return (
        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-6">Profil Pengguna</h2>

            <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Status Akaun: <span className={`font-bold ${accountStatus.colorClass}`}>{accountStatus.text}</span>
                    {currentUser.status === 'trial' && currentUser.subscriptionExpiry && (
                        <TrialCountdownDisplay expiry={currentUser.subscriptionExpiry} />
                    )}
                </p>
            </div>
           
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Mod Gelap</h3>
                     <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {isDarkMode ? 'Nikmati antara muka yang lebih gelap.' : 'Tukar ke antara muka yang lebih terang.'}
                    </p>
                </div>
                <label htmlFor="dark-mode-toggle" className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="dark-mode-toggle" className="sr-only peer" checked={isDarkMode} onChange={toggleTheme}/>
                    <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
            </div>

            <hr className="my-8 border-gray-200 dark:border-gray-700/50" />

            <div className="space-y-6">
                
                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Nama Penuh</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-white dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Alamat E-mel</label>
                    <input type="email" value={email} readOnly disabled className="w-full bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none transition cursor-not-allowed" />
                    <p className="text-xs text-gray-400 mt-1">Mengubah e-mel tidak disokong pada masa ini.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleSave} className="bg-primary-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors">
                        Simpan Perubahan
                    </button>
                    {status.message && (
                        <p className={`text-sm ${status.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{status.message}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const ApiKeyPanel: React.FC<{ currentUser: User, onUserUpdate: (user: User) => void }> = ({ currentUser, onUserUpdate }) => {
    const [apiKey, setApiKey] = useState('');
    const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error' | 'loading'; message: string }>({ type: 'idle', message: '' });

    const handleSave = async () => {
        setStatus({ type: 'loading', message: 'Mengesahkan API Key...' });
        const result = await verifyAndSaveUserApiKey(currentUser.id, apiKey);

        // FIX: Added a type guard to correctly handle the discriminated union return type from `verifyAndSaveUserApiKey`.
        if (result.success) {
            setStatus({ type: 'success', message: `API Key berjaya disahkan dan disimpan.` });
            onUserUpdate(result.user); // terus update parent state
            setApiKey(''); // clear input selepas berjaya
        } else {
            setStatus({ type: 'error', message: result.message });
        }
    };
    
    return (
        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg mt-6">
            <h2 className="text-xl font-semibold mb-2">Google Gemini API Key</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {currentUser.role === 'admin'
                    ? "Sebagai admin, API Key anda diperlukan untuk semua ciri AI dan juga akan digunakan untuk pengguna dalam tempoh percubaan."
                    : "Masukkan API Key peribadi anda untuk akses seumur hidup kepada semua ciri."
                }
                Anda boleh mendapatkan kunci anda dari <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">Google AI Studio</a>.
            </p>
             {currentUser.apiKey && (
                <p className="text-sm text-green-600 dark:text-green-400 mb-4 p-2 bg-green-500/10 rounded-md">
                    API Key anda sedang aktif: ...{currentUser.apiKey.slice(-4)}
                </p>
            )}
            <div className="flex items-center gap-2">
                 <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Masukkan API Key baru di sini untuk mengemas kini"
                    className="flex-grow bg-white dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                />
                 <button 
                    onClick={handleSave} 
                    disabled={status.type === 'loading'} 
                    className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center w-24"
                >
                    {status.type === 'loading' ? <Spinner /> : 'Simpan'}
                </button>
            </div>
             {status.message && (
                <p className={`text-sm mt-2 ${
                    status.type === 'success' ? 'text-green-600' :
                    status.type === 'error' ? 'text-red-500' :
                    'text-gray-500'
                }`}>
                    {status.message}
                </p>
            )}
        </div>
    );
};


const IntegrationPanel: React.FC<{currentUser: User, onUserUpdate: (user: User) => void}> = ({ currentUser, onUserUpdate }) => (
    <div className="space-y-6">
        <GoogleDriveSettings />
        <ApiKeyPanel currentUser={currentUser} onUserUpdate={onUserUpdate} />
        {currentUser.role === 'admin' && <WebhookSettings />}
    </div>
);


const GoogleDriveSettings: React.FC = () => {
    const [clientId, setClientId] = useState(localStorage.getItem('googleClientId') || '');
    const [inputClientId, setInputClientId] = useState(clientId);
    const [isConnected, setIsConnected] = useState(localStorage.getItem('googleDriveConnected') === 'true');
    const [userEmail, setUserEmail] = useState(localStorage.getItem('googleDriveUserEmail') || "");
    const [error, setError] = useState<string | null>(null);
    const tokenClient = useRef<any>(null);
    const accessToken = useRef<string | null>(localStorage.getItem('googleDriveToken'));

    const isClientIdConfigured = clientId && !clientId.startsWith("YOUR_");

    useEffect(() => {
        // Clear previous state if client ID changes
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
                                localStorage.setItem('googleDriveToken', tokenResponse.access_token);
                                
                                fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                    headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
                                })
                                .then(res => res.json())
                                .then(data => {
                                    setUserEmail(data.email);
                                    setIsConnected(true);
                                    localStorage.setItem('googleDriveConnected', 'true');
                                    localStorage.setItem('googleDriveUserEmail', data.email);
                                })
                                .catch(err => {
                                    console.error("Failed to fetch user info", err);
                                    setError("Gagal mendapatkan maklumat pengguna.");
                                    handleDisconnect();
                                });
                            } else {
                                setError("Gagal mendapatkan token akses daripada Google.");
                            }
                        },
                        error_callback: (error: any) => {
                            console.error('Google Auth Error:', error);
                            setError(`Ralat pengesahan Google: ${error.details || 'Sila semak Client ID anda.'}`);
                        }
                    });
                } catch(e) {
                    console.error("Error initializing Google client:", e);
                    setError("Gagal memulakan klien Google. Pastikan Client ID anda sah.");
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
            localStorage.setItem('googleClientId', trimmedId);
            setClientId(trimmedId);
            setError(null);
        } else {
            setError("Sila masukkan Google Client ID yang sah. Ia sepatutnya berakhir dengan '.apps.googleusercontent.com'.");
        }
    };

    const handleConnect = () => {
        setError(null);
        if (tokenClient.current) {
            tokenClient.current.requestAccessToken({ prompt: 'consent' });
        } else {
            setError("Klien Google tidak dapat dimulakan. Sila semak Client ID anda dan muat semula halaman.");
        }
    };

    const handleDisconnect = () => {
        if (accessToken.current && (window as any).google && (window as any).google.accounts.oauth2.revoke) {
            (window as any).google.accounts.oauth2.revoke(accessToken.current, () => {});
        }
        accessToken.current = null;
        setIsConnected(false);
        setUserEmail("");
        localStorage.removeItem('googleDriveConnected');
        localStorage.removeItem('googleDriveUserEmail');
        localStorage.removeItem('googleDriveToken');
    }

    const handleClearClientId = () => {
        handleDisconnect();
        setClientId('');
        setInputClientId('');
        localStorage.removeItem('googleClientId');
        setError(null);
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Penyepaduan Google Drive</h2>
            {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
             <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Sandarkan semua imej dan video yang anda jana secara automatik ke folder dalam Google Drive anda.
            </p>

            {!isClientIdConfigured ? (
                <div className="space-y-4">
                    <div className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-400/10 p-3 rounded-md">
                        <p className="font-semibold">Konfigurasi diperlukan.</p>
                        <p>Sila masukkan Google Client ID anda untuk mengaktifkan penyepaduan Google Drive.</p>
                    </div>
                     <div>
                        <label htmlFor="google-client-id" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Google Client ID</label>
                        <input
                            id="google-client-id"
                            type="text"
                            value={inputClientId}
                            onChange={(e) => setInputClientId(e.target.value)}
                            placeholder="xxxx-xxxx.apps.googleusercontent.com"
                            className="w-full bg-white dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                        />
                    </div>
                    <button onClick={handleSaveClientId} className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors">
                        Simpan & Aktifkan
                    </button>
                </div>
            ) : isConnected ? (
                <div>
                    <p className="text-green-600 dark:text-green-400 font-semibold">Berjaya disambungkan ke Google Drive.</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Disandarkan ke: <span className="font-medium">{userEmail}</span></p>
                    <div className="flex gap-2">
                        <button onClick={handleDisconnect} className="mt-4 bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors text-sm">
                            Putuskan Sambungan
                        </button>
                         <button onClick={handleClearClientId} className="mt-4 bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors text-sm">
                            Tukar Client ID
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm">Client ID disimpan: <code className="text-xs bg-gray-200 dark:bg-gray-700 p-1 rounded">{clientId.substring(0, 20)}...</code></p>
                    <button onClick={handleConnect} className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors">
                        Sambung ke Google Drive
                    </button>
                     <button onClick={handleClearClientId} className="bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors text-sm">
                        Tukar Client ID
                    </button>
                </div>
            )}
        </div>
    );
};

const WebhookSettings: React.FC = () => {
    const WEBHOOK_URL_KEY = '1za7-ai-webhook-url';
    const [inputUrl, setInputUrl] = useState(localStorage.getItem(WEBHOOK_URL_KEY) || '');
    const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

    const handleSave = () => {
        try {
            if (inputUrl.trim()) {
                new URL(inputUrl); // Validate URL format
                localStorage.setItem(WEBHOOK_URL_KEY, inputUrl);
                setStatus({ type: 'success', message: 'URL webhook disimpan!' });
            } else {
                localStorage.removeItem(WEBHOOK_URL_KEY);
                setStatus({ type: 'success', message: 'URL webhook dipadamkan.' });
            }
        } catch (_) {
            setStatus({ type: 'error', message: 'URL tidak sah. Sila masukkan URL yang betul.' });
        }
        setTimeout(() => setStatus({ type: 'idle', message: '' }), 3000);
    };
    
    const handleTest = async () => {
        const savedUrl = localStorage.getItem(WEBHOOK_URL_KEY);
        if (!savedUrl) {
            setStatus({ type: 'error', message: 'Tiada URL webhook disimpan untuk diuji.' });
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
                setStatus({ type: 'success', message: `Ujian berjaya! Dihantar ke URL anda (Status: ${response.status})` });
            } else {
                setStatus({ type: 'error', message: `Ujian gagal. Pelayan webhook membalas dengan status: ${response.status}` });
            }
        } catch (error) {
            console.error("Webhook test failed:", error);
            setStatus({ type: 'error', message: 'Ujian gagal. Semak konsol untuk butiran ralat.' });
        }
    };


    return (
        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg space-y-4">
            <h2 className="text-xl font-semibold">Konfigurasi Webhook</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
                Hantar data pengguna baharu secara automatik ke URL yang ditentukan apabila mereka mendaftar. Berguna untuk integrasi tersuai.
            </p>
            <div>
                <label htmlFor="webhook-url" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    URL Webhook
                </label>
                <input
                    id="webhook-url"
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://your-automation-url.com/webhook"
                    className="w-full bg-white dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                />
            </div>
            <div className="flex items-center gap-2">
                <button onClick={handleSave} className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors">
                    Simpan
                </button>
                <button onClick={handleTest} disabled={!inputUrl.trim()} className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50">
                    Uji Webhook
                </button>
            </div>
            {status.message && (
                <p className={`text-sm ${status.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{status.message}</p>
            )}
        </div>
    );
};


const TutorialManagementPanel: React.FC = () => {
  const [content, setContent] = useState<TutorialContent | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    setContent(getContent());
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContent(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleTutorialChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContent(prev => {
      if (!prev) return null;
      const newTutorials = [...prev.tutorials];
      newTutorials[index] = { ...newTutorials[index], [name]: value };
      return { ...prev, tutorials: newTutorials };
    });
  };

  const handleThumbnailUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setContent(prev => {
          if (!prev) return null;
          const newTutorials = [...prev.tutorials];
          newTutorials[index] = { ...newTutorials[index], thumbnailUrl: dataUrl };
          return { ...prev, tutorials: newTutorials };
        });
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleRemoveThumbnail = (index: number) => {
    setContent(prev => {
      if (!prev) return null;
      const newTutorials = [...prev.tutorials];
      newTutorials[index] = { ...newTutorials[index], thumbnailUrl: "" };
      return { ...prev, tutorials: newTutorials };
    });
  };

  const handleSave = () => {
    if (content) {
      setSaveStatus('saving');
      saveContent(content);
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 500);
    }
  };
  
  if (!content) {
    return <div>Memuatkan editor kandungan...</div>;
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4">Pengurusan Kandungan e-Tutorial</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Kemas kini kandungan yang dipaparkan pada halaman e-Tutorial. Perubahan akan disimpan secara tempatan pada penyemak imbas anda.
        </p>
      </div>

      <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-md">
        <h3 className="font-semibold text-lg">Bahagian Utama</h3>
        <div>
          <label htmlFor="mainVideoUrl" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">URL Video YouTube Utama</label>
          <input
            id="mainVideoUrl"
            name="mainVideoUrl"
            type="text"
            value={content.mainVideoUrl}
            onChange={handleInputChange}
            className="w-full bg-white dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="mainTitle" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Tajuk Utama</label>
          <input
            id="mainTitle"
            name="mainTitle"
            type="text"
            value={content.mainTitle}
            onChange={handleInputChange}
            className="w-full bg-white dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="mainDescription" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Penerangan Utama</label>
          <textarea
            id="mainDescription"
            name="mainDescription"
            rows={3}
            value={content.mainDescription}
            onChange={handleInputChange}
            className="w-full bg-white dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="font-semibold text-lg">Tutorial 1-6</h3>
        {content.tutorials.map((tutorial, index) => (
          <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-md space-y-4">
            <h4 className="font-semibold">Tutorial {index + 1}</h4>
            <div>
              <label htmlFor={`title-${index}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tajuk</label>
              <input
                id={`title-${index}`}
                name="title"
                type="text"
                value={tutorial.title}
                onChange={(e) => handleTutorialChange(index, e)}
                className="w-full bg-white dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor={`description-${index}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Penerangan</label>
              <textarea
                id={`description-${index}`}
                name="description"
                rows={2}
                value={tutorial.description}
                onChange={(e) => handleTutorialChange(index, e)}
                className="w-full bg-white dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
             <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Gambar Kecil</label>
                <div className="flex items-center gap-4">
                    <div className="w-32 h-20 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center overflow-hidden">
                        {tutorial.thumbnailUrl ? (
                            <img src={tutorial.thumbnailUrl} alt={`Gambar kecil untuk ${tutorial.title}`} className="w-full h-full object-cover" />
                        ) : (
                            <ImageIcon className="w-8 h-8 text-gray-500" />
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="cursor-pointer bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors">
                            Tukar Gambar
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleThumbnailUpload(index, e)}/>
                        </label>
                        {tutorial.thumbnailUrl && (
                            <button 
                              onClick={() => handleRemoveThumbnail(index)} 
                              className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-xs font-semibold text-left p-0 bg-transparent border-none"
                            >
                                Padam
                            </button>
                        )}
                    </div>
                </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={handleSave} 
          disabled={saveStatus === 'saving'}
          className="bg-primary-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {saveStatus === 'saving' ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
        {saveStatus === 'saved' && <p className="text-sm text-green-600">Perubahan telah disimpan!</p>}
      </div>
    </div>
  );
};


export default SettingsView;