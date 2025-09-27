import React from 'react';
import { SparklesIcon } from '../Icons';
import { type Language } from '../../types';
import { getTranslations } from '../../services/translations';

interface PromptViralMyViewProps {
    language: Language;
}

const PromptViralMyView: React.FC<PromptViralMyViewProps> = ({ language }) => {
    const T = getTranslations(language).promptViralMyView;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold sm:text-3xl">{T.title}</h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">{T.subtitle}</p>
            </div>
            <div className="text-center py-20 text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
                <SparklesIcon className="w-16 h-16 mx-auto mb-4 text-primary-500" />
                <p className="font-semibold text-xl">{T.comingSoon}</p>
                <p className="text-base mt-2">{T.description}</p>
            </div>
        </div>
    );
};

export default PromptViralMyView;
