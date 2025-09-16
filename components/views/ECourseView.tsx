import React, { useState, useEffect } from 'react';
import { getContent } from '../../services/contentService';
import { type TutorialContent } from '../../types';


const ECourseView: React.FC = () => {
  const [content, setContent] = useState<TutorialContent | null>(null);

  useEffect(() => {
    setContent(getContent());
  }, []);

  if (!content) {
    // You can show a loading spinner here
    return <div className="text-center p-10">Loading tutorial content...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <div>
        <h1 className="text-3xl font-bold">e-Tutorial: How to use 1za7.my</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">A complete guide and tools to use the 1za7.my platform effectively.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
        <div className="aspect-video">
          <iframe 
            className="w-full h-full rounded-md"
            src={content.mainVideoUrl}
            title="YouTube video player" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen>
          </iframe>
        </div>
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">{content.mainTitle}</h2>
          <p className="text-neutral-600 dark:text-neutral-300">{content.mainDescription}</p>
          <button className="bg-primary-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-primary-700 transition-colors">
            Learn More
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6 border-l-4 border-primary-500 pl-4">Video Tutorials</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.tutorials.map((tutorial, index) => (
            <div key={index} className="bg-white dark:bg-neutral-900 rounded-lg p-5 flex flex-col shadow-sm">
              <div className="flex-1">
                <div className="aspect-video bg-neutral-200 dark:bg-neutral-800 rounded-md mb-4 flex items-center justify-center font-semibold text-neutral-500 overflow-hidden">
                   {tutorial.thumbnailUrl ? (
                    <img src={tutorial.thumbnailUrl} alt={tutorial.title} className="w-full h-full object-cover" />
                  ) : (
                    <span>Tutorial {index + 1}</span>
                  )}
                </div>
                <h3 className="font-bold text-lg mb-2">{tutorial.title}</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{tutorial.description}</p>
              </div>
              <a href="#" className="text-primary-600 dark:text-primary-400 font-semibold mt-4 text-sm hover:underline">Learn more...</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ECourseView;