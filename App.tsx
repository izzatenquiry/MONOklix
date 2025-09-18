import React, { useState, useEffect } from 'react';
import { type View, type User } from './types';
import Sidebar from './components/Sidebar';
import AiTextSuiteView from './components/views/AiTextSuiteView';
import AiImageSuiteView from './components/views/AiImageSuiteView';
import AiVideoSuiteView from './components/views/AiVideoSuiteView';
import ECourseView from './components/views/ECourseView';
import SettingsView from './components/views/SettingsView';
import AdminDashboardView from './components/views/AdminDashboardView';
import ETutorialAdminView from './components/views/ETutorialAdminView';
import LoginPage from './components/LoginPage';
import GalleryView from './components/views/GalleryView';
import WelcomeAnimation from './components/WelcomeAnimation';
import LibraryView from './components/views/LibraryView';
import { MenuIcon, LogoIcon, XIcon } from './components/Icons';
import { getUserProfile, signOutUser, checkAndDeactivateTrialUser, getTrialApiKey } from './services/userService';
import { setActiveApiKey } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import Spinner from './components/common/Spinner';
import { loadData, saveData } from './services/indexedDBService';


interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

const App: React.FC = () => {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>('e-course');
  const [theme, setTheme] = useState('light'); // Default to light, load async
  const [videoGenPreset, setVideoGenPreset] = useState<VideoGenPreset | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isShowingWelcome, setIsShowingWelcome] = useState(false);

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
            if (currentUser.status === 'trial') {
                // Trial users use the admin's API key.
                const trialKey = await getTrialApiKey();
                setActiveApiKey(trialKey);
            } else {
                // Lifetime, Admin, and Inactive users use their own saved API key.
                // If they don't have one, AI features will be blocked by other logic,
                // or API calls will fail gracefully.
                setActiveApiKey(currentUser.apiKey || null);
            }
        } else {
            // No user, no key.
            setActiveApiKey(null);
        }
    };
    
    configureApiKey();
  }, [currentUser]);

  useEffect(() => {
    // This listener handles session logic on initial load and auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          let profile = await getUserProfile(session.user.id);
          if (profile) {
            profile = await checkAndDeactivateTrialUser(profile);
            setCurrentUser(profile);
          } else {
            // This case might happen if a user exists in auth but not in the public.users table.
            console.error("User profile not found for active session.");
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
        setSessionChecked(true);
      }
    );
  
    // Cleanup the subscription when the component unmounts
    return () => {
      subscription?.unsubscribe();
    };
  }, []);


  const handleLoginSuccess = (user: User) => {
    // The onAuthStateChange listener will also set the user, but we do it here
    // for an immediate UI update and to trigger the welcome animation.
    setCurrentUser(user);
    setIsShowingWelcome(true);
  };

  const handleLogout = async () => {
    await signOutUser();
    // onAuthStateChange will handle setting currentUser to null
    setActiveView('e-course');
  };

  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    // No need for setLocalUser, Supabase session is the source of truth
  };

  const handleCreateVideoFromImage = (preset: VideoGenPreset) => {
    setVideoGenPreset(preset);
    setActiveView('ai-video-suite');
  };

  const renderView = () => {
    switch (activeView) {
      case 'e-course':
        return <ECourseView />;
      case 'ai-text-suite':
        return <AiTextSuiteView />;
      case 'ai-image-suite':
        return <AiImageSuiteView onCreateVideo={handleCreateVideoFromImage} />;
      case 'ai-video-suite':
        return <AiVideoSuiteView preset={videoGenPreset} clearPreset={() => setVideoGenPreset(null)} />;
      case 'gallery':
        return <GalleryView onCreateVideo={handleCreateVideoFromImage} />;
      case 'library':
        return <LibraryView />;
      case 'settings':
          return <SettingsView theme={theme} setTheme={setTheme} currentUser={currentUser!} onUserUpdate={handleUserUpdate} />;
      case 'user-database':
          return <AdminDashboardView />;
      case 'e-tutorial-admin':
          return <ETutorialAdminView />;
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
        setActiveView('e-course'); // Go to e-tutorial page
    }} />;
  }
  
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // --- Access Control Logic ---
  let isBlocked = false;
  let blockMessage = { title: '', body: '' };

  // Define which views are considered AI-powered and require an API key
  const aiPoweredViews: View[] = ['ai-text-suite', 'ai-image-suite', 'ai-video-suite'];

  if (aiPoweredViews.includes(activeView)) {
      const isTrial = currentUser.status === 'trial';
      const hasPersonalKey = !!currentUser.apiKey;

      // Block access if the user is NOT on a trial AND does not have their own API key.
      if (!isTrial && !hasPersonalKey) {
          isBlocked = true;
          if (currentUser.status === 'inactive') {
              // Specific message for expired trials
              blockMessage = {
                  title: 'Account Inactive',
                  body: 'Your trial period has expired. Please update your Gemini API Key in the Settings page to unlock lifetime access to all AI features.',
              };
          } else {
              // Generic message for anyone without a key (admin, lifetime user, etc.)
              blockMessage = {
                  title: 'API Key Required',
                  body: 'To use this AI feature, you must provide your own Gemini API Key on the Settings page.',
              };
          }
      }
  }


  const PageContent = isBlocked ? (
    <div className="flex items-center justify-center h-full p-4">
      <div className="text-center p-8 sm:p-12 max-w-lg bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/50">
          <XIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 className="mt-5 text-2xl font-bold text-neutral-800 dark:text-white">{blockMessage.title}</h2>
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
      <main className="flex-1 flex flex-col overflow-hidden">
         {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 sticky top-0 z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2" aria-label="Open menu">
            <MenuIcon className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <LogoIcon className="w-20 text-neutral-800 dark:text-neutral-200" />
            <span className="font-bold text-lg">AI</span>
          </div>
          <div className="w-10"></div> {/* Spacer */}
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {PageContent}
        </div>
      </main>
    </div>
  );
};

export default App;