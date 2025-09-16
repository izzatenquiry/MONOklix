import { type TutorialContent } from '../types';

const CONTENT_KEY = '1za7-ai-tutorial-content';

const defaultContent: TutorialContent = {
  mainVideoUrl: 'https://www.youtube.com/embed/EbXYHeQWaG0',
  mainTitle: 'Selamat Datang ke Tutorial 1za7.my AI',
  mainDescription: 'Selamat datang! Video ini adalah pengenalan anda kepada platform 1za7.my AI. Fahami gambaran keseluruhan, ciri-ciri hebat, dan bagaimana untuk memulakan projek kreatif anda dengan bantuan AI.',
  tutorials: [
    { title: "Pengenalan kepada 1za7.my AI", description: "Jelajah pantas antara muka platform, ciri utama dan cara untuk bermula dengan projek AI pertama anda.", thumbnailUrl: "" },
    { title: "Menguasai Penjanaan Imej", description: "Belajar cara menulis gesa yang berkesan untuk menjana imej yang menakjubkan, menggunakan imej rujukan dan melaraskan nisbah aspek.", thumbnailUrl: "" },
    { title: "Dari Teks ke Video dalam Minit", description: "Panduan langkah demi langkah untuk menggunakan penjana video AI kami, daripada menulis gesa hingga memuat turun karya sinematik anda.", thumbnailUrl: "" },
    { title: "Tips Copywriting Produk", description: "Ketahui cara untuk mendapatkan hasil terbaik daripada alat copywriting kami untuk mencipta papan cerita iklan yang menarik.", thumbnailUrl: "" },
    { title: "Menguruskan Sejarah & Tetapan", description: "Ketahui cara mengakses, menyemak dan mengurus semua kandungan janaan anda dari panel Sejarah dalam Tetapan.", thumbnailUrl: "" }
    { title: "Menguruskan Sejarah & Tetapan", description: "Ketahui cara mengakses, menyemak dan mengurus semua kandungan janaan anda dari panel Sejarah dalam Tetapan.", thumbnailUrl: "" }
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