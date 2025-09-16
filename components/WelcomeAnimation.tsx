import React, { useEffect } from 'react';
import { LogoIcon } from './Icons';

interface WelcomeAnimationProps {
  onAnimationEnd: () => void;
}

const WelcomeAnimation: React.FC<WelcomeAnimationProps> = ({ onAnimationEnd }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onAnimationEnd();
    }, 2000); // Must match animation duration

    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="text-center animate-zoomIn">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 mb-4">Welcome Back!</h1>
        <LogoIcon className="w-64 mx-auto text-gray-800 dark:text-gray-200" />
      </div>
    </div>
  );
};

export default WelcomeAnimation;
