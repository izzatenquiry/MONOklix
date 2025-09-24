# MONOklix.com - All-in-One AI Platform

MONOklix.com adalah sebuah platform AI serba lengkap berasaskan web yang direka untuk memudahkan penciptaan kandungan bagi pemasar, pencipta konten, dan usahawan. Dikuasakan oleh API Gemini dari Google, platform ini menyediakan set alatan bersepadu untuk menjana dan menyunting teks, imej, video, serta kandungan audio.

---

## 📖 **Panduan Pengguna**

Untuk panduan lengkap langkah demi langkah bagi setiap ciri dalam Bahasa Melayu, sila rujuk dokumen di bawah:

➡️ **[Buka Panduan Penggunaan Penuh MONOklix.com](./USER_GUIDE.md)** ⬅️

### **Ringkasan Ciri-Ciri Utama:**

*   **📝 AI Content Idea:** Dapatkan idea kandungan sohor kini, tulis teks pemasaran (copywriting), dan jana skrip iklan video secara automatik.
*   **🖼️ AI Image Suite:** Cipta imej asli dari teks, hasilkan gambar produk profesional, jana gambar model UGC (User-Generated Content), tingkatkan kualiti imej, dan buang latar belakang dengan satu klik.
*   **📹 AI Video & Voice Suite:** Hasilkan video dinamik dari teks, rancang papan cerita (storyboard) video ulasan produk, gabungkan klip video, dan tukar teks kepada suara (voice-over) berkualiti tinggi.
*   ** gallery & Perpustakaan:** Semua hasil kerja anda disimpan di dalam galeri peribadi. Dapatkan inspirasi dari koleksi prompt yang telah terbukti berkesan.
*   **⚙️ Tetapan & Automasi:** Urus profil anda, kunci API, dan hantar hasil kerja anda secara automatik ke aplikasi lain menggunakan Webhook peribadi.

---

## 🚀 User Flow

The application features a simplified, streamlined user flow:

1.  **External Registration & Payment:** New users register and pay on an external website (e.g., WooCommerce).
2.  **Automated Account Creation:** A webhook from the payment platform automatically creates a user account in the application's database with `lifetime` status.
3.  **Direct Email Login:** Users log in to the application using only their email address. No password is required.
4.  **Persistent Session:** The application uses `localStorage` to keep users logged in across browser sessions for a seamless experience.
5.  **Bring Your Own API Key (BYOK):** To access the AI features, users must provide their own Google Gemini API Key on the **Settings** page. Access to AI suites is gracefully blocked until a key is provided.

## ✨ Key Features

The application is structured into intuitive suites, each targeting a specific content creation need:

#### 📝 **AI Content Idea Suite**
- **Content Ideas:** Generate trendy and engaging ideas for any topic using Google Search grounding for up-to-date results.
- **Marketing Copy:** Craft persuasive copy for social media, ads, and websites with customizable tones and languages.
- **Storyline Generator:** Automatically create compelling video ad concepts from a product image and description.

#### 🖼️ **AI Image Suite**
- **Image Generation:** Create original images from detailed text prompts.
- **Product Photos:** Place product images into professional, AI-generated backgrounds and settings.
- **Model Photos:** Generate realistic model photos for User-Generated Content (UGC) style marketing, combining a product image with AI.
- **Image Enhancer:** Upscale image resolution and enhance colors with a single click.
- **Background Remover:** Instantly remove the background from any image.

#### 📹 **AI Video & Voice Suite**
- **Video Generation:** Create dynamic videos from text prompts and optional reference images.
- **Video Storyboard:** Generate a complete 4-scene storyboard with text and AI-generated images for product reviews.
- **Video Combiner:** Merge multiple video clips from your gallery into a single video using client-side FFmpeg.
- **Voice Studio:** Convert text to speech with a variety of voice actors and settings using Google's Text-to-Speech API.

#### 🛠️ **Platform & User Features**
- **Centralized Settings:** A single, tab-based hub to manage user profiles, API keys, personal webhooks, and view logs.
- **Admin Dashboard:** (Admin Only) Manage all users, update account status, and perform database backups (import/export JSON).
- **Admin Content Management:** (Admin Only) An interface to update the e-Tutorials, platform status, and announcements displayed to users.
- **e-Tutorials & Platform Status:** The default landing page for users, showing the latest platform announcements and tutorials.
- **AI Support Chat:** An integrated chatbot providing assistance in both English and Bahasa Melayu.
- **Gallery & History:** A centralized location for users to view, download, re-edit, or create videos from their generated content.
- **Prompt Library:** An inspiration library of prompts and use-cases, fetched from an external Markdown file.
- **Personal Webhook:** Allows each user to send their generated content automatically to a service like n8n for custom automations.

## 🤖 AI Models Used

The platform leverages a specific set of Google's Gemini models, each chosen for its specific task:

| Model AI                         | Use Case                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `gemini-2.5-flash`               | All text generation, chat, and multimodal understanding. Optimized for speed with `thinkingConfig` disabled.  |
| `gemini-2.5-flash-image-preview` | All image editing, composition (e.g., product/model photos), enhancement, and background removal tasks.       |
| `imagen-4.0-generate-001`        | High-quality text-to-image generation from scratch.                                                         |
| `veo-3.0-generate-001`           | State-of-the-art video generation for highest quality and audio.                                            |
| `veo-3.0-fast-generate-001`      | A faster version of Veo 3 for quicker results.                                                              |
| `veo-2.0-generate-001`           | High-fidelity video generation from text and image prompts.                                                 |


## 💻 Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS
- **AI Integration:** Google Gemini API via `@google/genai` SDK
- **Backend & User DB:** Supabase (Postgres)
- **Serverless Functions:** Supabase Edge Functions (Deno) for handling webhooks.
- **Client-Side Storage:** IndexedDB for storing generated content (gallery), logs, and some settings.
- **Video Processing:** FFmpeg.wasm (loaded via CDN for client-side video combining)

## 📂 Project Structure

The project is organized into a clean and maintainable structure:

```
/
├── components/
│   ├── common/         # Reusable components (Spinner, Tabs, Layouts, etc.)
│   ├── views/          # High-level components for each feature/page
│   ├── Icons.tsx       # SVG icon components
│   └── Sidebar.tsx     # Main navigation sidebar
├── services/           # Business logic, API calls, and storage interactions
│   ├── geminiService.ts  # All calls to the Google Gemini API
│   ├── userService.ts    # User auth, profile management (Supabase)
│   ├── indexedDBService.ts # Low-level IndexedDB operations
│   ├── historyService.ts # Manages the user's content gallery
│   └── ...             # Other services for logs, webhooks, etc.
├── supabase/           # Configuration and code for Supabase features
│   └── functions/      # Deno-based Edge Functions
├── App.tsx             # Main application component, handles routing and state
├── LoginPage.tsx       # User login component
├── types.ts            # Global TypeScript type definitions
├── index.html          # The single HTML entry point
└── index.tsx           # The root React render entry point
```