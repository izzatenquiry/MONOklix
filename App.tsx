import React, { useState, useEffect } from 'react';
import { type View, type User } from './types';
import Sidebar from './components/Sidebar';
import ChatView from './components/views/ChatView';
import ImageGenerationView from './components/views/ImageGenerationView';
import VideoGenerationView from './components/views/VideoGenerationView';
import ProductAdView from './components/views/ProductAdView';
import ProductReviewView from './components/views/ProductReviewView';
import TiktokAffiliateView from './components/views/TiktokAffiliateView';
import ProductPhotoView from './components/views/ProductPhotoView';
import ECourseView from './components/views/ECourseView';
import SettingsView from './components/views/SettingsView';
import LoginPage from './components/LoginPage';
import GalleryView from './components/views/GalleryView';
import WelcomeAnimation from './components/WelcomeAnimation';
import VideoCombinerView from './components/views/VideoCombinerView';
import { MenuIcon, LogoIcon } from './components/Icons';
import { getUserProfile, signOutUser, checkAndDeactivateTrialUser } from './services/userService';
import { setActiveApiKey } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import Spinner from './components/common/Spinner';


interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

const App: React.FC = () => {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>('e-course');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [videoGenPreset, setVideoGenPreset] = useState<VideoGenPreset | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isShowingWelcome, setIsShowingWelcome] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Effect to manage the active API key for the session
  useEffect(() => {
    if (currentUser) {
        // All users, regardless of status, will use their own saved API key.
        // If they don't have one, AI features will be blocked by the UI logic.
        setActiveApiKey(currentUser.apiKey || null);
    } else {
        setActiveApiKey(null);
    }
  }, [currentUser]);

  useEffect(() => {
    // This listener handles session logic on initial load and auth state changes (login/logout)
    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange(
      async (_event: string, session: any) => {
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
    setActiveView('video-generation');
  };

  const renderView = () => {
    switch (activeView) {
      case 'e-course':
        return <ECourseView />;
      case 'chat':
        return <ChatView />;
      case 'image-generation':
        return <ImageGenerationView onCreateVideo={handleCreateVideoFromImage} />;
      case 'video-generation':
        return <VideoGenerationView preset={videoGenPreset} clearPreset={() => setVideoGenPreset(null)} />;
      case 'product-ad':
        return <ProductAdView />;
      case 'product-review':
        return <ProductReviewView />;
      case 'tiktok-affiliate':
        return <TiktokAffiliateView />;
      case 'product-photo':
        return <ProductPhotoView />;
      case 'gallery':
        return <GalleryView onCreateVideo={handleCreateVideoFromImage} />;
      case 'video-combiner':
        return <VideoCombinerView />;
      case 'settings':
          return <SettingsView theme={theme} setTheme={setTheme} currentUser={currentUser!} onUserUpdate={handleUserUpdate} setActiveView={setActiveView} />;
      default:
        return <ECourseView />;
    }
  };
  
  if (!sessionChecked) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
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

  // --- Simplified Access Control Logic ---
  let isBlocked = false;
  let blockMessage = { title: '', body: '' };

  // Views that are always accessible, regardless of API key or status
  const alwaysAllowedViews: View[] = ['e-course', 'settings', 'gallery'];

  if (!alwaysAllowedViews.includes(activeView)) {
      // For any AI-powered view, check for the user's API key first.
      if (!currentUser.apiKey) {
          isBlocked = true;
          if (currentUser.status === 'inactive') {
              // Specific message for expired trials
              blockMessage = {
                  title: 'Akaun Tidak Aktif',
                  body: 'Tempoh percubaan anda telah tamat. Sila update Gemini API Key anda di Tetapan untuk membuka kunci akses seumur hidup kepada semua ciri AI.',
              };
          } else {
              // Generic message for anyone without a key (admin, new trial user, etc.)
              blockMessage = {
                  title: 'API Key Diperlukan',
                  body: 'Untuk menggunakan ciri AI ini, anda mesti menyediakan Gemini API Key anda sendiri di halaman Tetapan.',
              };
          }
      }
      // Note: The previous logic of limiting features for 'trial' users is removed.
      // Now, if a user has a key, they have access. This simplifies the model.
      // The 'trial' status now effectively means "user without a personal API key yet".
  }


  const PageContent = isBlocked ? (
    <div className="flex items-center justify-center h-full">
      <div className="text-center p-10 max-w-lg bg-white dark:bg-black rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold">{blockMessage.title}</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{blockMessage.body}</p>
      </div>
    </div>
  ) : renderView();

  return (
    <div className="flex h-screen bg-white dark:bg-black text-gray-800 dark:text-gray-100 font-sans">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        onLogout={handleLogout} 
        currentUser={currentUser}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-900">
         {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black sticky top-0 z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2" aria-label="Buka menu">
            <MenuIcon className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <LogoIcon className="w-20 text-gray-800 dark:text-gray-200" />
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