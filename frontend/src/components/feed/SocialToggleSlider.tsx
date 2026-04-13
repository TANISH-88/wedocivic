"use client";
import { useState, ReactNode } from 'react';
import { Camera } from 'lucide-react';
import SmartLensModal from '@/components/modals/SmartLensModal';

interface SocialToggleSliderProps {
  connectContent: ReactNode;
  groupContent: ReactNode;
  officialContent: ReactNode;
  communityContent: ReactNode;
  onTabChange?: (tab: string) => void;
}

export default function SocialToggleSlider({ 
  connectContent, 
  groupContent,
  officialContent,
  communityContent,
  onTabChange
}: SocialToggleSliderProps) {

  const [activeTab, setActiveTab] = useState<'connect' | 'group' | 'official' | 'community'>('connect');
  const [isSmartLensOpen, setIsSmartLensOpen] = useState(false);

  const handleTabChange = (tab: 'connect' | 'group' | 'official' | 'community') => {
    setActiveTab(tab);
    onTabChange && onTabChange(tab);
  };

  return (
    <div className="w-full">
      <div className="flex justify-center items-center mb-4 border-b border-slate-100 pb-3 overflow-x-auto gap-3">
        
        {/* Smart Lens Button */}
        <button
          onClick={() => setIsSmartLensOpen(true)}
          className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl text-white flex-shrink-0"
          title="Open Smart Lens"
        >
          <Camera className="h-5 w-5" />
        </button>

        {/* Increased max-width slightly to fit the longer "Citizen Hubs" text */}
        <div className="relative flex w-full max-w-[500px] bg-slate-100/80 p-1.5 rounded-full border border-slate-200 backdrop-blur-md shadow-inner">
          
          <div className="absolute inset-y-1.5 left-1.5 right-1.5 flex pointer-events-none">
            <div 
              className={`w-1/4 bg-civic-600 rounded-full shadow-lg shadow-civic-200 transition-transform duration-300 ease-out ${
                activeTab === 'connect' ? 'translate-x-0' : 
                activeTab === 'group' ? 'translate-x-full' : 
                activeTab === 'official' ? 'translate-x-[200%]' :
                'translate-x-[300%]'
              }`}
            />
          </div>
          
          {/* CONNECT */}
          <button 
            onClick={() => handleTabChange('connect')}
            className={`relative flex-1 text-center py-2 text-xs sm:text-sm font-black z-10 ${
              activeTab === 'connect' ? 'text-white' : 'text-slate-500'
            }`}
          >
            Connect
          </button>
          
          {/* CITIZEN HUBS */}
          <button 
            onClick={() => handleTabChange('group')}
            className={`relative flex-1 text-center py-2 text-xs sm:text-sm font-black z-10 ${
              activeTab === 'group' ? 'text-white' : 'text-slate-500'
            }`}
          >
            Citizen Hubs
          </button>

          {/* OFFICIAL */}
          <button 
            onClick={() => handleTabChange('official')}
            className={`relative flex-1 text-center py-2 text-xs sm:text-sm font-black z-10 ${
              activeTab === 'official' ? 'text-white' : 'text-slate-500'
            }`}
          >
            Official Groups
          </button>

          {/* COMMUNITY */}
          <button 
            onClick={() => handleTabChange('community')}
            className={`relative flex-1 text-center py-2 text-xs sm:text-sm font-black z-10 ${
              activeTab === 'community' ? 'text-white' : 'text-slate-500'
            }`}
          >
            Community
          </button>
          
        </div>
      </div>

      <div className="mt-0">
        {activeTab === 'connect' && connectContent}
        {activeTab === 'group' && groupContent}
        {activeTab === 'official' && officialContent}
        {activeTab === 'community' && communityContent}
      </div>

      {/* Smart Lens Modal */}
      <SmartLensModal isOpen={isSmartLensOpen} onClose={() => setIsSmartLensOpen(false)} />
    </div>
  );
}