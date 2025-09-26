import { type TutorialContent, type PlatformStatus, type Announcement } from '../types';
import { saveData, loadData } from './indexedDBService';

const TUTORIAL_CONTENT_KEY = 'monoklix-ai-tutorial-content';
const PLATFORM_STATUS_KEY = 'monoklix-ai-platform-status';
const ANNOUNCEMENTS_KEY = 'monoklix-ai-announcements';

const defaultTutorialContent: TutorialContent = {
  mainVideoUrl: 'https://www.youtube.com/embed/ankY0Lg8kwQ',
  mainTitle: 'Welcome to the MONOKlix.com Tutorial',
  mainDescription: 'Welcome! This video is your introduction to the MONOKlix.com platform. Understand the overview, powerful features, and how to get started on your creative projects with the help of AI.',
  tutorials: [
    { title: "Introduction to MONOKlix.com", description: "A quick tour of the platform interface, key features, and how to get started with your first AI project.", thumbnailUrl: "" },
    { title: "Mastering Image Generation", description: "Learn how to write effective prompts to generate stunning images, use reference images, and adjust aspect ratios.", thumbnailUrl: "" },
    { title: "From Text to Video in Minutes", description: "A step-by-step guide to using our AI video generator, from writing a prompt to downloading your cinematic masterpiece.", thumbnailUrl: "" },
  ]
};

const defaultPlatformStatus: PlatformStatus = {
    status: 'operational',
    message: 'All services are running smoothly.',
    lastUpdated: new Date().toISOString(),
};

const defaultAnnouncements: Announcement[] = [
    {
        id: 'anno-1',
        title: 'Welcome to the New Platform!',
        content: 'We are excited to launch the all-new MONOKlix.com AI platform. Explore the features and start creating today.',
        category: 'General',
        createdAt: new Date().toISOString(),
    },
];

export const getContent = async (): Promise<TutorialContent> => {
  try {
    const savedContent = await loadData<TutorialContent>(TUTORIAL_CONTENT_KEY);
    if (savedContent) {
      // Basic validation to merge with default if structure changed
      return { ...defaultTutorialContent, ...savedContent, tutorials: savedContent.tutorials || defaultTutorialContent.tutorials };
    }
    return defaultTutorialContent;
  } catch (error) {
    console.error("Failed to parse tutorial content from IndexedDB:", error);
    return defaultTutorialContent;
  }
};

export const saveContent = async (content: TutorialContent) => {
  try {
    await saveData(TUTORIAL_CONTENT_KEY, content);
  } catch (error) {
    console.error("Failed to save tutorial content to IndexedDB:", error);
  }
};

// --- Platform Status and Announcements ---

export const getPlatformStatus = async (): Promise<PlatformStatus> => {
    const savedStatus = await loadData<PlatformStatus>(PLATFORM_STATUS_KEY);
    return savedStatus || defaultPlatformStatus;
};

export const savePlatformStatus = async (status: PlatformStatus) => {
    await saveData(PLATFORM_STATUS_KEY, status);
};

export const getAnnouncements = async (): Promise<Announcement[]> => {
    const savedAnnouncements = await loadData<Announcement[]>(ANNOUNCEMENTS_KEY);
    return savedAnnouncements || defaultAnnouncements;
};

export const saveAnnouncements = async (announcements: Announcement[]) => {
    await saveData(ANNOUNCEMENTS_KEY, announcements);
};
