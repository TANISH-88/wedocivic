'use client';

// Note: PWA install prompt is now handled via the Install button in the Navbar
// This component is kept for potential future iOS install instructions or other platform-specific guidance

export default function InstallPWA() {
  // Component disabled - install functionality moved to Navbar button
  return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-in fade-in duration-300"
        onClick={handleDismiss}
      />
      
      {/* Install Modal */}
      <div className="fixed inset-x-4 bottom-4 md:inset-auto md:bottom-8 md:right-8 md:w-96 z-50 animate-in slide-in-from-bottom-8 duration-500">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-br from-civic-800 to-civic-900 p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
            
            <div className="relative">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-4">
                <Smartphone className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold">Install CivicImpact</h2>
              <p className="text-white/80 text-sm mt-1">Get the full app experience</p>
            </div>
          </div>
          
          {/* Benefits */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-civic-900 text-sm">Lightning Fast</h3>
                <p className="text-civic-500 text-xs">Instant access from your home screen</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Wifi className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-civic-900 text-sm">Works Offline</h3>
                <p className="text-civic-500 text-xs">Access content even without internet</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-civic-900 text-sm">No App Store Needed</h3>
                <p className="text-civic-500 text-xs">Install directly from your browser</p>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="p-6 pt-0 space-y-3">
            <button
              onClick={handleInstallClick}
              className="w-full bg-civic-900 hover:bg-civic-800 text-white font-semibold py-4 px-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
            >
              <Download className="w-5 h-5" />
              Install App
            </button>
            
            <button
              onClick={handleDismiss}
              className="w-full text-civic-500 hover:text-civic-700 font-medium py-2 text-sm transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </>
  );
}