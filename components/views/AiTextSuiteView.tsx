import React, { useState } from 'react';
import ContentIdeasView from './ContentIdeasView';
import MarketingCopyView from './MarketingCopyView';
import ProductAdView from './ProductAdView';
import StaffMonoklixView from './StaffMonoklixView';
import Tabs, { type Tab } from '../common/Tabs';
import { type Language } from '../../types';
import { getTranslations } from '../../services/translations';

type TabId = 'staff-monoklix' | 'content-ideas' | 'marketing-copy' | 'storyline';

interface AiTextSuiteViewProps {
    language: Language;
}

const AiTextSuiteView: React.FC<AiTextSuiteViewProps> = ({ language }) => {
    const [activeTab, setActiveTab] = useState<TabId>('staff-monoklix');
    const T = getTranslations(language).tabs;

    const tabs: Tab<TabId>[] = [
        { id: 'staff-monoklix', label: T.staffMonoklix },
        { id: 'content-ideas', label: T.contentIdeas },
        { id: 'marketing-copy', label: T.marketingCopy },
        { id: 'storyline', label: T.storyline },
    ];

    const renderActiveTabContent = () => {
        const commonProps = { language };
        switch (activeTab) {
            case 'staff-monoklix':
                return <StaffMonoklixView {...commonProps} />;
            case 'content-ideas':
                return <ContentIdeasView {...commonProps} />;
            case 'marketing-copy':
                return <MarketingCopyView {...commonProps} />;
            case 'storyline':
                return <ProductAdView {...commonProps} />;
            default:
                return <StaffMonoklixView {...commonProps} />;
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 mb-6 flex justify-center">
                <Tabs 
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
            </div>
            <div className="flex-1 overflow-y-auto">
                {renderActiveTabContent()}
            </div>
        </div>
    );
};

export default AiTextSuiteView;
