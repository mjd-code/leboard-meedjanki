import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Database, 
  HardDrive, 
  Zap, 
  Network, 
  FileText, 
  Link2,
  Cloud,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { VaultModeSelector } from "./VaultModeSelector";
import { getVaultManager } from "@/core/vault/VaultManagerSingleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { vaultSyncService } from "@/core/vault/VaultSyncService";

interface VaultRequiredGateProps {
  isVaultActive: boolean;
  onVaultCreated: (vaultId: string) => void;
  children: React.ReactNode;
}

export const VaultRequiredGate = ({
  isVaultActive,
  onVaultCreated,
  children,
}: VaultRequiredGateProps) => {
  const [isVaultSelectorOpen, setIsVaultSelectorOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const vaultManager = getVaultManager();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const isAuthenticated = !!user && !!session;

  useEffect(() => {
    const init = async () => {
      await vaultManager.initialize();
      setIsInitialized(true);
      
      if (isAuthenticated) {
        setIsSyncing(true);
        const result = await vaultSyncService.syncFromCloud(vaultManager);
        setIsSyncing(false);
        
        const activeVault = vaultManager.getActiveVault();
        if (activeVault) {
          onVaultCreated(activeVault.id);
        }
      }
    };
    init();
  }, [isAuthenticated]);

  const handleCreateLocalVault = async (folderName: string): Promise<string | null> => {
    try {
      const vaultId = await vaultManager.openLocalFolderVault();
      return vaultId;
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        throw error;
      }
      return null;
    }
  };

  const handleOpenLocalVault = async (): Promise<string | null> => {
    try {
      const vaultId = await vaultManager.openLocalFolderVault();
      return vaultId;
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        throw error;
      }
      return null;
    }
  };

  const handleCreateInMemoryVault = async (name: string): Promise<string | null> => {
    try {
      const vaultId = await vaultManager.createInMemoryVault(name);
      vaultManager.startAutoBackup(vaultId);
      return vaultId;
    } catch (error) {
      console.error("Vault creation error:", error);
      throw error;
    }
  };

  const handleVaultCreated = async (vaultId: string) => {
    await vaultManager.switchVault(vaultId);
    
    if (isAuthenticated) {
      await vaultSyncService.syncVaultToCloud(vaultManager, vaultId);
    }
    
    onVaultCreated(vaultId);
  };

  if (isVaultActive) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-3xl space-y-8">
          
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-4">
              <Database className="w-10 h-10 text-primary" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Knowledge Graph
            </h1>
            
            <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
              Create or open a vault to start building your connected knowledge base.
            </p>

            {isAuthenticated && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-sm">
                <Cloud className="w-4 h-4" />
                <span>Cloud sync enabled</span>
              </div>
            )}
          </div>

          {/* Syncing State */}
          {isSyncing && (
            <div className="flex items-center justify-center gap-2 py-4 text-primary animate-pulse">
              <Cloud className="w-5 h-5" />
              <span>Syncing vaults from cloud...</span>
            </div>
          )}

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Network, label: "Network Graph", desc: "Visualize connections" },
              { icon: FileText, label: "Markdown Notes", desc: "Write with wikilinks" },
              { icon: isAuthenticated ? Cloud : Link2, label: isAuthenticated ? "Cloud Sync" : "Auto-linking", desc: isAuthenticated ? "Access anywhere" : "Smart backlinks" }
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
                <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Vault Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setIsVaultSelectorOpen(true)}
              className="group relative p-5 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-card/80 transition-all text-left"
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">Local Native</span>
                    <Badge variant="secondary" className="text-[10px]">Permanent</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Store as files on your computer with full file system access.
                  </p>
                </div>
              </div>
              <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>

            <button
              onClick={() => setIsVaultSelectorOpen(true)}
              className="group relative p-5 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-card/80 transition-all text-left"
            >
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl transition-colors ${
                  isAuthenticated 
                    ? 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white' 
                    : 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white'
                }`}>
                  {isAuthenticated ? <Cloud className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">
                      {isAuthenticated ? "Cloud Vault" : "In-Memory"}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {isAuthenticated ? "Synced" : "Ephemeral"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isAuthenticated 
                      ? "Stored in cloud. Access from any device."
                      : "Fast temporary workspace in browser."}
                  </p>
                </div>
              </div>
              <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-4 pt-4">
            <Button 
              size="lg" 
              onClick={() => setIsVaultSelectorOpen(true)}
              disabled={!isInitialized || isSyncing}
              className="px-8 h-11"
            >
              {!isInitialized ? "Initializing..." : isSyncing ? "Syncing..." : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Vault
                </>
              )}
            </Button>
            
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <button 
                onClick={() => navigate("/vaults")} 
                className="hover:text-primary transition-colors"
              >
                Manage vaults
              </button>
              {!isAuthenticated && (
                <>
                  <span className="text-border">•</span>
                  <button 
                    onClick={() => navigate("/auth")} 
                    className="hover:text-primary transition-colors"
                  >
                    Sign in for cloud sync
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <VaultModeSelector
        open={isVaultSelectorOpen}
        onOpenChange={setIsVaultSelectorOpen}
        onCreateLocalVault={handleCreateLocalVault}
        onOpenLocalVault={handleOpenLocalVault}
        onCreateInMemoryVault={handleCreateInMemoryVault}
        onVaultCreated={handleVaultCreated}
      />
    </div>
  );
};