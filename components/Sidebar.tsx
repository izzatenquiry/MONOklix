

import React from 'react';
import { type View, type NavItem, type User } from '../types';
import {
  ChatIcon, ImageIcon, VideoIcon, StoreIcon, StarIcon,
  TikTokIcon, CameraIcon, SettingsIcon, BookOpenIcon, LogoutIcon, GalleryIcon, LogoIcon, XIcon, FilmIcon
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
  { id: 'chat', label: '1za7-GPT', section: 'free', icon: ChatIcon },
  { id: 'image-generation', label: 'Jana Imej', section: 'free', icon: ImageIcon },
  { id: 'video-generation', label: 'Jana Video', section: 'free', icon: VideoIcon },
  { id: 'product-ad', label: 'Jana StoryLine', section: 'free', icon: StoreIcon },
  { id: 'product-review', label: 'Ulasan Produk', section: 'free', icon: StarIcon },
  { id: 'tiktok-affiliate', label: 'Foto Model', section: 'ugc', icon: TikTokIcon },
  { id: 'product-photo', label: 'Foto Produk', section: 'ugc', icon: CameraIcon },
  { id: 'video-combiner', label: 'Gabung Video', section: 'ugc', icon: FilmIcon },
  { id: 'gallery', label: 'Galeri', section: 'ugc', icon: GalleryIcon },
  { id: 'settings', label: 'Tetapan', section: 'bottom', icon: SettingsIcon },
  { id: 'logout', label: 'Log Keluar', section: 'bottom', icon: LogoutIcon },
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
      {title && <h3 className="px-3 pt-4 pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</h3>}
      <ul className="space-y-1">
        {filteredItems.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 text-left text-sm ${
                activeView === item.id
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span className="flex-1 font-medium">{item.label}</span>
              {item.isNew && <span className="text-xs bg-primary-500/20 text-primary-400 font-bold px-2 py-0.5 rounded-full">Baru!</span>}
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
        className={`w-72 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 p-4 flex flex-col transition-transform duration-300 ease-in-out z-40
                   lg:relative lg:translate-x-0
                   fixed inset-y-0 left-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-6 flex items-center justify-between">
           <div className="flex items-center gap-2">
            <LogoIcon className="w-28 text-gray-800 dark:text-gray-200" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI</h1>
          </div>
          <button onClick={onClose} className="lg:hidden p-2" aria-label="Tutup menu">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          <button 
            onClick={() => handleItemClick('e-course')}
            className={`w-full p-3 rounded-lg border text-left mb-4 transition-colors ${
              activeView === 'e-course' 
                ? 'border-primary-500 bg-primary-500/10 text-primary-400' 
                : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50'
            }`}
          >
            <div className="flex items-center">
              <BookOpenIcon className="w-5 h-5 mr-3" />
              <div>
                <p className="font-bold">e-Tutorial</p>
                <p className="text-xs text-primary-500">Cara guna 1za7.my</p>
              </div>
            </div>
          </button>
          
          {renderSection('free', 'AI Agent')}
          {renderSection('ugc', 'Kandungan UGC')}
        </div>
        
        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800">
          {renderSection('bottom')}
          <p className="mt-4 text-center text-gray-500 dark:text-gray-600 text-xs">© 2025 1za7.my AI</p>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;