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
    return <div className="text-center p-10">Memuatkan kandungan tutorial...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <div>
        <h1 className="text-3xl font-bold">e-Tutorial: Cara guna 1za7.my</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Panduan lengkap dan alatan untuk menggunakan platform 1za7.my dengan berkesan.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-gray-100 dark:bg-gray-800/50 p-6 rounded-lg">
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
          <p className="text-gray-600 dark:text-gray-300">{content.mainDescription}</p>
          <button className="bg-primary-500 text-white font-semibold py-2 px-5 rounded-lg hover:bg-primary-600 transition-colors">
            Ketahui Lebih Lanjut
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6 border-l-4 border-primary-500 pl-4">Video Tutorial</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.tutorials.map((tutorial, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-5 flex flex-col">
              <div className="flex-1">
                <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-md mb-4 flex items-center justify-center font-semibold text-gray-500 overflow-hidden">
                   {tutorial.thumbnailUrl ? (
                    <img src={tutorial.thumbnailUrl} alt={tutorial.title} className="w-full h-full object-cover" />
                  ) : (
                    <span>Tutorial {index + 1}</span>
                  )}
                </div>
                <h3 className="font-bold text-lg mb-2">{tutorial.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{tutorial.description}</p>
              </div>
              <a href="#" className="text-primary-500 font-semibold mt-4 text-sm hover:underline">Ketahui lebih lanjut...</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ECourseView;
