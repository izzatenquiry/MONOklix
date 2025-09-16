import { type TutorialContent } from '../types';

const CONTENT_KEY = '1za7-ai-tutorial-content';

const defaultContent: TutorialContent = {
  mainVideoUrl: 'https://www.youtube.com/embed/EbXYHeQWaG0',
  mainTitle: 'Welcome to the 1za7.my AI Tutorial',
  mainDescription: 'Welcome! This video is your introduction to the 1za7.my AI platform. Understand the overview, powerful features, and how to get started on your creative projects with the help of AI.',
  tutorials: [
    { title: "Introduction to 1za7.my AI", description: "A quick tour of the platform interface, key features, and how to get started with your first AI project.", thumbnailUrl: "" },
    { title: "Mastering Image Generation", description: "Learn how to write effective prompts to generate stunning images, use reference images, and adjust aspect ratios.", thumbnailUrl: "" },
    { title: "From Text to Video in Minutes", description: "A step-by-step guide to using our AI video generator, from writing a prompt to downloading your cinematic masterpiece.", thumbnailUrl: "" },
   ]
};

export const getContent = (): TutorialContent => {
  try {
    const contentJson = localStorage.getItem(CONTENT_KEY);
    if (contentJson) {
      // Basic validation to merge with default if structure changed
      const savedContent = JSON.parse(contentJson);
      return { ...defaultContent, ...savedContent, tutorials: savedContent.tutorials || defaultContent.tutorials };
    }
    return defaultContent;
  } catch (error) {
    console.error("Failed to parse tutorial content from localStorage:", error);
    return defaultContent;
  }
};

export const saveContent = (content: TutorialContent) => {
  try {
    localStorage.setItem(CONTENT_KEY, JSON.stringify(content));
  } catch (error) {
    console.error("Failed to save tutorial content to localStorage:", error);
  }
};