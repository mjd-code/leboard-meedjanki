import { useState, useEffect } from 'react';
import { usePWA } from "@/features/sync/hooks/usePWA";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { 
  Download, 
  X, 
  Smartphone, 
  Monitor, 
  Wifi, 
  WifiOff,
  RefreshCw,
  CheckCircle2,
  Share
} from 'lucide-react';

interface PWAInstallPromptProps {
  variant?: 'banner' | 'card' | 'minimal';
  showOfflineStatus?: boolean;
  onDismiss?: () => void;
}

export function PWAInstallPrompt({ 
  variant = 'banner', 
  showOfflineStatus = true,
  onDismiss 
}: PWAInstallPromptProps) {
  const { 
    canInstall, 
    isInstalled, 
    isOnline, 
    isUpdateAvailable,
    platform,
    installApp, 
    updateApp,
    getInstallInstructions 
  } = usePWA();
  
  const [dismissed, setDismissed] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Check localStorage for dismissal
  useEffect(() => {
    const dismissedUntil = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissedUntil) {
      const dismissedDate = new Date(dismissedUntil);
      if (dismissedDate > new Date()) {
        setDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    // Dismiss for 7 days
    const dismissUntil = new Date();
    dismissUntil.setDate(dismissUntil.getDate() + 7);
    localStorage.setItem('pwa-prompt-dismissed', dismissUntil.toISOString());
    setDismissed(true);
    onDismiss?.();
  };

  const handleInstall = async () => {
    const result = await installApp();
    if (!result.success && (platform === 'ios' || !canInstall)) {
      setShowInstructions(true);
    }
  };

  const instructions = getInstallInstructions();

  // Update available notification
  if (isUpdateAvailable) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
        <Card className="bg-primary/10 border-primary/20 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <RefreshCw className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Update available</p>
              <p className="text-xs text-muted-foreground">Click to refresh and get the latest version</p>
            </div>
            <Button size="sm" onClick={updateApp}>
              Update
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Offline status indicator
  if (showOfflineStatus && !isOnline) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
        <Badge variant="outline" className="bg-destructive/10 border-destructive/20 text-destructive gap-2 px-4 py-2">
          <WifiOff className="w-4 h-4" />
          You're offline - changes will sync when connected
        </Badge>
      </div>
    );
  }

  // Already installed
  if (isInstalled) {
    return null;
  }

  // Dismissed or not installable
  if (dismissed || (!canInstall && platform !== 'ios')) {
    return null;
  }

  // Manual instructions modal for iOS
  if (showInstructions) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={() => setShowInstructions(false)}
            >
              <X className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              {platform === 'ios' ? (
                <Share className="w-8 h-8 text-primary" />
              ) : (
                <Download className="w-8 h-8 text-primary" />
              )}
              <div>
                <CardTitle className="text-lg">{instructions.title}</CardTitle>
                <CardDescription>Follow these steps to install</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {instructions.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center font-medium">
                    {index + 1}
                  </span>
                  <span className="text-sm text-foreground pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => setShowInstructions(false)}
            >
              Got it
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Banner variant
  if (variant === 'banner') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-card/95 backdrop-blur-sm border-border shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  {platform === 'ios' || platform === 'android' ? (
                    <Smartphone className="w-6 h-6 text-primary" />
                  ) : (
                    <Monitor className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">Install VaultGraph</h3>
                  <p className="text-sm text-muted-foreground">
                    Get quick access from your home screen. Works offline!
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                  >
                    Not now
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleInstall}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Install
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Card variant
  if (variant === 'card') {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Install App</CardTitle>
                <CardDescription>Add to your device</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleDismiss}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Works offline</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Quick access from home screen</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Native app experience</span>
            </div>
            <Button className="w-full mt-4" onClick={handleInstall}>
              <Download className="w-4 h-4 mr-2" />
              Install VaultGraph
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Minimal variant
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleInstall}
      className="gap-2"
    >
      <Download className="w-4 h-4" />
      Install
    </Button>
  );
}

export function PWAStatusBadge() {
  const { isOnline, isInstalled } = usePWA();
  
  if (!isOnline) {
    return (
      <Badge variant="outline" className="gap-1.5 bg-destructive/10 border-destructive/20 text-destructive">
        <WifiOff className="w-3 h-3" />
        Offline
      </Badge>
    );
  }
  
  if (isInstalled) {
    return (
      <Badge variant="outline" className="gap-1.5 bg-primary/10 border-primary/20 text-primary">
        <Wifi className="w-3 h-3" />
        Installed
      </Badge>
    );
  }
  
  return null;
}
