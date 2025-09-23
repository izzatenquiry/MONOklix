import React, { useState } from 'react';
import ContentIdeasView from './ContentIdeasView';
import MarketingCopyView from './MarketingCopyView';
import ProductAdView from './ProductAdView';
import StaffMonoklixView from './StaffMonoklixView';
import Tabs, { type Tab } from '../common/Tabs';

type TabId = 'staff-monoklix' | 'content-ideas' | 'marketing-copy' | 'storyline';

const tabs: Tab<TabId>[] = [
    { id: 'staff-monoklix', label: 'Staff MONOklix' },
    { id: 'content-ideas', label: 'Content Ideas' },
    { id: 'marketing-copy', label: 'Marketing Copy' },
    { id: 'storyline', label: 'Storyline' },
];

const AiTextSuiteView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('staff-monoklix');

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'staff-monoklix':
                return <StaffMonoklixView />;
            case 'content-ideas':
                return <ContentIdeasView />;
            case 'marketing-copy':
                return <MarketingCopyView />;
            case 'storyline':
                return <ProductAdView />;
            default:
                return <StaffMonoklixView />;
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
