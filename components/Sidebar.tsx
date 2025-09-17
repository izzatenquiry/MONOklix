import React from 'react';
import { type View, type NavItem, type User } from '../types';
import {
  ChatIcon, ImageIcon, VideoIcon, StoreIcon, StarIcon,
  TikTokIcon, CameraIcon, SettingsIcon, BookOpenIcon, LogoutIcon, GalleryIcon, LogoIcon, XIcon, FilmIcon, MicIcon, MegaphoneIcon,
  ScissorsIcon, WandIcon, TrendingUpIcon, UserIcon, UsersIcon, WebhookIcon, LibraryIcon
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
  { id: 'ai-text-suite', label: 'Chat-GPT', section: 'free', icon: ChatIcon },
  { id: 'ai-image-suite', label: 'Image AI', section: 'free', icon: ImageIcon },
  { id: 'ai-video-suite', label: 'Video & Voice AI', section: 'free', icon: VideoIcon },
  { id: 'library', label: 'Prompt Library', section: 'free', icon: LibraryIcon },
  { id: 'gallery', label: 'Image Gallery', section: 'free', icon: GalleryIcon },
  
  // Admin Section
  { id: 'user-database', label: 'User Database', section: 'admin', icon: UsersIcon, roles: ['admin'] },
  { id: 'e-tutorial-admin', label: 'e-Tutorial Settings', section: 'admin', icon: BookOpenIcon, roles: ['admin'] },
  
  // Bottom Section
  { id: 'user-profile', label: 'User Profile', section: 'bottom', icon: UserIcon, roles: ['admin', 'user'] },
  { id: 'integrations', label: 'Integrations', section: 'bottom', icon: WebhookIcon, roles: ['admin', 'user'] },
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
      {title && <h3 className="px-4 pt-6 pb-2 text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">{title}</h3>}
      <ul className="space-y-2">
        {filteredItems.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 text-left text-sm font-medium hover:translate-x-1 ${
                activeView === item.id
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                  : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 mr-4" />
              <span className="flex-1">{item.label}</span>
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
        className={`w-80 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 p-5 flex flex-col transition-transform duration-300 ease-custom-ease z-40
                   lg:relative lg:translate-x-0
                   fixed inset-y-0 left-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-8 flex items-center justify-between">
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
            className={`w-full p-4 rounded-lg text-left mb-6 transition-all duration-300 transform hover:scale-[1.02] ${
              activeView === 'e-course' 
                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg' 
                : 'bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-900/40 dark:to-indigo-900/40 border border-transparent text-neutral-700 dark:text-neutral-200 hover:shadow-md'
            }`}
          >
            <div className="flex items-center">
              <BookOpenIcon className="w-5 h-5 mr-3" />
              <div>
                <p className="font-bold">e-Tutorial</p>
                <p className={`text-xs ${activeView === 'e-course' ? 'text-white/80' : 'text-primary-600 dark:text-primary-400'}`}>How to use 1za7.my</p>
              </div>
            </div>
          </button>
          
          {renderSection('free', 'AI Agent')}
          {renderSection('ugc', 'UGC Content')}
          {renderSection('admin', 'Admin')}
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