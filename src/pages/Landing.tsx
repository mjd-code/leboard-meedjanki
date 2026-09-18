import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { usePWA } from "@/features/sync/hooks/usePWA";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { 
  Network, 
  Sparkles, 
  Shield, 
  Zap, 
  Cloud, 
  FolderTree,
  Download,
  ArrowRight,
  Check,
  GitBranch,
  Link2,
  Tags
} from "lucide-react";
import { useEffect } from "react";

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { canInstall, installApp, isInstalled } = usePWA();

  // Redirect authenticated users to main app
  useEffect(() => {
    if (!loading && user) {
      navigate('/app');
    }
  }, [user, loading, navigate]);

  const features = [
    {
      icon: Network,
      title: "Visual Knowledge Graph",
      description: "See connections between your ideas with an interactive force-directed graph visualization."
    },
    {
      icon: Link2,
      title: "Bi-directional Links",
      description: "Create [[wikilinks]] that automatically connect related notes and surface backlinks."
    },
    {
      icon: FolderTree,
      title: "Hierarchical Organization",
      description: "Organize notes in folders while maintaining a flat graph structure for connections."
    },
    {
      icon: Tags,
      title: "Tag-based Discovery",
      description: "Use #tags to categorize and filter your knowledge for quick retrieval."
    },
    {
      icon: Cloud,
      title: "Multi-device Sync",
      description: "Sync your vaults across devices with secure cloud storage and offline support."
    },
    {
      icon: Shield,
      title: "Privacy First",
      description: "Your data stays yours. Choose local-only storage or encrypted cloud sync."
    }
  ];

  const storageOptions = [
    {
      icon: Zap,
      title: "In-Memory",
      description: "Fast ephemeral workspace in your browser",
      badge: "Quick Start"
    },
    {
      icon: Cloud,
      title: "Cloud Sync",
      description: "Secure cross-device synchronization",
      badge: "Recommended"
    },
    {
      icon: GitBranch,
      title: "Local Files",
      description: "Native file system integration",
      badge: "Advanced"
    }
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle cosmic background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Network className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">ObMap</span>
          </div>

          <div className="flex items-center gap-3">
            {canInstall && !isInstalled && (
              <Button variant="ghost" size="sm" onClick={installApp} className="gap-2">
                <Download className="w-4 h-4" />
                Install App
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate('/auth?mode=login')}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate('/auth?mode=register')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 py-24 text-center">
        <Badge variant="secondary" className="mb-6 px-4 py-1.5">
          <Sparkles className="w-3.5 h-3.5 mr-2" />
          Knowledge Graph for Thinkers
        </Badge>
        
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text">
          Map Your Mind
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Transform scattered thoughts into connected knowledge. Build your personal wiki with visual graphs, bi-directional links, and flexible storage.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" onClick={() => navigate('/auth?mode=register')} className="gap-2 px-8">
            Start Building
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/auth?mode=login')}>
            Sign In to Continue
          </Button>
        </div>

        {/* Quick stats */}
        <div className="flex items-center justify-center gap-8 mt-12 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            Free to start
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            No credit card
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            Works offline
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A complete toolkit for building and navigating your knowledge graph
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group p-6 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Storage Options */}
      <section className="relative z-10 container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Your Data, Your Choice</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Choose how and where your knowledge lives
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {storageOptions.map((option, index) => (
            <div 
              key={index}
              className="relative p-6 rounded-2xl border border-border/50 bg-card/50 text-center hover:border-primary/50 transition-all"
            >
              {option.badge === "Recommended" && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  {option.badge}
                </Badge>
              )}
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <option.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{option.title}</h3>
              <p className="text-sm text-muted-foreground">{option.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PWA Install Section */}
      {canInstall && !isInstalled && (
        <section className="relative z-10 container mx-auto px-6 py-16">
          <div className="max-w-2xl mx-auto text-center p-8 rounded-2xl border border-primary/20 bg-primary/5">
            <Download className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3">Install the App</h2>
            <p className="text-muted-foreground mb-6">
              Get a native app experience with offline support, faster loading, and system integration.
            </p>
            <Button size="lg" onClick={installApp} className="gap-2">
              <Download className="w-4 h-4" />
              Install ObMap
            </Button>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start?</h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-8">
          Join thousands of thinkers building their second brain with ObMap.
        </p>
        <Button size="lg" onClick={() => navigate('/auth?mode=register')} className="gap-2 px-8">
          Create Free Account
          <ArrowRight className="w-4 h-4" />
        </Button>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 bg-background/80">
        <div className="container mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Network className="w-4 h-4" />
            <span>ObMap — Your Knowledge Graph</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => navigate('/install')} className="hover:text-foreground transition-colors">
              Install Guide
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
