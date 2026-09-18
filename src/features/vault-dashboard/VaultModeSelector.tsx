import { useState } from "react";
import { 
  HardDrive, 
  Zap, 
  FolderOpen, 
  Plus, 
  AlertTriangle, 
  ArrowRight,
  ArrowLeft,
  Shield,
  Clock,
  ExternalLink
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";
import { Alert, AlertDescription } from "@/shared/ui/alert";

type VaultMode = "local-native" | "in-memory";
type VaultAction = "create" | "open";

interface VaultModeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateLocalVault: (folderName: string) => Promise<string | null>;
  onOpenLocalVault: () => Promise<string | null>;
  onCreateInMemoryVault: (name: string) => Promise<string | null>;
  onVaultCreated: (vaultId: string) => void;
}

export const VaultModeSelector = ({
  open,
  onOpenChange,
  onCreateLocalVault,
  onOpenLocalVault,
  onCreateInMemoryVault,
  onVaultCreated,
}: VaultModeSelectorProps) => {
  const [step, setStep] = useState<"mode" | "action" | "details">("mode");
  const [selectedMode, setSelectedMode] = useState<VaultMode | null>(null);
  const [selectedAction, setSelectedAction] = useState<VaultAction | null>(null);
  const [vaultName, setVaultName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setStep("mode");
    setSelectedMode(null);
    setSelectedAction(null);
    setVaultName("");
    setIsCreating(false);
    setError(null);
  };

  const handleModeSelect = (mode: VaultMode) => {
    setSelectedMode(mode);
    setStep("action");
    setError(null);
  };

  const handleActionSelect = async (action: VaultAction) => {
    setSelectedAction(action);
    setError(null);

    if (action === "open" && selectedMode === "local-native") {
      setIsCreating(true);
      try {
        const vaultId = await onOpenLocalVault();
        if (vaultId) {
          onVaultCreated(vaultId);
          onOpenChange(false);
          resetState();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to open vault");
      } finally {
        setIsCreating(false);
      }
    } else {
      setStep("details");
    }
  };

  const handleCreate = async () => {
    if (!vaultName.trim()) {
      setError("Please enter a vault name");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      let vaultId: string | null = null;

      if (selectedMode === "local-native") {
        vaultId = await onCreateLocalVault(vaultName);
      } else if (selectedMode === "in-memory") {
        vaultId = await onCreateInMemoryVault(vaultName);
      }

      if (vaultId) {
        onVaultCreated(vaultId);
        onOpenChange(false);
        resetState();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create vault");
    } finally {
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    if (step === "details") {
      setStep("action");
      setVaultName("");
    } else if (step === "action") {
      setStep("mode");
      setSelectedMode(null);
    }
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetState();
    }}>
      <DialogContent className="sm:max-w-xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {step === "mode" && "Choose Workspace Type"}
            {step === "action" && (selectedMode === "local-native" ? "Local Native Vault" : "In-Memory Vault")}
            {step === "details" && "Create Vault"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {step === "mode" && "Select where your data will be stored"}
            {step === "action" && (selectedMode === "local-native" 
              ? "Data stored directly on your file system" 
              : "Data stored in browser memory")}
            {step === "details" && "Enter a name for your new vault"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Mode Selection */}
        {step === "mode" && (
          <div className="grid sm:grid-cols-2 gap-3 py-4">
            <button 
              className="group p-4 rounded-xl border border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50 transition-all text-left"
              onClick={() => handleModeSelect("local-native")}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium text-foreground">Local Native</div>
                  <Badge variant="secondary" className="text-[10px] mt-0.5">Permanent</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Data stored as files on your computer
              </p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Shield className="w-3 h-3 text-green-400" />
                  <span>Long-term knowledge base</span>
                </li>
                <li className="flex items-center gap-2">
                  <ExternalLink className="w-3 h-3 text-blue-400" />
                  <span>File system compatible</span>
                </li>
              </ul>
            </button>

            <button 
              className="group p-4 rounded-xl border border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50 transition-all text-left"
              onClick={() => handleModeSelect("in-memory")}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium text-foreground">In-Memory</div>
                  <Badge variant="outline" className="text-[10px] mt-0.5">Ephemeral</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Data stored in browser IndexedDB
              </p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Lightning fast</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-purple-400" />
                  <span>Quick scratchpad</span>
                </li>
              </ul>
            </button>
          </div>
        )}

        {/* Step 2: Action Selection */}
        {step === "action" && (
          <div className="space-y-3 py-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <button 
                className="group p-4 rounded-xl border border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50 transition-all text-left"
                onClick={() => handleActionSelect("create")}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-foreground">Create New</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedMode === "local-native" 
                    ? "Create a new folder for your notes"
                    : "Start a fresh workspace"}
                </p>
              </button>

              <button 
                className={`group p-4 rounded-xl border border-border bg-secondary/30 transition-all text-left ${
                  selectedMode === "in-memory" 
                    ? "opacity-40 cursor-not-allowed" 
                    : "hover:border-primary/50 hover:bg-secondary/50"
                }`}
                onClick={() => selectedMode === "local-native" && handleActionSelect("open")}
                disabled={selectedMode === "in-memory"}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-foreground">Open Existing</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedMode === "local-native" 
                    ? "Select an existing folder"
                    : "View in vault dashboard"}
                </p>
              </button>
            </div>

            <Button variant="ghost" size="sm" onClick={handleBack} className="mt-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </div>
        )}

        {/* Step 3: Details Entry */}
        {step === "details" && (
          <div className="space-y-4 py-4">
            {selectedMode === "in-memory" && (
              <Alert className="py-2 bg-amber-500/10 border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <AlertDescription className="text-xs text-amber-400">
                  Data may be lost if browser cache is cleared. Export anytime to backup.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Vault Name</label>
              <Input
                placeholder={selectedMode === "local-native" ? "My Knowledge Base" : "Scratchpad"}
                value={vaultName}
                onChange={(e) => setVaultName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
                className="bg-secondary border-border"
              />
              {selectedMode === "local-native" && (
                <p className="text-xs text-muted-foreground">
                  You'll choose a location after clicking Create
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={isCreating || !vaultName.trim()}
                className="flex-1"
                size="sm"
              >
                {isCreating ? "Creating..." : (
                  <>
                    Create Vault
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};