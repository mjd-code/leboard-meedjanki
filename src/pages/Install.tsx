import { usePWA } from "@/features/sync/hooks/usePWA";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { 
  Download, 
  Smartphone, 
  Monitor, 
  CheckCircle2,
  Share,
  ArrowLeft,
  Wifi,
  WifiOff,
  Zap,
  Shield,
  Cloud
} from "lucide-react";
import { Link } from "react-router-dom";

const Install = () => {
  const { 
    canInstall, 
    isInstalled, 
    isOnline,
    platform,
    installApp, 
    getInstallInstructions 
  } = usePWA();

  const instructions = getInstallInstructions();

  const features = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Lightning Fast",
      description: "Instant load times with offline support"
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Secure",
      description: "Your data stays on your device"
    },
    {
      icon: <Cloud className="w-5 h-5" />,
      title: "Offline Ready",
      description: "Access your vaults without internet"
    }
  ];

  const handleInstall = async () => {
    await installApp();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </Link>
          <Badge variant="outline" className={`gap-1.5 ${isOnline ? 'text-primary' : 'text-destructive'}`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Hero */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center">
              {platform === 'ios' || platform === 'android' ? (
                <Smartphone className="w-10 h-10 text-primary" />
              ) : (
                <Monitor className="w-10 h-10 text-primary" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-foreground">Install VaultGraph</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Get quick access from your home screen with offline support and a native app experience.
            </p>
          </div>

          {/* Status Card */}
          {isInstalled ? (
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-6 flex items-center gap-4">
                <CheckCircle2 className="w-8 h-8 text-primary flex-shrink-0" />
                <div>
                  <h2 className="font-semibold text-foreground">Already Installed!</h2>
                  <p className="text-sm text-muted-foreground">
                    VaultGraph is installed on your device. You can open it from your home screen.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : canInstall ? (
            <Card className="bg-card border-border">
              <CardContent className="p-6 space-y-4">
                <Button 
                  size="lg" 
                  className="w-full gap-2"
                  onClick={handleInstall}
                >
                  <Download className="w-5 h-5" />
                  Install VaultGraph
                </Button>
                <p className="text-sm text-center text-muted-foreground">
                  Click above to add VaultGraph to your device
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  {platform === 'ios' ? (
                    <Share className="w-6 h-6 text-primary" />
                  ) : (
                    <Download className="w-6 h-6 text-primary" />
                  )}
                  <div>
                    <CardTitle className="text-lg">{instructions.title}</CardTitle>
                    <CardDescription>Follow these steps to install</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {instructions.steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-4">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center font-semibold">
                        {index + 1}
                      </span>
                      <span className="text-foreground pt-1.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card/50 border-border">
                <CardContent className="p-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary mb-3">
                    {feature.icon}
                  </div>
                  <h3 className="font-medium text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Platform Support */}
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="text-lg">Supported Platforms</CardTitle>
              <CardDescription>VaultGraph works on all major platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { name: 'iOS', icon: '🍎' },
                  { name: 'Android', icon: '🤖' },
                  { name: 'Windows', icon: '🪟' },
                  { name: 'macOS', icon: '💻' },
                  { name: 'Linux', icon: '🐧' },
                ].map((platform, index) => (
                  <div 
                    key={index} 
                    className="flex flex-col items-center gap-2 p-3 rounded-lg bg-secondary/50"
                  >
                    <span className="text-2xl">{platform.icon}</span>
                    <span className="text-sm text-foreground">{platform.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Frequently Asked Questions</h2>
            <div className="space-y-3">
              <Card className="bg-card/50 border-border">
                <CardContent className="p-4">
                  <h3 className="font-medium text-foreground mb-1">Will my data sync across devices?</h3>
                  <p className="text-sm text-muted-foreground">
                    Your data is stored locally by default. Use the backup feature to export and import across devices.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border">
                <CardContent className="p-4">
                  <h3 className="font-medium text-foreground mb-1">Does it work offline?</h3>
                  <p className="text-sm text-muted-foreground">
                    Yes! VaultGraph is fully functional offline. Changes sync when you reconnect.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border">
                <CardContent className="p-4">
                  <h3 className="font-medium text-foreground mb-1">How do I uninstall?</h3>
                  <p className="text-sm text-muted-foreground">
                    Remove VaultGraph like any other app - long press on mobile or use your OS's app management.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Install;
