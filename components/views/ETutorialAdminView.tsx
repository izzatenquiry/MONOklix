import React, { useState, useEffect } from 'react';
import { type TutorialContent } from '../../types';
import { getContent, saveContent } from '../../services/contentService';
import { ImageIcon } from '../Icons';

const TutorialManagementPanel: React.FC = () => {
  const [content, setContent] = useState<TutorialContent | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    const fetchContent = async () => {
        const loadedContent = await getContent();
        setContent(loadedContent);
    };
    fetchContent();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContent(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleTutorialChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContent(prev => {
      if (!prev) return null;
      const newTutorials = [...prev.tutorials];
      newTutorials[index] = { ...newTutorials[index], [name]: value };
      return { ...prev, tutorials: newTutorials };
    });
  };

  const handleThumbnailUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setContent(prev => {
          if (!prev) return null;
          const newTutorials = [...prev.tutorials];
          newTutorials[index] = { ...newTutorials[index], thumbnailUrl: dataUrl };
          return { ...prev, tutorials: newTutorials };
        });
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleRemoveThumbnail = (index: number) => {
    setContent(prev => {
      if (!prev) return null;
      const newTutorials = [...prev.tutorials];
      newTutorials[index] = { ...newTutorials[index], thumbnailUrl: "" };
      return { ...prev, tutorials: newTutorials };
    });
  };

  const handleSave = async () => {
    if (content) {
      setSaveStatus('saving');
      await saveContent(content);
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 500);
    }
  };
  
  if (!content) {
    return <div>Loading content editor...</div>;
  }

  return (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg space-y-8 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold mb-4">e-Tutorial Content Management</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Update the content displayed on the e-Tutorial page. Changes are saved locally to your browser.
        </p>
      </div>

      <div className="space-y-4 p-4 border border-neutral-200 dark:border-neutral-700 rounded-md">
        <h3 className="font-semibold text-lg">Main Section</h3>
        <div>
          <label htmlFor="mainVideoUrl" className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Main YouTube Video URL</label>
          <input
            id="mainVideoUrl"
            name="mainVideoUrl"
            type="text"
            value={content.mainVideoUrl}
            onChange={handleInputChange}
            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="mainTitle" className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Main Title</label>
          <input
            id="mainTitle"
            name="mainTitle"
            type="text"
            value={content.mainTitle}
            onChange={handleInputChange}
            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="mainDescription" className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Main Description</label>
          <textarea
            id="mainDescription"
            name="mainDescription"
            rows={3}
            value={content.mainDescription}
            onChange={handleInputChange}
            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="font-semibold text-lg">Tutorials 1-6</h3>
        {content.tutorials.map((tutorial, index) => (
          <div key={index} className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-md space-y-4">
            <h4 className="font-semibold">Tutorial {index + 1}</h4>
            <div>
              <label htmlFor={`title-${index}`} className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Title</label>
              <input
                id={`title-${index}`}
                name="title"
                type="text"
                value={tutorial.title}
                onChange={(e) => handleTutorialChange(index, e)}
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor={`description-${index}`} className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Description</label>
              <textarea
                id={`description-${index}`}
                name="description"
                rows={2}
                value={tutorial.description}
                onChange={(e) => handleTutorialChange(index, e)}
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
             <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Thumbnail</label>
                <div className="flex items-center gap-4">
                    <div className="w-32 h-20 bg-neutral-200 dark:bg-neutral-700 rounded flex items-center justify-center overflow-hidden">
                        {tutorial.thumbnailUrl ? (
                            <img src={tutorial.thumbnailUrl} alt={`Thumbnail for ${tutorial.title}`} className="w-full h-full object-cover" />
                        ) : (
                            <ImageIcon className="w-8 h-8 text-neutral-500" />
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="cursor-pointer bg-white dark:bg-neutral-600 text-neutral-700 dark:text-neutral-200 px-3 py-1.5 rounded-md text-xs font-semibold border border-neutral-300 dark:border-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-500 transition-colors">
                            Change Image
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleThumbnailUpload(index, e)}/>
                        </label>
                        {tutorial.thumbnailUrl && (
                            <button 
                              onClick={() => handleRemoveThumbnail(index)} 
                              className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-xs font-semibold text-left p-0 bg-transparent border-none"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={handleSave} 
          disabled={saveStatus === 'saving'}
          className="bg-primary-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
        </button>
        {saveStatus === 'saved' && <p className="text-sm text-green-600">Changes have been saved!</p>}
      </div>
    </div>
  );
};

const ETutorialAdminView: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">e-Tutorial Settings</h1>
            <TutorialManagementPanel />
        </div>
    );
};

export default ETutorialAdminView;
