import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).trim();
          const language = code.split('\n')[0].trim();
          const codeContent = code.substring(language.length).trim();
          
          return (
            <div key={index} className="bg-gray-100 dark:bg-gray-800/70 rounded-lg my-4">
              <div className="flex justify-between items-center px-4 py-2 bg-gray-200 dark:bg-gray-700/50 rounded-t-lg">
                <span className="text-gray-500 dark:text-gray-400 text-sm">{language}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(codeContent)}
                  className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white text-xs px-2 py-1 rounded bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  Salin
                </button>
              </div>
              <pre className="p-4 overflow-x-auto">
                <code className="font-mono text-sm">{codeContent}</code>
              </pre>
            </div>
          );
        }
        return <p key={index} className="whitespace-pre-wrap">{part}</p>;
      })}
    </div>
  );
};

export default MarkdownRenderer;