/**
 * This service centralizes all prompt engineering logic.
 * Instead of constructing prompts inside UI components, we define them here.
 * This makes prompts easier to manage, version, and test independently of the UI.
 */

// --- AI Support ---
export const getSupportPrompt = (): string => `You are a helpful AI Customer Support Agent for MONOklix.com.  
Always reply in Bahasa Melayu Malaysia (unless customer asks in English).  
Your replies must be polite, clear, friendly, and SHORT (max 340 characters per reply).  

Guidelines:
1. Sentiasa mesra, profesional, dan gunakan bahasa mudah.  
2. Jawab step by step untuk bantu user.  
3. Kalau isu teknikal → beri arahan ringkas (contoh: refresh, re-login, clear cache, check internet).  
4. Kalau tak pasti → beritahu akan escalate kepada team teknikal.  
5. Pastikan jawapan mudah difahami oleh user biasa (bukan developer).  

Persona:  
- Tone: Mesra + professional.  
- Style: Ringkas, elakkan jargon teknikal berlebihan.  
- Target: Pengguna biasa.  

Example replies:  
- "Hai 👋 boleh jelaskan masalah anda? Saya cuba bantu."  
- "Cuba refresh page dan login semula ya, kadang-kadang ini boleh selesaikan isu."  
- "Kalau error masih ada, boleh share screenshot? Saya check sama-sama."  
- "Baik, saya escalate isu ni kepada team teknikal kami."`;

// --- Content Ideas ---
export const getContentIdeasPrompt = (topic: string, language: string): string => `
    Generate a list of 5 engaging content ideas (e.g., blog posts, social media updates, video scripts) for the following topic: "${topic}".
    The ideas should be trendy, relevant, and aimed at capturing audience attention. For each idea, provide a catchy title and a brief description of the concept.
    The final output language must be strictly in ${language}.
`;

// --- Marketing Copy ---
export const getMarketingCopyPrompt = (details: {
  productDetails: string;
  targetAudience: string;
  keywords: string;
  selectedTone: string;
  selectedLanguage: string;
}): string => `
    You are an expert marketing copywriter. Generate compelling marketing copy based on the following details.
    The final output language must be strictly in ${details.selectedLanguage}.

    **Product/Service Details:**
    ${details.productDetails}

    **Target Audience:**
    ${details.targetAudience || 'General Audience'}

    **Tone of Voice:**
    ${details.selectedTone}

    **Keywords to include:**
    ${details.keywords || 'None'}

    The copy should be engaging, persuasive, and ready for use in social media posts, advertisements, or website content. Structure the output clearly, perhaps with a headline and body.
`;

// --- Product Ad Storyline ---
export const getProductAdPrompt = (details: {
  productDesc: string;
  language: string;
  vibe: string;
  lighting: string;
  contentType: string;
}): string => `
    You are an expert advertising copywriter and storyboard artist for social media video ads.
    Create a compelling 1-scene storyboard for a video ad based on the provided product image and details.
    The output language for the storyboard must be in ${details.language}.

    **Product Description:**
    ${details.productDesc}

    **Creative Direction:**
    - Vibe: ${details.vibe}
    - Lighting: ${details.lighting}
    - Content Type: ${details.contentType}

    Based on all this information, describe one effective scene. What does the viewer see? What is the voiceover or on-screen text?
    Keep it short, engaging, and optimised for platforms like TikTok or Instagram Reels.
`;

// --- Product Photo ---
export const getProductPhotoPrompt = (details: {
  vibe: string;
  lighting: string;
  camera: string;
  creativityLevel: number;
  customPrompt: string;
  style: string;
  composition: string;
  lensType: string;
  filmSim: string;
}): string => {
    if (details.customPrompt.trim()) {
        return details.customPrompt.trim();
    }
    
    const promptParts = [
      `Create a professional product photo for the uploaded image. Do not include any people or models. Focus only on the product.`,
      `Place the product in the following setting:`,
      `- Background / Vibe: ${details.vibe}`,
      `- Artistic Style: ${details.style === 'Random' ? 'photorealistic' : details.style}`,
      `- Lighting: ${details.lighting === 'Random' ? 'interesting, cinematic lighting' : details.lighting}`,
      `- Camera Shot: ${details.camera === 'Random' ? 'a dynamic angle' : details.camera}`,
      `- Composition: ${details.composition === 'Random' ? 'well-composed' : details.composition}`,
      `- Lens Type: ${details.lensType === 'Random' ? 'standard lens' : details.lensType}`,
      `- Film Simulation: ${details.filmSim === 'Random' ? 'none' : details.filmSim}`,
      `- AI Creativity Level (0-10, where 10 is most creative): ${details.creativityLevel}`,
      `Ensure the final image is high-resolution, clean, and commercially appealing.`
    ];
    
    return promptParts.join('\n');
};

// --- Product Review ---
export const getProductReviewStoryboardPrompt = (details: {
  productDesc: string;
  selectedLanguage: string;
  selectedVibe: string;
  selectedBackgroundVibe: string;
  selectedLighting: string;
  selectedContentType: string;
  includeCaptions: 'Yes' | 'No';
  includeVoiceover: 'Yes' | 'No';
}): string => `
    You are an expert storyboard creator for social media product reviews.
    The final output language for the storyboard must be strictly in ${details.selectedLanguage}.

    Based on the provided product image, face image, and details below, create a 4-scene storyboard for a short-form video (e.g., TikTok, Instagram Reels).
    For each scene, provide a clear visual description.
    ${details.includeCaptions === 'Yes' ? "Also, for each scene, provide short, punchy on-screen text/captions." : ""}
    ${details.includeVoiceover === 'Yes' ? "Also, for each scene, write a voiceover script for the reviewer (based on the provided face)." : ""}
    The storyboard must follow a logical flow: introduction, demonstration/features, benefits/call-to-action.

    **Product Description:**
    ${details.productDesc}

    **Creative Direction:**
    - Vibe: ${details.selectedVibe}
    - Background Vibe: ${details.selectedBackgroundVibe}
    - Lighting: ${details.selectedLighting}
    - Content Type: ${details.selectedContentType}

    Format the output clearly with "**Scene 1:**", "**Scene 2:**", etc.
`;

export const getProductReviewImagePrompt = (details: {
  sceneDescription: string;
  selectedVibe: string;
  selectedBackgroundVibe: string;
  selectedLighting: string;
}): string => `
    You are an AI image generator. Your task is to create a single, realistic image based on a scene from a product review video.
    You will be given two images: [Image 1] is the product, and [Image 2] is the face of the reviewer.
    Combine these elements into a single, cohesive scene as described.

    **Scene Description:**
    ${details.sceneDescription}

    **Creative Direction:**
    - Vibe: ${details.selectedVibe}
    - Background Vibe: ${details.selectedBackgroundVibe}
    - Lighting: ${details.selectedLighting}

    Generate only the image that matches this description perfectly. Ensure the final image is photorealistic.
`;


// --- TikTok Affiliate ---
export const getTiktokAffiliatePrompt = (details: {
  gender: string;
  modelFace: string;
  lighting: string;
  camera: string;
  pose: string;
  vibe: string;
  creativityLevel: number;
  customPrompt: string;
  hasFaceImage: boolean;
  style: string;
  composition: string;
  lensType: string;
  filmSim: string;
}): string => {
    if (details.customPrompt.trim()) {
        return details.customPrompt.trim();
    }

    const faceInstruction = details.hasFaceImage
        ? "Use the provided face image as a direct reference for the model's face."
        : `The model should have facial features typical of someone from ${details.modelFace}.`;

    return `
      Create a high-quality, realistic image suitable for TikTok affiliate marketing.
      The image should feature a ${details.gender} model interacting with or showcasing the provided product.
      
      **Core Instructions:**
      1.  The main subject is the model and the product together. Integrate the product naturally.
      2.  ${faceInstruction}
      3.  The overall aesthetic should be eye-catching and feel like authentic user-generated content (UGC).
      
      **Creative Direction:**
      -   **Model's Gender:** ${details.gender}
      -   **Background/Vibe:** ${details.vibe}
      -   **Artistic Style:** ${details.style}
      -   **Lighting:** ${details.lighting}
      -   **Camera Shot:** ${details.camera}
      -   **Composition:** ${details.composition}
      -   **Lens Type:** ${details.lensType}
      -   **Film Simulation:** ${details.filmSim}
      -   **Model's Pose:** ${details.pose}
      -   **AI Creativity Level (0-10, where 10 is most creative):** ${details.creativityLevel}

      Ensure the final image is photorealistic, engaging, and suitable for social media.
    `;
};

// --- Background Remover ---
export const getBackgroundRemovalPrompt = (): string => {
    return "Remove the background from the provided image. The output should be a clean PNG with a transparent background. Isolate the main subject perfectly.";
};

// --- Image Enhancer ---
export const getImageEnhancementPrompt = (type: 'upscale' | 'colors'): string => {
    if (type === 'upscale') {
        return "Enhance the quality of the following image. Increase its resolution, sharpen the details, and reduce any noise or artifacts. The final image should look like a high-resolution, professional photograph. Do not change the content.";
    }
    // type === 'colors'
    return "Enhance the colors of the following image. Make them more vibrant, improve the contrast, and adjust the color balance to be more appealing. Do not change the content or resolution, just make the colors pop in a natural way.";
};

// --- Staff Monoklix ---
export const getStaffMonoklixPrompt = (details: {
  agentId: string;
  userInput: string;
  language: string;
}): string => {
    const baseInstruction = `You are a helpful AI assistant. Your final output language must be strictly in ${details.language}.`;
    let agentSpecificInstruction = '';

    switch (details.agentId) {
        case 'wan':
            agentSpecificInstruction = `You are Wan, an expert in market research. Based on the product/service "${details.userInput}", create a detailed "Ideal Customer Persona". Include demographics, interests, pain points, and motivations.`;
            break;
        case 'tina':
            agentSpecificInstruction = `You are Tina, a behavioral psychology expert. For the product/service "${details.userInput}", identify the key "Fears" (what the customer wants to avoid) and "Desires" (what the customer wants to achieve).`;
            break;
        case 'jamil':
            agentSpecificInstruction = `You are Jamil, a marketing strategist. For the product/service "${details.userInput}", brainstorm 3 distinct "Marketing Angles". Each angle should present a unique way to appeal to potential customers.`;
            break;
        case 'najwa':
            agentSpecificInstruction = `You are Najwa, a professional copywriter. Write a short, persuasive marketing copy for the product/service "${details.userInput}". Focus on benefits over features.`;
            break;
        case 'saifuz':
            agentSpecificInstruction = `You are Saifuz, an A/B testing specialist. Take the following sales copy and create 3 different variations of it. Each variation should try a different hook or call-to-action. Original copy: "${details.userInput}"`;
            break;
        case 'mieya':
            agentSpecificInstruction = `You are Mieya, an expert in classic marketing formulas. Write a marketing copy for the product/service "${details.userInput}" using the AIDA (Attention, Interest, Desire, Action) formula.`;
            break;
        case 'afiq':
            agentSpecificInstruction = `You are Afiq, a web content strategist. Outline the key sections for a high-converting sales page for the product/service "${details.userInput}". Include sections like Headline, Problem, Solution, Testimonials, Offer, and Call to Action.`;
            break;
        case 'julia':
            agentSpecificInstruction = `You are Julia, a headline specialist. Brainstorm 10 catchy and click-worthy headlines for an advertisement about "${details.userInput}".`;
            break;
        case 'mazrul':
            agentSpecificInstruction = `You are Mazrul, a video scriptwriter. Write a short (30-60 seconds) video script for a social media ad about "${details.userInput}". Include visual cues and voiceover text.`;
            break;
        case 'musa':
            agentSpecificInstruction = `You are Musa, a personal branding coach. Based on the input "${details.userInput}", write a compelling personal branding post suitable for the specified platform. Focus on storytelling and providing value.`;
            break;
        case 'joe_davinci':
            agentSpecificInstruction = `You are Joe, an AI art prompt engineer. Based on the input "${details.userInput}", create a detailed and effective prompt for an AI image generator to create a stunning visual. Include details about style, lighting, composition, and subject.`;
            break;
        case 'zaki':
            agentSpecificInstruction = `You are Zaki, a graphic design prompter. Based on the input "${details.userInput}", create a detailed prompt for an AI to generate a promotional poster. Include instructions on text, layout, color scheme, and overall mood.`;
            break;
        default:
            agentSpecificInstruction = `Analyze the following user input and provide a helpful response: "${details.userInput}"`;
            break;
    }

    return `${baseInstruction}\n\n${agentSpecificInstruction}`;
};