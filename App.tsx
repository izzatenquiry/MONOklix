import React, { useState, useEffect, useCallback } from 'react';
import { type View, type User, type Language } from './types';
import Sidebar from './components/Sidebar';
import AiTextSuiteView from './components/views/AiTextSuiteView';
import AiImageSuiteView from './components/views/AiImageSuiteView';
import AiVideoSuiteView from './components/views/AiVideoSuiteView';
import ECourseView from './components/views/ECourseView';
import SettingsView from './components/views/SettingsView';
import LoginPage from './LoginPage';
import GalleryView from './components/views/GalleryView';
import WelcomeAnimation from './components/WelcomeAnimation';
import LibraryView from './components/views/LibraryView';
import { MenuIcon, LogoIcon, XIcon } from './components/Icons';
import { signOutUser } from './services/userService';
import { setActiveApiKey, createChatSession, streamChatResponse } from './services/geminiService';
import Spinner from './components/common/Spinner';
import { loadData, saveData } from './services/indexedDBService';
import { type Chat } from '@google/genai';
import { getSupportPrompt } from './services/promptManager';
import { triggerUserWebhook } from './services/webhookService';
import GetStartedView from './components/views/GetStartedView';
import { getTranslations } from './services/translations';
import PromptViralMyView from './components/views/PromptViralMyView';

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface ImageEditPreset {
  base64: string;
  mimeType: string;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const LanguageSwitcher: React.FC<{ language: Language; setLanguage: (lang: Language) => void }> = ({ language, setLanguage }) => (
    <div className="flex items-center bg-neutral-200 dark:bg-neutral-800 p-1 rounded-full">
        <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${language === 'en' ? 'bg-white dark:bg-neutral-900 text-primary-600 dark:text-primary-400' : 'text-neutral-600 dark:text-neutral-300'}`}
        >
            EN
        </button>
        <button
            onClick={() => setLanguage('ms')}
            className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${language === 'ms' ? 'bg-white dark:bg-neutral-900 text-primary-600 dark:text-primary-400' : 'text-neutral-600 dark:text-neutral-300'}`}
        >
            MS
        </button>
    </div>
);


const App: React.FC = () => {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>('e-course');
  const [theme, setTheme] = useState('light'); // Default to light, load async
  const [language, setLanguage] = useState<Language>('en');
  const [videoGenPreset, setVideoGenPreset] = useState<VideoGenPreset | null>(null);
  const [imageToReEdit, setImageToReEdit] = useState<ImageEditPreset | null>(null);
  const [imageGenPresetPrompt, setImageGenPresetPrompt] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isShowingWelcome, setIsShowingWelcome] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  const T = getTranslations(language);

  // --- AI Support Chat State ---
  const [aiSupportMessages, setAiSupportMessages] = useState<Message[]>([]);
  const [aiSupportChat, setAiSupportChat] = useState<Chat | null>(null);
  const [isAiSupportLoading, setIsAiSupportLoading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
        const savedTheme = await loadData<string>('theme');
        if (savedTheme) setTheme(savedTheme);

        const savedLang = localStorage.getItem('language') as Language;
        if (savedLang) setLanguage(savedLang);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveData('theme', theme);
  }, [theme]);
  
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);


  // Effect to manage the active API key and initialize dependent services like AI chat.
  // This consolidation prevents a race condition where the chat might initialize before the key is set.
  useEffect(() => {
    if (currentUser) {
        const userApiKey = currentUser.apiKey || null;
        setActiveApiKey(userApiKey);
        
        if (userApiKey) {
            const systemInstruction = getSupportPrompt();
            const session = createChatSession(systemInstruction);
            setAiSupportChat(session);
        } else {
            setAiSupportChat(null);
            setAiSupportMessages([]);
        }
    } else {
        setActiveApiKey(null);
        setAiSupportChat(null);
        setAiSupportMessages([]);
    }
  }, [currentUser]);
  
  // Effect to check for an active session in localStorage on initial load.
  useEffect(() => {
    try {
        const savedUserJson = localStorage.getItem('currentUser');
        if (savedUserJson) {
            const user = JSON.parse(savedUserJson);
            setCurrentUser(user);
        }
    } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        localStorage.removeItem('currentUser');
    }
    setSessionChecked(true);
  }, []);

  useEffect(() => {
    if (justLoggedIn) {
        setIsShowingWelcome(true);
        setJustLoggedIn(false); // Reset the flag
    }
  }, [justLoggedIn]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    setJustLoggedIn(true);
  };

  const handleLogout = async () => {
    await signOutUser();
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setActiveView('e-course');
  };

  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  };
  
  const handleAiSupportSend = useCallback(async (prompt: string) => {
    if (!prompt.trim() || !aiSupportChat || isAiSupportLoading) return;

    const userMessage: Message = { role: 'user', text: prompt };
    setAiSupportMessages((prev) => [...prev, userMessage]);
    setIsAiSupportLoading(true);

    try {
        const stream = await streamChatResponse(aiSupportChat, prompt);
        let modelResponse = '';
        setAiSupportMessages((prev) => [...prev, { role: 'model', text: '...' }]);
        
        for await (const chunk of stream) {
            modelResponse += chunk.text;
            setAiSupportMessages((prev) => {
                const newMessages = [...prev];
                if(newMessages.length > 0) {
                    newMessages[newMessages.length - 1].text = modelResponse;
                }
                return newMessages;
            });
        }
        triggerUserWebhook({ type: 'text', prompt, result: modelResponse });
    } catch (error) {
        console.error('Error sending support message:', error);
        const errorMessageText = error instanceof Error ? error.message : 'An unknown error occurred.';
        const errorMessage: Message = { role: 'model', text: `Sorry, an error occurred: ${errorMessageText}` };
        setAiSupportMessages((prev) => {
            const newMessages = [...prev];
            if (newMessages.length > 0 && newMessages[newMessages.length-1].role === 'model') {
                newMessages[newMessages.length - 1] = errorMessage;
            } else {
                newMessages.push(errorMessage);
            }
            return newMessages;
        });
    } finally {
        setIsAiSupportLoading(false);
    }
  }, [aiSupportChat, isAiSupportLoading]);

  const handleCreateVideoFromImage = (preset: VideoGenPreset) => {
    setVideoGenPreset(preset);
    setActiveView('ai-video-suite');
  };

  const handleReEditImage = (preset: ImageEditPreset) => {
    setImageToReEdit(preset);
    setActiveView('ai-image-suite');
  };

  const handleUsePromptInGenerator = (prompt: string) => {
    setImageGenPresetPrompt(prompt);
    setActiveView('ai-image-suite');
  };

  const renderView = () => {
    const commonProps = { language };
    switch (activeView) {
      case 'e-course':
        return <ECourseView {...commonProps} />;
      case 'get-started':
        return <GetStartedView {...commonProps} />;
      case 'ai-text-suite':
        return <AiTextSuiteView {...commonProps} />;
      case 'ai-image-suite':
        return <AiImageSuiteView 
                  {...commonProps}
                  onCreateVideo={handleCreateVideoFromImage} 
                  onReEdit={handleReEditImage}
                  imageToReEdit={imageToReEdit}
                  clearReEdit={() => setImageToReEdit(null)}
                  presetPrompt={imageGenPresetPrompt}
                  clearPresetPrompt={() => setImageGenPresetPrompt(null)}
                />;
      case 'ai-video-suite':
        return <AiVideoSuiteView 
                  {...commonProps}
                  preset={videoGenPreset} 
                  clearPreset={() => setVideoGenPreset(null)}
                  onCreateVideo={handleCreateVideoFromImage}
                  onReEdit={handleReEditImage}
                />;
      case 'gallery':
        return <GalleryView {...commonProps} onCreateVideo={handleCreateVideoFromImage} onReEdit={handleReEditImage} />;
      case 'library':
        return <LibraryView {...commonProps} onUsePrompt={handleUsePromptInGenerator} />;
      case 'prompt-viral-my':
        return <PromptViralMyView {...commonProps} />;
      case 'settings':
          return <SettingsView 
                    {...commonProps}
                    theme={theme} 
                    setTheme={setTheme} 
                    currentUser={currentUser!} 
                    onUserUpdate={handleUserUpdate} 
                    aiSupportMessages={aiSupportMessages}
                    isAiSupportLoading={isAiSupportLoading}
                    onAiSupportSend={handleAiSupportSend}
                 />;
      default:
        return <ECourseView {...commonProps}/>;
    }
  };
  
  if (!sessionChecked) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900">
              <Spinner />
          </div>
      );
  }

  if (isShowingWelcome) {
    return <WelcomeAnimation onAnimationEnd={() => {
        setIsShowingWelcome(false);
        setActiveView('e-course');
    }} language={language} />;
  }
  
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} language={language} />;
  }

  // --- Access Control Logic ---
  let isBlocked = false;
  let blockMessage = { title: T.apiKeyRequiredTitle, body: T.apiKeyRequiredBody };
  const aiPoweredViews: View[] = ['ai-text-suite', 'ai-image-suite', 'ai-video-suite'];

  if (aiPoweredViews.includes(activeView)) {
      if (!currentUser.apiKey) {
          isBlocked = true;
      }
  }

  const PageContent = isBlocked ? (
    <div className="flex items-center justify-center h-full p-4">
      <div className="text-center p-8 sm:p-12 max-w-lg bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/50">
          <XIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-neutral-800 dark:text-white sm:text-2xl">{blockMessage.title}</h2>
        <p className="mt-2 text-neutral-600 dark:text-neutral-300">{blockMessage.body}</p>
      </div>
    </div>
  ) : renderView();

  return (
    <div className="flex h-screen bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 font-sans">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        onLogout={handleLogout} 
        currentUser={currentUser}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        language={language}
      />
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <header className="grid grid-cols-3 items-center p-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 sticky top-0 z-10">
          <div className="flex justify-start">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 lg:hidden" aria-label="Open menu">
              <MenuIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="flex justify-center items-center">
            <LogoIcon className="w-28 text-neutral-800 dark:text-neutral-200" />
          </div>
          <div className="flex justify-end pr-2">
              <LanguageSwitcher language={language} setLanguage={setLanguage} />
          </div>
        </header>
        <div className="flex-1 p-4 md:p-8">
          {PageContent}
        </div>
      </main>
    </div>
  );
};

export default App;