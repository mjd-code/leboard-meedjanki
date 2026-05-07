import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { format } from "date-fns";
import {
  Image as ImageIcon,
  Save,
  Trash2,
  Edit2,
  Info,
  Loader2,
  Link as LinkIcon,
  Download,
  X,
  Search,
  Filter,
  ArrowUpAZ,
  ArrowDownAZ,
  TrendingUp,
  Plus,
  CheckSquare,
  Square,
  CheckCircle2,
  ArrowLeft,
  ZoomOut,
  ZoomIn,
  MoreHorizontal,
  CalendarIcon,
} from "lucide-react";
import { ImageUploader } from "../ui/ImageUploader";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../../lib/api";
import { useUpdateStudentMutation } from "../../hooks/useAppQueries";
import { Avatar } from "../ui/custom-avatar";
import { StudentSearchFilter } from "../StudentSearchFilter";
import {
  applyStudentSearchFilter,
  emptyStudentSearchFilter,
} from "../StudentSearchFilter";
import { StudentSearchAdvanced } from "../StudentSearchAdvanced";
import {
  StudentSortDropdown,
  sortStudents,
  SortKey,
} from "../StudentSortDropdown";
import { dicebearAvatar } from "../ImageFallback";
import { ConfirmModal } from "../ui/ConfirmModal";
import type {
  Category,
  MasterGoal,
  AssignedGoal,
  Student,
  Group,
} from "../../lib/types";
import { TimeRangeValue } from "../TimeRangeFilter";
import { StudentSearchFilterValue } from "../StudentSearchFilter";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SimpleMenu } from "../ui/SimpleMenu";
import { ArrowUpDown } from "lucide-react";
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
import { PopoverSelect } from "@/components/ui/PopoverSelect";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAuthRole } from "@/hooks/useAuthRole";
import { cn } from "@/lib/utils";
import { ChevronDown, Check, Layers } from "lucide-react";
import type { StudentAchievement } from "@/lib/types";
import {
  buildHierarchy,
  sortByOrder,
} from "@/lib/hierarchy";

// ---------------------------------------------------------------------------
// Inline collapsible audit card — replaces the legacy CompletionAuditPanel.
// Each goal renders as a collapsible row; expanding it reveals editable audit
// fields (date picker, marker select, note) directly inside the card.
// ---------------------------------------------------------------------------
export interface CompletionAuditPayload {
  completedAt: string;
  completionNote: string | null;
  markedByAdminId: string | null;
  markedByAdminName: string | null;
}

interface AdminOption {
  id: string;
  name: string;
}

interface GoalAuditCardProps {
  goal: any;
  assigned: boolean;
  completed: boolean;
  assignedGoal: AssignedGoal | undefined;
  admins: AdminOption[];
  currentAdmin: AdminOption;
  onToggleAssign: () => void;
  onApplyCompletion: (payload: CompletionAuditPayload) => void;
  onUnmark: () => void;
}

function GoalAuditCard({
  goal,
  assigned,
  completed,
  assignedGoal,
  admins,
  currentAdmin,
  onToggleAssign,
  onApplyCompletion,
  onUnmark,
}: GoalAuditCardProps) {
  const [open, setOpen] = useState(false);

  const initialDate = useMemo(() => {
    if (assignedGoal?.completedAt) {
      const d = new Date(assignedGoal.completedAt);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }, [assignedGoal?.completedAt]);

  const [date, setDate] = useState<Date>(initialDate);
  const [note, setNote] = useState<string>(assignedGoal?.completionNote ?? "");
  const [markerId, setMarkerId] = useState<string>(
    assignedGoal?.markedByAdminId ?? currentAdmin.id,
  );

  // Re-sync local fields when the underlying assignment changes (e.g. bulk ops)
  useEffect(() => {
    setDate(initialDate);
    setNote(assignedGoal?.completionNote ?? "");
    setMarkerId(assignedGoal?.markedByAdminId ?? currentAdmin.id);
  }, [
    initialDate,
    assignedGoal?.completionNote,
    assignedGoal?.markedByAdminId,
    currentAdmin.id,
  ]);

  const adminOptions = useMemo(() => {
    const map = new Map<string, AdminOption>();
    admins.forEach((a) => map.set(a.id, a));
    map.set(currentAdmin.id, currentAdmin);
    if (assignedGoal?.markedByAdminId && assignedGoal?.markedByAdminName) {
      map.set(assignedGoal.markedByAdminId, {
        id: assignedGoal.markedByAdminId,
        name: assignedGoal.markedByAdminName,
      });
    }
    return Array.from(map.values());
  }, [
    admins,
    currentAdmin,
    assignedGoal?.markedByAdminId,
    assignedGoal?.markedByAdminName,
  ]);

  const handleApply = () => {
    const marker = adminOptions.find((a) => a.id === markerId) ?? currentAdmin;
    onApplyCompletion({
      completedAt: date.toISOString(),
      completionNote: note.trim() ? note.trim() : null,
      markedByAdminId: marker.id,
      markedByAdminName: marker.name,
    });
    setOpen(false);
  };

  const containerClass = assigned
    ? completed
      ? "border-[var(--accent)] bg-[var(--accent)]/10"
      : "border-primary bg-primary/10"
    : "border-transparent bg-card hover:border-border shadow-soft";

  return (
    <div className={`rounded-xl border transition-all ${containerClass}`}>
      <div className="p-4 flex justify-between items-start gap-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex-1 text-left"
          aria-expanded={open}
        >
          <div className="flex items-center gap-2">
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
            <div className="font-bold text-sm text-foreground">
              {goal.title}
            </div>
            {completed && (
              <Badge className="bg-[var(--accent)] text-[var(--accent-foreground)] border-0 rounded-md text-[10px] px-1.5 py-0.5 ml-1">
                Selesai
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 pl-6">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">
              {goal.points !== undefined
                ? goal.points
                : (goal as any).pointValue || 0}{" "}
              pts
            </span>
            <span className="text-[10px] text-muted-foreground">•</span>
            <span className="text-[10px] font-medium text-muted-foreground">
              {goal.categoryName || "—"}
            </span>
            {completed && assignedGoal?.completedAt && (
              <>
                <span className="text-[10px] text-muted-foreground">•</span>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(assignedGoal.completedAt), "PPP")}
                </span>
              </>
            )}
          </div>
        </button>

        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleAssign}
            className={`p-2 rounded-xl transition-all ${assigned ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            title={assigned ? "Hapus tugas" : "Tugaskan"}
          >
            {assigned ? (
              <CheckSquare className="w-5 h-5" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="audit"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-border/60 space-y-4">
              {!assigned ? (
                <div className="text-xs text-muted-foreground italic">
                  Tugaskan terlebih dahulu untuk membuka audit log capaian.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Tanggal Capaian
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-10",
                              !date && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : "Pilih tanggal"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-0 z-[200]"
                          align="start"
                        >
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
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Ditandai Oleh
                      </Label>
                      <PopoverSelect
                        value={markerId}
                        onValueChange={setMarkerId}
                        options={adminOptions.map((a) => ({ value: a.id, label: a.name }))}
                        placeholder="Pilih admin"
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Catatan (opsional)
                    </Label>
                    <Textarea
                      placeholder="Tambahkan konteks, bukti, atau catatan verifikasi…"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 pt-2">
                    {completed && (
                      <Button
                        variant="ghost"
                        onClick={onUnmark}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4 mr-1" /> Batalkan Selesai
                      </Button>
                    )}
                    <Button
                      onClick={handleApply}
                      className="bg-[hsl(45_93%_56%)] text-[hsl(150_60%_12%)] hover:bg-[hsl(45_93%_50%)] font-semibold"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      {completed ? "Perbarui Audit Log" : "Tandai Selesai"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AdminStudentsTab({
  students,
  refreshData,
  masterGoals,
  categories,
  groups = [],
  calculateTotalPoints,
}: any) {
  const [searchFilter, setSearchFilter] = useState<StudentSearchFilterValue>(
    emptyStudentSearchFilter,
  );
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
  const updateStudentMutation = useUpdateStudentMutation();

  const studentsList = Array.isArray(students) ? students : [];
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    studentsList.forEach((s: any) =>
      (s.tags || []).forEach((t: string) => t && set.add(t)),
    );
    return Array.from(set);
  }, [studentsList]);
  const studentTagSource = useMemo(
    () => studentsList.map((s: any) => s.tags || []),
    [studentsList],
  );
  const filtered = useMemo(() => {
    const matched = applyStudentSearchFilter(studentsList, searchFilter);
    const enriched = matched.map((s: any) => ({
      ...s,
      totalPoints: calculateTotalPoints(s.assignedGoals || []),
    }));
    return sortStudents(enriched, sortKey);
  }, [studentsList, searchFilter, sortKey, calculateTotalPoints]);

  const handleSave = async (formData: any) => {
    const calculateRanks = (list: any[]) => {
      const mapped = list.map((s) => ({
        ...s,
        totalPts: calculateTotalPoints(s.assignedGoals || []),
      }));
      mapped.sort((a, b) => b.totalPts - a.totalPts);
      return mapped.map((s, index) => ({ id: s.id, rank: index + 1 }));
    };

    const oldRanks = calculateRanks(studentsList);
    const oldRanksMap = Object.fromEntries(oldRanks.map((r) => [r.id, r.rank]));

    const isNew = !formData.id;
    let finalData = { ...formData };
    if (!isNew && oldRanksMap[formData.id]) {
      finalData.previousRank = oldRanksMap[formData.id];
    }

    try {
      await updateStudentMutation.mutateAsync({
        id: formData.id,
        data: finalData,
      });
      refreshData();
      setModalOpen(false);
      alert("Data Santri berhasil disimpan!");
    } catch (err: any) {
      alert("Failed to save: " + err.message);
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    const res = await apiFetch(`/api/students/${deleteConfirm.id}`, {
      method: "DELETE",
    });
    if (!res.ok) alert(`Failed to delete: ${res.statusText}`);
    setDeleteConfirm(null);
    refreshData();
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteIds || bulkDeleteIds.length === 0) return;
    try {
      await Promise.all(
        bulkDeleteIds.map((id) =>
          apiFetch(`/api/students/${id}`, { method: "DELETE" }),
        ),
      );
      setBulkDeleteIds(null);
      refreshData();
    } catch (err: any) {
      alert("Gagal menghapus beberapa Santri: " + err.message);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Pilih semua"
          className="rounded border-border text-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:ring-primary h-4 w-4"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Pilih baris"
          className="rounded border-border text-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:ring-primary h-4 w-4"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-transparent px-0 font-medium text-muted-foreground"
          >
            Student
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="flex items-center gap-4">
            <Avatar
              src={student.photo}
              alt={student.name}
              className="w-12 h-12"
              wrapperClassName="w-12 h-12"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-foreground line-clamp-1">
                {student.name}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      id: "goals",
      header: "Goals",
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            {student.assignedGoals?.length || 0} Tugas Ditugaskan
          </div>
        );
      },
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.original.tags || [];
        if (tags.length === 0)
          return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag: string, idx: number) => (
              <Badge
                key={idx}
                variant="secondary"
                className="bg-primary/10 text-primary border-0 rounded-md text-[10px] px-1.5 py-0.5"
              >
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge
                variant="secondary"
                className="bg-secondary text-secondary-foreground border-0 rounded-md text-[10px] px-1.5 py-0.5"
              >
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => {
        const student = row.original;
        const options = [
          {
            label: "Edit Profil",
            onClick: () => {
              setEditData(student);
              setModalOpen(true);
            },
            icon: <Edit2 className="w-4 h-4 text-muted-foreground" />,
          },
          {
            label: "Hapus Santri",
            onClick: () => setDeleteConfirm(student),
            icon: <Trash2 className="w-4 h-4 text-destructive/70" />,
            variant: "destructive" as const,
          },
        ];
        return (
          <div className="text-right">
            <SimpleMenu options={options} />
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h3 className="text-2xl font-black text-foreground underline decoration-primary decoration-4 underline-offset-8">
            Daftar Santri
          </h3>
          <p className="text-muted-foreground text-sm mt-3">
            Kelola profil dan tugas kompetensi dasar.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={() => {
              setEditData(null);
              setModalOpen(true);
            }}
            className="rounded-xl h-12 flex-1 sm:flex-none shadow-primary-glow gap-2 font-bold"
          >
            <Plus className="h-4 w-4" /> Tambah Santri
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        filterColumn="name"
        filterPlaceholder="Cari / Filter Santri..."
        onDeleteSelected={(ids) => setBulkDeleteIds(ids)}
      />

      {modalOpen && (
        <StudentAdminModal
          student={editData}
          masterGoals={masterGoals}
          categories={categories}
          groups={groups}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteConfirm}
        title="Konfirmasi Hapus"
        message={`Apakah Anda yakin ingin menghapus data Santri "${deleteConfirm?.name}"? Aksi ini akan menghapus semua riwayat Tugas dan poin mereka. Operasi ini tidak dapat dibatalkan.`}
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      <ConfirmModal
        isOpen={!!bulkDeleteIds}
        title="Konfirmasi Hapus Massal"
        message={`Apakah Anda yakin ingin menghapus kumpulan data sejumlah ${bulkDeleteIds?.length} Santri? Data poin dan perkembangan Santri juga akan terhapus. Operasi ini tidak dapat dibatalkan.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteIds(null)}
      />
    </div>
  );
}

// Student Edit Modal (Shared with initial but updated styles)
function StudentAdminModal({
  student,
  masterGoals,
  categories,
  groups,
  onClose,
  onSave,
}: any) {
  const [formData, setFormData] = useState<Student>({
    id: student?.id || "",
    name: student?.name || "",
    bio: student?.bio || "",
    photo:
      student?.photo ||
      dicebearAvatar(student?.name || student?.id || "student"),
    tags: student?.tags ? [...student.tags] : [],
    assignedGoals: student?.assignedGoals ? [...student.assignedGoals] : [],
  });

  const [tagInput, setTagInput] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<{
    kind: "assign" | "unassign" | "complete" | "uncomplete";
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const addTag = () => {
    if (tagInput.trim() !== "" && !formData.tags?.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((t) => t !== tagToRemove),
    }));
  };

  // Build the 3-tier tree once. The modal flattens it via group + category pickers.
  const tree = useMemo(
    () => buildHierarchy(groups || [], categories, masterGoals),
    [groups, categories, masterGoals],
  );
  // Auto-select first group/category when data arrives or current selection invalidates.
  const activeGroupNode = useMemo(() => {
    if (!tree.length) return null;
    return tree.find((n) => n.group.id === selectedGroupId) ?? tree[0];
  }, [tree, selectedGroupId]);
  useEffect(() => {
    if (activeGroupNode && activeGroupNode.group.id !== selectedGroupId) {
      setSelectedGroupId(activeGroupNode.group.id);
    }
  }, [activeGroupNode, selectedGroupId]);
  const activeCategories = activeGroupNode?.categories ?? [];
  const activeCategoryNode = useMemo(() => {
    if (!activeCategories.length) return null;
    return (
      activeCategories.find((c) => c.category.id === selectedCategoryId) ??
      activeCategories[0]
    );
  }, [activeCategories, selectedCategoryId]);
  useEffect(() => {
    if (
      activeCategoryNode &&
      activeCategoryNode.category.id !== selectedCategoryId
    ) {
      setSelectedCategoryId(activeCategoryNode.category.id);
    }
  }, [activeCategoryNode, selectedCategoryId]);
  // Flat list of goals visible after filter — drives bulk-action helpers below.
  const displayedMasterGoals: MasterGoal[] = useMemo(
    () => activeCategoryNode?.goals ?? [],
    [activeCategoryNode],
  );

  const isAssigned = (goalId: string) =>
    formData.assignedGoals.some((ag) => ag.goalId === goalId);
  const isCompleted = (goalId: string) =>
    formData.assignedGoals.find((ag) => ag.goalId === goalId)?.completed ||
    false;

  // Fetch admin list for the marker dropdown (graceful failure → empty list).
  const { user } = useAuthRole();
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  useEffect(() => {
    let active = true;
    apiFetch("/api/admin_users")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data) return;
        const list = Array.isArray(data)
          ? data
          : data.users || data.admins || [];
        setAdmins(
          list.map((a: any) => ({
            id: a.id,
            name: a.full_name || a.email || "Admin",
          })),
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const currentAdmin: AdminOption = useMemo(
    () => ({
      id: user?.id || "self",
      name: user?.full_name || user?.email || "Admin",
    }),
    [user],
  );

  const toggleAssignment = (goalId: string) => {
    setFormData((prev) => {
      if (isAssigned(goalId)) {
        return {
          ...prev,
          assignedGoals: prev.assignedGoals.filter(
            (ag) => ag.goalId !== goalId,
          ),
        };
      } else {
        return {
          ...prev,
          assignedGoals: [...prev.assignedGoals, { goalId, completed: false }],
        };
      }
    });
  };

  const unmarkCompletion = (goalId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedGoals: prev.assignedGoals.map((ag) =>
        ag.goalId === goalId
          ? {
              ...ag,
              completed: false,
              completedAt: undefined,
              completionNote: null,
              markedByAdminId: null,
              markedByAdminName: null,
            }
          : ag,
      ),
    }));
  };

  const applyCompletionToGoal = (
    goalId: string,
    payload: CompletionAuditPayload,
  ) => {
    setFormData((prev) => {
      const exists = prev.assignedGoals.some((ag) => ag.goalId === goalId);
      const next = exists
        ? prev.assignedGoals.map((ag) =>
            ag.goalId === goalId
              ? {
                  ...ag,
                  completed: true,
                  completedAt: payload.completedAt,
                  completionNote: payload.completionNote,
                  markedByAdminId: payload.markedByAdminId,
                  markedByAdminName: payload.markedByAdminName,
                }
              : ag,
          )
        : [
            ...prev.assignedGoals,
            {
              goalId,
              completed: true,
              completedAt: payload.completedAt,
              completionNote: payload.completionNote,
              markedByAdminId: payload.markedByAdminId,
              markedByAdminName: payload.markedByAdminName,
            },
          ];
      return { ...prev, assignedGoals: next };
    });
  };

  const visibleGoalIds: string[] = displayedMasterGoals.map((mg: any) => mg.id);
  const visibleAssignedCount = visibleGoalIds.filter((id) =>
    isAssigned(id),
  ).length;
  const visibleCompletedCount = visibleGoalIds.filter((id) =>
    isCompleted(id),
  ).length;
  const allVisibleAssigned =
    visibleGoalIds.length > 0 && visibleAssignedCount === visibleGoalIds.length;
  const allVisibleCompleted =
    visibleAssignedCount > 0 && visibleCompletedCount === visibleAssignedCount;
  const activeGroupName = activeGroupNode?.group.name ?? "—";
  const activeCategoryName = activeCategoryNode?.category.name ?? "—";
  const scopeLabel = activeCategoryName;
  const studentLabel = formData.name?.trim() || "this student";

  const requestBulkAssigned = (assign: boolean) => {
    if (visibleGoalIds.length === 0) return;
    const count = visibleGoalIds.length;
    if (assign) {
      setBulkConfirm({
        kind: "assign",
        title: `Assign all ${count} goals?`,
        message: `Are you sure you want to assign all ${count} goals in the "${activeCategoryName}" category for ${studentLabel}? This will add every goal in this category to the student's tracker.`,
        onConfirm: () => {
          bulkSetAssigned(true);
          setBulkConfirm(null);
        },
      });
    } else {
      setBulkConfirm({
        kind: "unassign",
        title: `Remove all ${count} goals?`,
        message: `Are you sure you want to remove all ${count} goals in the "${activeCategoryName}" category for ${studentLabel}? WARNING: This will permanently delete existing completion dates and audit histories for these specific goals. This action cannot be undone.`,
        onConfirm: () => {
          bulkSetAssigned(false);
          setBulkConfirm(null);
        },
      });
    }
  };

  const requestBulkCompleted = (complete: boolean) => {
    if (visibleGoalIds.length === 0) return;
    const count = visibleGoalIds.length;
    if (complete) {
      setBulkConfirm({
        kind: "complete",
        title: `Mark all ${count} goals as complete?`,
        message: `Are you sure you want to mark all ${count} goals in the "${activeCategoryName}" category as complete for ${studentLabel}? WARNING: Doing this will overwrite existing completion dates and audit histories for these specific goals. This action cannot be undone.`,
        onConfirm: () => {
          bulkSetCompleted(true);
          setBulkConfirm(null);
        },
      });
    } else {
      setBulkConfirm({
        kind: "uncomplete",
        title: `Unmark completion for ${count} goals?`,
        message: `Are you sure you want to clear the completion status for all ${count} goals in the "${activeCategoryName}" category for ${studentLabel}? WARNING: This will erase existing completion dates and audit notes for these goals. This action cannot be undone.`,
        onConfirm: () => {
          bulkSetCompleted(false);
          setBulkConfirm(null);
        },
      });
    }
  };

  const bulkSetAssigned = (assign: boolean) => {
    setFormData((prev) => {
      if (assign) {
        const existingIds = new Set(prev.assignedGoals.map((ag) => ag.goalId));
        const additions = visibleGoalIds
          .filter((id) => !existingIds.has(id))
          .map((id) => ({ goalId: id, completed: false }));
        if (additions.length === 0) return prev;
        return {
          ...prev,
          assignedGoals: [...prev.assignedGoals, ...additions],
        };
      }
      const drop = new Set(visibleGoalIds);
      return {
        ...prev,
        assignedGoals: prev.assignedGoals.filter((ag) => !drop.has(ag.goalId)),
      };
    });
  };

  const bulkSetCompleted = (complete: boolean) => {
    setFormData((prev) => {
      const scope = new Set(visibleGoalIds);
      const nowIso = new Date().toISOString();
      let next = prev.assignedGoals.map((ag) => {
        if (!scope.has(ag.goalId)) return ag;
        if (complete) {
          return ag.completed
            ? ag
            : { ...ag, completed: true, completedAt: ag.completedAt || nowIso };
        }
        return { ...ag, completed: false, completedAt: undefined };
      });
      if (complete) {
        const existingIds = new Set(next.map((ag) => ag.goalId));
        const additions = visibleGoalIds
          .filter((id) => !existingIds.has(id))
          .map((id) => ({ goalId: id, completed: true, completedAt: nowIso }));
        if (additions.length) next = [...next, ...additions];
      }
      return { ...prev, assignedGoals: next };
    });
  };

  const [busy, setBusy] = useState(false);

  const handleConfirmSave = async () => {
    setBusy(true);
    await onSave(formData);
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 bg-base-900/60 backdrop-blur-md z-[60] flex justify-center items-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-xl shadow-soft w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden relative"
      >
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-xl font-black text-foreground">
            {student ? "Edit Credentials" : "Enroll Student"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-xl transition-colors"
          >
            <X className="h-6 w-6 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex flex-col lg:flex-row gap-8">
          {/* Biodata */}
          <div className="w-full lg:w-80 space-y-6">
            <div className="text-center">
              <div className="relative inline-block group">
                <Avatar
                  src={formData.photo}
                  alt="Avatar"
                  className="w-32 h-32 rounded-xl border-4 border-card bg-secondary shadow-md object-cover"
                  wrapperClassName="w-32 h-32"
                />
                <ImageUploader
                  folder="avatars"
                  aspectRatio={1}
                  onUploadSuccess={(url) =>
                    setFormData((prev) => ({ ...prev, photo: url }))
                  }
                  trigger={
                    <button
                      type="button"
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-foreground/60 p-3 rounded-full text-background opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow-soft"
                      title="Unggah Foto"
                    >
                      <ImageIcon className="w-6 h-6" />
                    </button>
                  }
                  className="absolute inset-0 z-10"
                />
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 w-max">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((p) => ({
                        ...p,
                        photo: `https://api.dicebear.com/7.x/bottts/svg?seed=${Math.floor(Math.random() * 1000)}&backgroundColor=d1d4f9`,
                      }))
                    }
                    className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
                  >
                    Robot
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((p) => ({
                        ...p,
                        photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || "S")}&background=random`,
                      }))
                    }
                    className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
                  >
                    Inisial
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((p) => ({
                        ...p,
                        photo: `https://api.dicebear.com/7.x/shapes/svg?seed=${Math.floor(Math.random() * 1000)}&backgroundColor=random`,
                      }))
                    }
                    className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
                  >
                    Bentuk
                  </button>
                </div>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-12">
                Profile Identity
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                  Photo URL (Optional)
                </label>
                <input
                  type="text"
                  className="w-full bg-secondary border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/50"
                  placeholder="Paste image URL here"
                  value={formData.photo}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, photo: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  className="w-full bg-secondary border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/50"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                  Short Bio
                </label>
                <textarea
                  rows={2}
                  className="w-full bg-secondary border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/50"
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, bio: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                  Tag (Untuk Pencarian)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(formData.tags || []).map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1"
                    >
                      {tag}{" "}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeTag(tag)}
                      />
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  className="w-full bg-secondary border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/50"
                  placeholder="Ketik tag dan tekan Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Goal Selector — flattened: Group (Combobox) → Category (Tabs) → Goals */}
          <div className="flex-1 border-border lg:border-l lg:pl-8 pt-8 lg:pt-0 min-w-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <div>
                <h3 className="text-lg font-black text-foreground">
                  Penugasan Kategori
                </h3>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mt-1">
                  Atur tugas untuk Santri ini
                </p>
              </div>
              {/* Group Combobox */}
              <Popover open={groupPickerOpen} onOpenChange={setGroupPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 bg-secondary rounded-xl h-10 px-4 text-xs font-bold text-foreground hover:bg-secondary/80 transition-colors min-w-[220px] justify-between"
                  >
                    <span className="inline-flex items-center gap-2 truncate">
                      <Layers className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{activeGroupName}</span>
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[260px] z-[200]" align="end">
                  <Command>
                    <CommandInput placeholder="Cari grup..." />
                    <CommandList>
                      <CommandEmpty>Tidak ada grup.</CommandEmpty>
                      <CommandGroup>
                        {tree.map((node) => (
                          <CommandItem
                            key={node.group.id}
                            value={node.group.name}
                            onSelect={() => {
                              setSelectedGroupId(node.group.id);
                              setSelectedCategoryId(null);
                              setGroupPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                node.group.id === activeGroupNode?.group.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <span className="truncate">{node.group.name}</span>
                            <span className="ml-auto text-[10px] font-bold text-muted-foreground">
                              {node.categories.flatMap((c) => c.goals).length}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Category chips (horizontal scroll) */}
            {activeCategories.length > 0 && (
              <div className="mb-4 -mx-1 px-1 overflow-x-auto scrollbar-hide">
                <div className="flex gap-2 min-w-max pb-1">
                  {activeCategories.map((catNode) => {
                    const cid = catNode.category.id;
                    const active = cid === activeCategoryNode?.category.id;
                    const assignedCount = catNode.goals.filter((g) =>
                      isAssigned(g.id),
                    ).length;
                    return (
                      <button
                        key={cid}
                        type="button"
                        onClick={() => setSelectedCategoryId(cid)}
                        className={cn(
                          "shrink-0 inline-flex items-center gap-2 px-4 h-9 rounded-full border text-xs font-bold whitespace-nowrap transition-all",
                          active
                            ? "bg-foreground text-background border-foreground"
                            : "bg-background border-border text-foreground/70 hover:border-foreground",
                        )}
                      >
                        <span>{catNode.category.name}</span>
                        <span
                          className={cn(
                            "text-[10px] font-black px-1.5 rounded-full",
                            active
                              ? "bg-background/20"
                              : "bg-secondary text-muted-foreground",
                          )}
                        >
                          {assignedCount}/{catNode.goals.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bulk actions for the current track scope */}
            {visibleGoalIds.length > 0 && (
              <div className="mb-4 p-3 rounded-2xl bg-secondary/30 border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Pilih Semua di{" "}
                  <span className="text-primary">{scopeLabel}</span>
                  <span className="ml-2 normal-case tracking-normal font-bold text-muted-foreground">
                    · {visibleAssignedCount}/{visibleGoalIds.length} assigned ·{" "}
                    {visibleCompletedCount} completed
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => requestBulkAssigned(!allVisibleAssigned)}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all ${
                      allVisibleAssigned
                        ? "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                    title={
                      allVisibleAssigned
                        ? "Hapus semua yang terlihat"
                        : "Tugaskan semua yang terlihat"
                    }
                  >
                    {allVisibleAssigned ? (
                      <Square className="w-4 h-4" />
                    ) : (
                      <CheckSquare className="w-4 h-4" />
                    )}
                    {allVisibleAssigned ? "Hapus Semua" : "Tugaskan Semua"}
                  </button>
                  <button
                    type="button"
                    onClick={() => requestBulkCompleted(!allVisibleCompleted)}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all ${
                      allVisibleCompleted
                        ? "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        : "bg-[var(--accent)] text-[var(--accent-foreground)] hover:brightness-95"
                    }`}
                    title={
                      allVisibleCompleted
                        ? "Batalkan Selesai"
                        : "Tandai Selesai"
                    }
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {allVisibleCompleted
                      ? "Batalkan Selesai Semua"
                      : "Tandai Semua Selesai"}
                  </button>
                </div>
              </div>
            )}

            {/* Flat goal list for the active Group + Category */}
            <div className="space-y-2 pb-4">
              {displayedMasterGoals.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  Tidak ada tugas pada kategori ini.
                </div>
              ) : (
                displayedMasterGoals.map((mg: any, index: number) => {
                  const assigned = isAssigned(mg.id);
                  const completed = isCompleted(mg.id);
                  const ag = formData.assignedGoals.find(
                    (a) => a.goalId === mg.id,
                  );
                  return (
                    <GoalAuditCard
                      key={`${mg.id}-${index}`}
                      goal={mg}
                      assigned={assigned}
                      completed={completed}
                      assignedGoal={ag}
                      admins={admins}
                      currentAdmin={currentAdmin}
                      onToggleAssign={() => toggleAssignment(mg.id)}
                      onApplyCompletion={(payload) =>
                        applyCompletionToGoal(mg.id, payload)
                      }
                      onUnmark={() => unmarkCompletion(mg.id)}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border bg-secondary/30 flex justify-end gap-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl font-bold h-12"
          >
            Batal
          </Button>
          <Button
            onClick={handleConfirmSave}
            disabled={busy}
            className="rounded-xl font-bold h-12 shadow-primary-glow min-w-[200px]"
          >
            {busy ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Konfirmasi Perubahan"
            )}
          </Button>
        </div>
      </motion.div>
      <ConfirmModal
        isOpen={!!bulkConfirm}
        title={bulkConfirm?.title || ""}
        message={bulkConfirm?.message || ""}
        onConfirm={() => bulkConfirm?.onConfirm()}
        onCancel={() => setBulkConfirm(null)}
      />
    </div>
  );
}
