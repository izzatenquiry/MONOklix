import React, { useState, useEffect } from 'react';
import { type View, type User } from './types';
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
import AiSupportView from './components/views/AiSupportView';
import { MenuIcon, LogoIcon, XIcon, CreditCardIcon } from './components/Icons';
import { signOutUser } from './services/userService';
import { setActiveApiKey } from './services/geminiService';
import Spinner from './components/common/Spinner';
import { loadData, saveData } from './services/indexedDBService';


interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface ImageEditPreset {
  base64: string;
  mimeType: string;
}

const App: React.FC = () => {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>('e-course');
  const [theme, setTheme] = useState('light'); // Default to light, load async
  const [videoGenPreset, setVideoGenPreset] = useState<VideoGenPreset | null>(null);
  const [imageToReEdit, setImageToReEdit] = useState<ImageEditPreset | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isShowingWelcome, setIsShowingWelcome] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
        const savedTheme = await loadData<string>('theme');
        if (savedTheme) {
            setTheme(savedTheme);
        }
    };
    loadTheme();
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

  // Effect to manage the active API key for the session
  useEffect(() => {
    const configureApiKey = async () => {
        if (currentUser) {
            // All users (lifetime, admin) use their own saved API key.
            // If they don't have one, AI features will be blocked by other logic.
            setActiveApiKey(currentUser.apiKey || null);
        } else {
            // No user, no key.
            setActiveApiKey(null);
        }
    };
    
    configureApiKey();
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

  const handleCreateVideoFromImage = (preset: VideoGenPreset) => {
    setVideoGenPreset(preset);
    setActiveView('ai-video-suite');
  };

  const handleReEditImage = (preset: ImageEditPreset) => {
    setImageToReEdit(preset);
    setActiveView('ai-image-suite');
  };

  const renderView = () => {
    switch (activeView) {
      case 'e-course':
        return <ECourseView />;
      case 'ai-text-suite':
        return <AiTextSuiteView />;
      case 'ai-image-suite':
        return <AiImageSuiteView 
                  onCreateVideo={handleCreateVideoFromImage} 
                  onReEdit={handleReEditImage}
                  imageToReEdit={imageToReEdit}
                  clearReEdit={() => setImageToReEdit(null)}
                />;
      case 'ai-video-suite':
        return <AiVideoSuiteView 
                  preset={videoGenPreset} 
                  clearPreset={() => setVideoGenPreset(null)}
                  onCreateVideo={handleCreateVideoFromImage}
                  onReEdit={handleReEditImage}
                />;
      case 'gallery':
        return <GalleryView onCreateVideo={handleCreateVideoFromImage} onReEdit={handleReEditImage} />;
      case 'library':
        return <LibraryView />;
      case 'settings':
          return <SettingsView theme={theme} setTheme={setTheme} currentUser={currentUser!} onUserUpdate={handleUserUpdate} />;
      case 'ai-support':
          return <AiSupportView />;
      default:
        return <ECourseView />;
    }
  };
  
  if (!sessionChecked) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900">
              <Spinner />
          </div>
      );
  }

  // Show welcome animation first if triggered
  if (isShowingWelcome) {
    return <WelcomeAnimation onAnimationEnd={() => {
        setIsShowingWelcome(false);
        setActiveView('e-course'); // Go to default page
    }} />;
  }
  
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // --- Access Control Logic ---
  let isBlocked = false;
  let blockMessage = { title: '', body: '' };

  // Define which views are considered AI-powered and require an API key
  const aiPoweredViews: View[] = ['ai-text-suite', 'ai-image-suite', 'ai-video-suite', 'ai-support'];

  if (aiPoweredViews.includes(activeView)) {
      const hasPersonalKey = !!currentUser.apiKey;

      if (!hasPersonalKey) {
          isBlocked = true;
          blockMessage = {
              title: 'API Key Required',
              body: 'To use AI features, please provide your own Gemini API Key on the Settings page.',
          };
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
      />
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile Header */}
        <header className="lg:hidden grid grid-cols-3 items-center p-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 sticky top-0 z-10">
          {/* Left Column */}
          <div className="flex justify-start">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2" aria-label="Open menu">
              <MenuIcon className="w-6 h-6" />
            </button>
          </div>
          {/* Center Column */}
          <div className="flex justify-center items-center gap-2">
            <LogoIcon className="w-20 text-neutral-800 dark:text-neutral-200" />
            <span className="font-bold text-lg">.com</span>
          </div>
          {/* Right Column (empty for balance) */}
          <div />
        </header>
        <div className="flex-1 p-4 md:p-8">
          {PageContent}
        </div>
      </main>
    </div>
  );
};

export default App;