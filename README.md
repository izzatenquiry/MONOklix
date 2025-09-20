
# MONOklix.com - All-in-One AI Platform

MONOklix.com is a comprehensive, web-based AI toolkit designed to streamline content creation for marketers, creators, and businesses. Powered by Google's advanced Gemini API, this platform provides a unified suite of tools for generating and editing text, images, videos, and audio content.

## ✨ Key Features

The application is structured into intuitive suites, each targeting a specific content creation need:

#### 📝 **AI Content Idea Suite**
- **Content Ideas:** Generate trendy and engaging ideas for any topic using Google Search grounding.
- **Marketing Copy:** Craft persuasive copy for social media, ads, and websites.
- **Storyline Generator:** Automatically create compelling video ad concepts from a product image and description.

#### 🖼️ **AI Image Suite**
- **Image Generation:** Create images from text prompts or edit existing images using text commands (powered by `imagen-4.0-generate-001` and `gemini-2.5-flash-image-preview`).
- **Product Photos:** Place product images into professional, AI-generated backgrounds.
- **Model Photos:** Generate realistic model photos for User-Generated Content (UGC) style marketing.
- **Image Enhancer:** Upscale image resolution and enhance colors with a single click.
- **Background Remover:** Instantly remove the background from any image.

#### 📹 **AI Video & Voice Suite**
- **Video Generation:** Create dynamic videos from text prompts and optional reference images (powered by `veo-2.0-generate-001`).
- **Video Storyboard:** Generate a complete 4-scene storyboard with text and AI-generated images for product reviews.
- **Video Combiner:** Merge multiple video clips from your gallery into a single video using client-side FFmpeg.
- **Voice Studio:** Convert text to speech with a variety of voice actors and settings (currently a simulated feature).

#### 🛠️ **Platform & User Features**
- **Admin Dashboard:** Manage all users, update their account status, and perform database backups (import/export JSON).
- **Platform Updates & Status:** An admin-managed panel on the main page to post announcements and display the current operational status of the platform.
- **e-Tutorials:** A content management system for admins to update tutorials and guides for users.
- **AI Support Chat:** An integrated chatbot providing assistance in both English and Bahasa Melayu.
- **Image Gallery:** A centralized location for users to view, download, re-edit, or create videos from their generated images and videos.
- **Prompt Library:** An inspiration library of prompts and use-cases, fetched from an external Markdown file.
- **Webhook Integration:**
    - **Admin Webhook:** Sends new user registration data to a specified URL.
    - **Personal Webhook:** Allows each user to send their generated content automatically to a service like n8n for custom automations.

## 🤖 AI Models Used

The platform leverages a specific set of Google's Gemini models, each chosen for its specific task:

| Model AI                         | Nama Kod            | Use Case                                                                                                    |
| -------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------- |
| `gemini-2.5-flash`               |                     | All text generation, chat, and multimodal understanding. Optimized for speed with `thinkingConfig` disabled.  |
| `gemini-2.5-flash-image-preview` | **Nano Banana**     | All image editing, composition (e.g., product/model photos), enhancement, and background removal tasks.       |
| `imagen-4.0-generate-001`        |                     | High-quality text-to-image generation from scratch.                                                         |
| `veo-2.0-generate-001`           |                     | High-fidelity video generation from text and image prompts.                                                 |

## 💻 Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS
- **AI Integration:** Google Gemini API via `@google/genai` SDK
- **Authentication & User DB:** Supabase
- **Client-Side Storage:** IndexedDB for storing generated content (gallery), logs, and user settings.
- **Video Processing:** FFmpeg.wasm (loaded via CDN for client-side video combining)

## 📂 Project Structure

The project is organized into a clean and maintainable structure:

```
/
├── components/
│   ├── common/         # Reusable components (Spinner, Layouts, etc.)
│   ├── views/          # High-level components for each feature/page
│   ├── Icons.tsx       # SVG icon components
│   └── Sidebar.tsx     # Main navigation sidebar
├── services/           # Business logic, API calls, and storage interactions
│   ├── geminiService.ts  # All calls to the Google Gemini API
│   ├── userService.ts    # User auth, profile management (Supabase)
│   ├── indexedDBService.ts # Low-level IndexedDB operations
│   ├── historyService.ts # Manages the user's content gallery
│   └── ...             # Other services for logs, webhooks, etc.
├── App.tsx             # Main application component, handles routing and state
├── LoginPage.tsx       # User login and registration component
├── types.ts            # Global TypeScript type definitions
├── index.html          # The single HTML entry point
└── index.tsx           # The root React render entry point
```

