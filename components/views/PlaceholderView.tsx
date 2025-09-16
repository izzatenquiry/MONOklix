import React from 'react';

interface PlaceholderViewProps {
  title: string;
}

const PlaceholderView: React.FC<PlaceholderViewProps> = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
    <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-lg">
      <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-300">{title}</h2>
      <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">This feature is coming soon!</p>
      <p className="mt-2 text-gray-500 dark:text-gray-500">Stay tuned for more amazing AI tools from 1za7.my AI.</p>
    </div>
  </div>
);

export default PlaceholderView;