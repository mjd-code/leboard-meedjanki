import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { toast } from "sonner";

interface BackupConfig {
  timeIntervalMinutes: number;
  changeThreshold: number;
  maxSnapshots: number;
}

interface VaultBackupSettingsContentProps {
  config: BackupConfig;
  onSave: (config: BackupConfig) => void;
}

// Exported content component for use in external dialogs
export const VaultBackupSettingsContent = ({
  config,
  onSave,
}: VaultBackupSettingsContentProps) => {
  const [timeInterval, setTimeInterval] = useState(config.timeIntervalMinutes);
  const [changeThreshold, setChangeThreshold] = useState(config.changeThreshold);
  const [maxSnapshots, setMaxSnapshots] = useState(config.maxSnapshots);

  const handleSave = () => {
    if (timeInterval === 0 && changeThreshold === 0) {
      toast.error('At least one backup trigger must be enabled');
      return;
    }

    if (maxSnapshots < 5 || maxSnapshots > 100) {
      toast.error('Max snapshots must be between 5 and 100');
      return;
    }

    onSave({
      timeIntervalMinutes: timeInterval,
      changeThreshold,
      maxSnapshots,
    });

    toast.success('Backup settings updated');
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="space-y-2">
        <Label htmlFor="time-interval">
          Time-Based Backup (minutes)
        </Label>
        <Input
          id="time-interval"
          type="number"
          min="0"
          max="1440"
          value={timeInterval}
          onChange={(e) => setTimeInterval(parseInt(e.target.value) || 0)}
          placeholder="0 = disabled"
        />
        <p className="text-xs text-muted-foreground">
          Auto-save every N minutes. Set to 0 to disable.
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="change-threshold">
          Change-Based Backup (edits)
        </Label>
        <Input
          id="change-threshold"
          type="number"
          min="0"
          max="1000"
          value={changeThreshold}
          onChange={(e) => setChangeThreshold(parseInt(e.target.value) || 0)}
          placeholder="0 = disabled"
        />
        <p className="text-xs text-muted-foreground">
          Auto-save after N changes. Set to 0 to disable.
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="max-snapshots">
          Maximum Snapshots
        </Label>
        <Input
          id="max-snapshots"
          type="number"
          min="5"
          max="100"
          value={maxSnapshots}
          onChange={(e) => setMaxSnapshots(parseInt(e.target.value) || 30)}
        />
        <p className="text-xs text-muted-foreground">
          Keep up to N backup snapshots. Older backups are automatically removed.
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
        <p className="font-medium mb-1">Current Settings:</p>
        <ul className="space-y-1">
          <li>• Time: {timeInterval > 0 ? `Every ${timeInterval} min` : 'Disabled'}</li>
          <li>• Changes: {changeThreshold > 0 ? `Every ${changeThreshold} edits` : 'Disabled'}</li>
          <li>• Retention: Keep {maxSnapshots} snapshots</li>
        </ul>
      </div>

      <Button onClick={handleSave} className="w-full">
        Save Settings
      </Button>
    </div>
  );
};

interface VaultBackupSettingsProps {
  vaultId: string;
  config: BackupConfig;
  onSave: (config: BackupConfig) => void;
  trigger?: React.ReactNode;
}

// Full dialog component for standalone use
export const VaultBackupSettings = ({
  vaultId,
  config,
  onSave,
  trigger,
}: VaultBackupSettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = (newConfig: BackupConfig) => {
    onSave(newConfig);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Backup Settings
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Automatic Backup Settings</DialogTitle>
        </DialogHeader>
        <VaultBackupSettingsContent config={config} onSave={handleSave} />
      </DialogContent>
    </Dialog>
  );
};
