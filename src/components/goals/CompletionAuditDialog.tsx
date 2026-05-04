import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle2, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuthRole } from "@/hooks/useAuthRole";
import type { StudentAchievement } from "@/lib/types";

export interface CompletionAuditPayload {
  completedAt: string; // ISO
  completionNote: string | null;
  markedByAdminId: string | null;
  markedByAdminName: string | null;
}

interface CompletionAuditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  /** Single id or many — drives single vs bulk copy. */
  selectedGoalIds: string[];
  /** Pass when editing an existing achievement record. */
  existingData?: Partial<StudentAchievement> | null;
  onSubmit: (payload: CompletionAuditPayload) => Promise<void> | void;
}

export function CompletionAuditDialog({
  isOpen,
  onClose,
  studentId,
  selectedGoalIds,
  existingData = null,
  onSubmit,
}: CompletionAuditDialogProps) {
  const { user } = useAuthRole();
  const isBulk = selectedGoalIds.length > 1;
  const isEditing = Boolean(existingData?.id);

  const initialDate = React.useMemo(() => {
    if (existingData?.completedAt) {
      const d = new Date(existingData.completedAt);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }, [existingData]);

  const [date, setDate] = React.useState<Date>(initialDate);
  const [note, setNote] = React.useState<string>(existingData?.completionNote ?? "");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setDate(initialDate);
      setNote(existingData?.completionNote ?? "");
    }
  }, [isOpen, initialDate, existingData]);

  const adminName =
    existingData?.markedByAdminName ?? user?.full_name ?? user?.email ?? "Admin";
  const adminId = existingData?.markedByAdminId ?? user?.id ?? null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        completedAt: date.toISOString(),
        completionNote: note.trim() ? note.trim() : null,
        markedByAdminId: adminId,
        markedByAdminName: adminName,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const title = isEditing
    ? "Perbarui Capaian"
    : isBulk
    ? `Tandai ${selectedGoalIds.length} Capaian`
    : "Tandai Capaian";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Audit log untuk siswa{" "}
            <span className="font-mono text-xs">{studentId.slice(0, 8)}</span>.
            Setiap perubahan tercatat untuk keperluan verifikasi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="completion-date">Tanggal Capaian</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="completion-date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground",
                  )}
                  disabled={submitting}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pilih tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  disabled={(d) => d > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="marked-by">Ditandai Oleh</Label>
            <Input id="marked-by" value={adminName} disabled readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="completion-note">Catatan (opsional)</Label>
            <Textarea
              id="completion-note"
              placeholder="Tambahkan konteks, bukti, atau catatan verifikasi…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={submitting}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-[hsl(45_93%_56%)] text-[hsl(150_60%_12%)] hover:bg-[hsl(45_93%_50%)] font-semibold"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan…
              </>
            ) : isEditing ? (
              "Perbarui Capaian"
            ) : (
              "Simpan Capaian"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CompletionAuditDialog;