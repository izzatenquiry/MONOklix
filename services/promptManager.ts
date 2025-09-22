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
      `- Film Simulation: ${details.filmSim === 'Random' ? 'modern digital look' : details.filmSim}`,
      `- AI Creativity Level: ${details.creativityLevel} out of 10. A level of 0 means being very literal and making minimal changes. A level of 10 means complete creative freedom to reinterpret the scene in an artistic way.`,
      `The result should be a photorealistic, clean, and aesthetic image suitable for social media or an e-commerce listing.`,
      `- The final output image must have a 3:4 aspect ratio.`,
      `- CRITICAL: The final image must be purely visual. Do NOT add any text, watermarks, or logos to the image.`,
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
    includeCaptions: string;
    includeVoiceover: string;
}): string => {
    let finalInstructions = 'Combine these elements to create a scene description for each of the 4 scenes, including camera shots.';
    if (details.includeCaptions === 'Yes') {
        finalInstructions += ' Include on-screen text/captions.';
    }
    if (details.includeVoiceover === 'Yes') {
        finalInstructions += ' Include a voiceover script where the person (from the face image) is reviewing the product.';
    }

    return `
      You are an expert AI assistant specialising in creating storyboards for product review videos for social media.
      Based on the user's product image, face image, product description, and chosen creative direction, generate a short and engaging 4-scene storyboard for a review video.
      The output language must be strictly in ${details.selectedLanguage}.

      **Product Description:**
      ${details.productDesc}

      **Creative Direction:**
      - Vibe: ${details.selectedVibe}
      - Background Vibe: ${details.selectedBackgroundVibe}
      - Lighting: ${details.selectedLighting}
      - Content Type: ${details.selectedContentType}
      - On-Screen Text/Captions: ${details.includeCaptions}
      - Voiceover Script (Reviewer): ${details.includeVoiceover}

      ${finalInstructions}
      The output must be structured with clear headings for each scene, like "**Scene 1:**", "**Scene 2:**", etc.
    `;
};

export const getProductReviewImagePrompt = (details: {
    sceneDescription: string;
    selectedVibe: string;
    selectedBackgroundVibe: string;
    selectedLighting: string;
}): string => `
    This is an image editing task. Your goal is to create a new, photorealistic image by combining the provided product photo and face photo according to the scene description.

    **Scene Description:** 
    ${details.sceneDescription}

    **Instructions:**
    - The image must feature a person whose appearance is inspired by the provided face image.
    - The person must be using or showcasing the product from the provided product image.
    - The overall creative direction is: Vibe "${details.selectedVibe}", Background "${details.selectedBackgroundVibe}", Lighting "${details.selectedLighting}".
    - CRITICAL: The final image must be purely visual. Do NOT add any text, watermarks, or logos to the image.
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
    hasFaceImage?: boolean;
    style: string;
    composition: string;
    lensType: string;
    filmSim: string;
}): string => {
    if (details.customPrompt.trim()) {
        return details.customPrompt.trim();
    }
    
    const modelInstruction = details.hasFaceImage
        ? `A ${details.gender} model whose face is inspired by the second image provided (the face photo).`
        : `A ${details.gender} from ${details.modelFace === 'Random' ? 'Southeast Asia' : details.modelFace}. Ensure the face looks realistic and appealing.`;
    
    const productInstruction = details.hasFaceImage
        ? "Include the product from the first uploaded image."
        : "Include the product from the uploaded image.";

    const promptParts = [
       `Create a photorealistic User-Generated Content (UGC) image for a platform like TikTok.`,
       `The image must naturally feature the uploaded product image.`,
       `Here are the details for the image:`,
       `- Model: ${modelInstruction}`,
       `- Product: ${productInstruction}`,
       `- Artistic Style: ${details.style === 'Random' ? 'photorealistic' : details.style}`,
       `- Lighting: ${details.lighting === 'Random' ? 'flattering and natural-looking lighting' : details.lighting}.`,
       `- Camera Shot: ${details.camera === 'Random' ? 'a dynamic angle' : details.camera}.`,
       `- Body Movement / Pose: ${details.pose === 'Random' ? 'a natural and relaxed pose' : details.pose}. The model should be interacting with the product if appropriate.`,
       `- Content Vibe / Background: ${details.vibe}.`,
       `- Composition: ${details.composition === 'Random' ? 'well-composed' : details.composition}`,
       `- Lens Type: ${details.lensType === 'Random' ? 'standard lens' : details.lensType}`,
       `- Film Simulation: ${details.filmSim === 'Random' ? 'modern digital look' : details.filmSim}`,
       `- AI Creativity Level: ${details.creativityLevel} out of 10. A level of 0 means being very literal and making minimal changes. A level of 10 means complete creative freedom to reinterpret the scene in an artistic way.`,
       `The result should be a high-quality, authentic-looking, and engaging image that could be used for affiliate marketing.`,
       `- The final output image must have a 3:4 aspect ratio.`,
       `- CRITICAL: The final image must be purely visual. Do NOT add any text, watermarks, or logos to the image.`,
    ];
   
   return promptParts.join('\n');
};

// --- Image Tools ---
export const getBackgroundRemovalPrompt = (): string => 
    "Remove the background from this image, leaving only the main subject. The background should be transparent.";

export const getImageEnhancementPrompt = (type: 'upscale' | 'colors'): string => {
    if (type === 'upscale') {
        return "Upscale this image, making it sharper, clearer, and higher resolution. Preserve all original details.";
    }
    return "Enhance the colors and lighting of this image to make it more vibrant and visually appealing. Adjust contrast and brightness for a professional look.";
};