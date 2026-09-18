import { Cloud, HardDrive, Laptop } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import { StorageStrategy, STORAGE_STRATEGY_LABELS, STORAGE_STRATEGY_DESCRIPTIONS } from "@/core/vault/types";

interface StorageStrategySelectorProps {
  value: StorageStrategy;
  onChange: (strategy: StorageStrategy) => void;
  disabled?: boolean;
  isAuthenticated?: boolean;
}

const strategyIcons: Record<StorageStrategy, React.ReactNode> = {
  memory: <Laptop className="w-4 h-4" />,
  cloud: <Cloud className="w-4 h-4" />,
  filesystem: <HardDrive className="w-4 h-4" />,
};

const strategyColors: Record<StorageStrategy, string> = {
  memory: 'text-amber-400',
  cloud: 'text-blue-400',
  filesystem: 'text-green-400',
};

export function StorageStrategySelector({ 
  value, 
  onChange, 
  disabled,
  isAuthenticated = true 
}: StorageStrategySelectorProps) {
  return (
    <Select 
      value={value} 
      onValueChange={(v) => onChange(v as StorageStrategy)}
      disabled={disabled}
    >
      <SelectTrigger className="h-9 bg-secondary border-border">
        <SelectValue>
          <div className="flex items-center gap-2">
            <span className={strategyColors[value]}>{strategyIcons[value]}</span>
            <span className="text-sm">{STORAGE_STRATEGY_LABELS[value]}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-popover border-border">
        <SelectItem value="memory" className="cursor-pointer">
          <div className="flex items-center gap-3 py-1">
            <span className={strategyColors.memory}>{strategyIcons.memory}</span>
            <div>
              <div className="text-sm font-medium">{STORAGE_STRATEGY_LABELS.memory}</div>
              <div className="text-xs text-muted-foreground">{STORAGE_STRATEGY_DESCRIPTIONS.memory}</div>
            </div>
          </div>
        </SelectItem>
        
        <SelectItem value="cloud" disabled={!isAuthenticated} className="cursor-pointer">
          <div className="flex items-center gap-3 py-1">
            <span className={strategyColors.cloud}>{strategyIcons.cloud}</span>
            <div>
              <div className="text-sm font-medium flex items-center gap-2">
                {STORAGE_STRATEGY_LABELS.cloud}
                {!isAuthenticated && (
                  <Badge variant="outline" className="text-[10px] h-4">Sign in</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{STORAGE_STRATEGY_DESCRIPTIONS.cloud}</div>
            </div>
          </div>
        </SelectItem>
        
        <SelectItem value="filesystem" disabled className="cursor-not-allowed opacity-50">
          <div className="flex items-center gap-3 py-1">
            <span className={strategyColors.filesystem}>{strategyIcons.filesystem}</span>
            <div>
              <div className="text-sm font-medium">{STORAGE_STRATEGY_LABELS.filesystem}</div>
              <div className="text-xs text-muted-foreground">Use "Open Local Folder" to create</div>
            </div>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

export function StorageStrategyBadge({ strategy }: { strategy: StorageStrategy }) {
  return (
    <Badge 
      variant="outline" 
      className={`text-[10px] h-5 gap-1 border-border/50 ${strategyColors[strategy]}`}
    >
      {strategyIcons[strategy]}
      {STORAGE_STRATEGY_LABELS[strategy]}
    </Badge>
  );
}