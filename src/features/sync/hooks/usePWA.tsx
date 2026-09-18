import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAStatus {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  platform: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [status, setStatus] = useState<PWAStatus>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    isUpdateAvailable: false,
    platform: 'unknown'
  });

  // Detect platform
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    let platform: PWAStatus['platform'] = 'unknown';
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      platform = 'ios';
    } else if (/android/.test(userAgent)) {
      platform = 'android';
    } else if (/win/.test(userAgent)) {
      platform = 'windows';
    } else if (/mac/.test(userAgent)) {
      platform = 'macos';
    } else if (/linux/.test(userAgent)) {
      platform = 'linux';
    }
    
    setStatus(prev => ({ ...prev, platform }));
  }, []);

  // Check if already installed
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true
      || document.referrer.includes('android-app://');
    
    setStatus(prev => ({ ...prev, isInstalled: isStandalone }));
  }, []);

  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setStatus(prev => ({ ...prev, isInstallable: true }));
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setStatus(prev => ({ 
        ...prev, 
        isInstallable: false, 
        isInstalled: true 
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Online/offline status
  useEffect(() => {
    const handleOnline = () => setStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Service worker update detection
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setStatus(prev => ({ ...prev, isUpdateAvailable: true }));
              }
            });
          }
        });
      });
    }
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      return { success: false, error: 'Install prompt not available' };
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setStatus(prev => ({ ...prev, isInstallable: false }));
        return { success: true };
      }
      
      return { success: false, error: 'Installation dismissed' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }, [deferredPrompt]);

  const updateApp = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.update();
      });
    }
    window.location.reload();
  }, []);

  const getInstallInstructions = useCallback(() => {
    switch (status.platform) {
      case 'ios':
        return {
          title: 'Install on iOS',
          steps: [
            'Tap the Share button in Safari',
            'Scroll down and tap "Add to Home Screen"',
            'Tap "Add" to confirm'
          ]
        };
      case 'android':
        return {
          title: 'Install on Android',
          steps: [
            'Tap the menu button (⋮) in your browser',
            'Tap "Install app" or "Add to Home screen"',
            'Follow the prompts to install'
          ]
        };
      case 'windows':
      case 'macos':
      case 'linux':
        return {
          title: 'Install on Desktop',
          steps: [
            'Click the install icon in the address bar',
            'Or click "Install" button below',
            'The app will open in its own window'
          ]
        };
      default:
        return {
          title: 'Install App',
          steps: [
            'Look for the install option in your browser menu',
            'Follow your browser\'s installation prompts'
          ]
        };
    }
  }, [status.platform]);

  return {
    ...status,
    installApp,
    updateApp,
    getInstallInstructions,
    canInstall: status.isInstallable && !status.isInstalled
  };
}
