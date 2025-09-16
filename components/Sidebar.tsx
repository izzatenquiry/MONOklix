import React from 'react';
import { type View, type NavItem, type User } from '../types';
import {
  ChatIcon, ImageIcon, VideoIcon, StoreIcon, StarIcon,
  TikTokIcon, CameraIcon, SettingsIcon, BookOpenIcon, LogoutIcon, GalleryIcon, LogoIcon, XIcon, FilmIcon, MicIcon, MegaphoneIcon,
  ScissorsIcon, WandIcon, TrendingUpIcon
} from './Icons';

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
  onLogout: () => Promise<void>;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
}

const navItems: NavItem[] = [
  { id: 'chat', label: 'Chat GPT', section: 'free', icon: ChatIcon },
  { id: 'content-ideas', label: 'Content Ideas Generator', section: 'free', icon: TrendingUpIcon },
  { id: 'marketing-copy', label: 'Copywriting Generator', section: 'free', icon: MegaphoneIcon },
  { id: 'image-enhancer', label: 'Image Enhancer', section: 'free', icon: WandIcon },
  { id: 'image-generation', label: 'Image Generation', section: 'free', icon: ImageIcon },
  { id: 'background-remover', label: 'Image Background Remover', section: 'free', icon: ScissorsIcon },
  { id: 'product-photo', label: 'Image Product Photos', section: 'free', icon: CameraIcon },
  { id: 'tiktok-affiliate', label: 'Image Model Photos', section: 'free', icon: TikTokIcon },
  { id: 'product-ad', label: 'Video Storyline Generator', section: 'free', icon: StoreIcon },
  { id: 'product-review', label: 'Video Storyboard Generator', section: 'free', icon: StarIcon },  
  { id: 'video-generation', label: 'Video Generation', section: 'free', icon: VideoIcon },
  { id: 'video-combiner', label: 'Video Combiner', section: 'free', icon: FilmIcon },
  { id: 'voice-studio', label: 'Voice Studio', section: 'free', icon: MicIcon },
  { id: 'gallery', label: 'Image Gallery', section: 'bottom', icon: GalleryIcon },
  { id: 'settings', label: 'Settings', section: 'bottom', icon: SettingsIcon },
  { id: 'logout', label: 'Log Out', section: 'bottom', icon: LogoutIcon }
];

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, onLogout, currentUser, isOpen, onClose }) => {

  const handleItemClick = async (viewId: View | 'logout') => {
    if (viewId === 'logout') {
      await onLogout();
    } else {
      setActiveView(viewId as View);
    }
    // Close sidebar on item click for mobile experience
    if (isOpen) {
      onClose();
    }
  };

  const renderSection = (section: NavItem['section'], title?: string) => {
    const filteredItems = navItems.filter(item => {
        if (item.section !== section) return false;
        if (item.roles && !item.roles.includes(currentUser.role)) return false;
        
        return true;
    });

    if (filteredItems.length === 0) return null;

    return (
    <div>
      {title && <h3 className="px-3 pt-4 pb-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{title}</h3>}
      <ul className="space-y-1">
        {filteredItems.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 text-left text-sm ${
                activeView === item.id
                  ? 'bg-primary-600 text-white shadow'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span className="flex-1 font-medium">{item.label}</span>
              {item.isNew && <span className="text-xs bg-primary-500/20 text-primary-500 dark:text-primary-400 font-bold px-2 py-0.5 rounded-full">New!</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
    );
  }

  return (
    <>
      {/* Overlay for mobile */}
      <div 
        className={`fixed inset-0 bg-black/60 z-30 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <nav 
        className={`w-72 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 p-4 flex flex-col transition-transform duration-300 ease-in-out z-40
                   lg:relative lg:translate-x-0
                   fixed inset-y-0 left-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-6 flex items-center justify-between">
           <div className="flex items-center gap-2">
            <LogoIcon className="w-28 text-neutral-800 dark:text-neutral-200" />
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">AI</h1>
          </div>
          <button onClick={onClose} className="lg:hidden p-2" aria-label="Close menu">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          <button 
            onClick={() => handleItemClick('e-course')}
            className={`w-full p-3 rounded-lg border text-left mb-4 transition-colors ${
              activeView === 'e-course' 
                ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400' 
                : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/50'
            }`}
          >
            <div className="flex items-center">
              <BookOpenIcon className="w-5 h-5 mr-3" />
              <div>
                <p className="font-bold">e-Tutorial</p>
                <p className="text-xs text-primary-600 dark:text-primary-400">How to use 1za7.my</p>
              </div>
            </div>
          </button>
          
          {renderSection('free', 'AI Agent')}
          {renderSection('ugc', 'UGC Content')}
        </div>
        
        <div className="mt-auto pt-4 border-t border-neutral-200 dark:border-neutral-800">
          {renderSection('bottom')}
          <p className="mt-4 text-center text-neutral-500 dark:text-neutral-600 text-xs">© 2025 1za7.my AI</p>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;