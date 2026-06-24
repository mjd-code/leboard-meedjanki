import React, { useState, useMemo } from "react";
import {
  Target,
  ChevronUp,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  FolderTree,
  Layers,
} from "lucide-react";
import { apiFetch } from "../../lib/api";
import { motion, AnimatePresence } from "motion/react";
import { ConfirmModal } from "../ui/ConfirmModal";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PopoverSelect } from "@/components/ui/PopoverSelect";
import { SimpleMenu } from "../ui/SimpleMenu";
import type { Category, MasterGoal, Group } from "../../lib/types";
import {
  buildHierarchy,
  moveItem,
  persistReorder,
  sortByOrder,
  FALLBACK_GROUP_ID,
  FALLBACK_CATEGORY_ID,
  type HierarchyGroupNode,
} from "@/lib/hierarchy";
import { DragHandle, SortableRow } from "./editor/sortable";
import {
  DndContext,
  closestCenter,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

// ---------------------------------------------------------------------------
// AdminGoalsTab — 3-tier accordion: Group → Category → Goal.
// All three levels are user-orderable via ▲▼ buttons. Reorder calls hit
// /api/{groups|categories|masterGoals}/reorder with the full ordered ID list.
// ---------------------------------------------------------------------------

export function AdminGoalsTab({
  masterGoals,
  refreshData,
  categories,
  groups = [],
}: {
  masterGoals: MasterGoal[];
  categories: Category[];
  groups?: Group[];
  refreshData: () => void;
}) {
  // ---- modals ------------------------------------------------------------
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editGoalData, setEditGoalData] = useState<MasterGoal | null>(null);
  const [goalDefaultCategoryId, setGoalDefaultCategoryId] = useState<
    string | null
  >(null);
  const [deleteGoalConfirm, setDeleteGoalConfirm] = useState<MasterGoal | null>(
    null,
  );

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editGroupData, setEditGroupData] = useState<Group | null>(null);
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState<Group | null>(
    null,
  );

  const [editCatData, setEditCatData] = useState<Category | null>(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editCatGroupId, setEditCatGroupId] = useState<string | null>(null);
  const [deleteCatConfirm, setDeleteCatConfirm] = useState<Category | null>(
    null,
  );

  const [newGroupName, setNewGroupName] = useState("");
  const [catDraftByGroup, setCatDraftByGroup] = useState<
    Record<string, string>
  >({});

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  const tree: HierarchyGroupNode[] = useMemo(
    () => buildHierarchy(groups, categories, masterGoals),
    [groups, categories, masterGoals],
  );

  const toggleGroup = (id: string) =>
    setExpandedGroups((p) => ({ ...p, [id]: !p[id] }));
  const toggleCat = (id: string) =>
    setExpandedCats((p) => ({ ...p, [id]: !p[id] }));

  // ---- GROUP CRUD --------------------------------------------------------
  const addGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    const order = (sortByOrder(groups).slice(-1)[0]?.order ?? -1) + 1;
    const res = await apiFetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, order }),
    });
    if (!res.ok) alert(`Gagal membuat grup: ${res.statusText}`);
    else {
      setNewGroupName("");
      refreshData();
    }
  };

  const saveGroup = async (g: Group) => {
    const url = g.id ? `/api/groups/${g.id}` : "/api/groups";
    const method = g.id ? "PUT" : "POST";
    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(g),
    });
    if (!res.ok) alert(`Gagal menyimpan grup: ${res.statusText}`);
    else {
      setGroupModalOpen(false);
      setEditGroupData(null);
      refreshData();
    }
  };

  const executeDeleteGroup = async () => {
    if (!deleteGroupConfirm) return;
    const res = await apiFetch(`/api/groups/${deleteGroupConfirm.id}`, {
      method: "DELETE",
    });
    if (!res.ok) alert(`Gagal menghapus: ${res.statusText}`);
    setDeleteGroupConfirm(null);
    refreshData();
  };

  // ---- CATEGORY CRUD -----------------------------------------------------
  const addCategoryToGroup = async (groupId: string) => {
    const name = (catDraftByGroup[groupId] || "").trim();
    if (!name) return;
    const siblings = categories.filter(
      (c) => (c.groupId || FALLBACK_GROUP_ID) === groupId,
    );
    const order = (sortByOrder(siblings).slice(-1)[0]?.order ?? -1) + 1;
    const body: any = { name, order };
    if (groupId !== FALLBACK_GROUP_ID) body.groupId = groupId;
    const res = await apiFetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) alert(`Gagal membuat kategori: ${res.statusText}`);
    else {
      setCatDraftByGroup((p) => ({ ...p, [groupId]: "" }));
      refreshData();
    }
  };

  const saveCategory = async (cat: Category) => {
    const isNew = !cat.id;
    const url = isNew ? `/api/categories` : `/api/categories/${cat.id}`;
    const res = await apiFetch(url, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cat),
    });
    if (!res.ok) alert(`Gagal menyimpan kategori: ${res.statusText}`);
    else {
      setCatModalOpen(false);
      setEditCatData(null);
      setEditCatGroupId(null);
      refreshData();
    }
  };

  const executeDeleteCategory = async () => {
    if (!deleteCatConfirm) return;
    const res = await apiFetch(`/api/categories/${deleteCatConfirm.id}`, {
      method: "DELETE",
    });
    if (!res.ok) alert(`Gagal menghapus: ${res.statusText}`);
    setDeleteCatConfirm(null);
    refreshData();
  };

  // ---- GOAL CRUD ---------------------------------------------------------
  const handleSaveGoal = async (formData: MasterGoal) => {
    const isNew = !formData.id;
    const url = isNew ? "/api/masterGoals" : `/api/masterGoals/${formData.id}`;
    const res = await apiFetch(url, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!res.ok) alert(`Gagal menyimpan: ${res.statusText}`);
    else {
      refreshData();
      setGoalModalOpen(false);
    }
  };

  const executeDeleteGoal = async () => {
    if (!deleteGoalConfirm) return;
    const res = await apiFetch(`/api/masterGoals/${deleteGoalConfirm.id}`, {
      method: "DELETE",
    });
    if (!res.ok) alert(`Gagal menghapus: ${res.statusText}`);
    setDeleteGoalConfirm(null);
    refreshData();
  };

  // ---- REORDER (▲▼ buttons) --------------------------------------------
  const reorderGroups = async (id: string, dir: -1 | 1) => {
    const ordered = moveItem(sortByOrder(groups), id, dir);
    if (ordered === groups) return;
    try {
      await persistReorder("/api/groups/reorder", ordered);
    } finally {
      refreshData();
    }
  };
  const reorderCategories = async (
    groupId: string,
    id: string,
    dir: -1 | 1,
  ) => {
    const siblings = sortByOrder(
      categories.filter((c) => (c.groupId || FALLBACK_GROUP_ID) === groupId),
    );
    const ordered = moveItem(siblings, id, dir);
    if (ordered === siblings) return;
    try {
      await persistReorder("/api/categories/reorder", ordered, { groupId });
    } finally {
      refreshData();
    }
  };
  const reorderGoals = async (categoryId: string, id: string, dir: -1 | 1) => {
    const siblings = sortByOrder(
      masterGoals.filter((g) => {
        if (g.categoryId) return g.categoryId === categoryId;
        const cat = categories.find(
          (c) =>
            c.name &&
            g.categoryName &&
            c.name.toLowerCase() === g.categoryName.toLowerCase(),
        );
        return cat
          ? cat.id === categoryId
          : categoryId === FALLBACK_CATEGORY_ID;
      }),
    );
    const ordered = moveItem(siblings, id, dir);
    if (ordered === siblings) return;
    try {
      await persistReorder("/api/masterGoals/reorder", ordered, { categoryId });
    } finally {
      refreshData();
    }
  };

  // ---- DnD persistence (full ordered list) -------------------------------
  const persistGroupOrder = async (next: { id: string }[]) => {
    try {
      await persistReorder("/api/groups/reorder", next);
    } finally {
      refreshData();
    }
  };
  const persistCategoryOrder = async (
    groupId: string,
    next: { id: string }[],
  ) => {
    try {
      await persistReorder("/api/categories/reorder", next, { groupId });
    } finally {
      refreshData();
    }
  };
  const persistGoalOrder = async (
    categoryId: string,
    next: { id: string }[],
  ) => {
    try {
      await persistReorder("/api/masterGoals/reorder", next, { categoryId });
    } finally {
      refreshData();
    }
  };

  // Cross-category goal move: PUT goal with new category, then reorder both lists.
  const moveGoalToCategory = async (
    goalId: string,
    destCategoryId: string,
    destIndex: number,
  ) => {
    const goal = masterGoals.find((g) => g.id === goalId);
    if (!goal) return;
    const destCat = categories.find((c) => c.id === destCategoryId);

    // Resolve current category id for the goal.
    const srcCategoryId =
      goal.categoryId ||
      categories.find(
        (c) =>
          c.name &&
          goal.categoryName &&
          c.name.toLowerCase() === goal.categoryName.toLowerCase(),
      )?.id ||
      FALLBACK_CATEGORY_ID;

    if (srcCategoryId === destCategoryId) return;

    try {
      await apiFetch(`/api/masterGoals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...goal,
          categoryId:
            destCategoryId === FALLBACK_CATEGORY_ID ? null : destCategoryId,
          categoryName: destCat?.name || goal.categoryName,
        }),
      });
    } catch (e) {
      console.warn("move goal failed", e);
    }

    // Build dest list with new goal inserted at destIndex.
    const destSiblings = sortByOrder(
      masterGoals.filter((g) => {
        if (g.id === goalId) return false;
        if (g.categoryId) return g.categoryId === destCategoryId;
        const cat = categories.find(
          (c) =>
            c.name &&
            g.categoryName &&
            c.name.toLowerCase() === g.categoryName.toLowerCase(),
        );
        return cat
          ? cat.id === destCategoryId
          : destCategoryId === FALLBACK_CATEGORY_ID;
      }),
    );
    const destNext = [...destSiblings];
    destNext.splice(Math.min(destIndex, destNext.length), 0, {
      ...goal,
      id: goalId,
    } as MasterGoal);
    await persistGoalOrder(
      destCategoryId,
      destNext.map((g) => ({ id: g.id })),
    );

    // Reorder src list (without moved goal) so its order stays compact.
    const srcSiblings = sortByOrder(
      masterGoals.filter((g) => {
        if (g.id === goalId) return false;
        if (g.categoryId) return g.categoryId === srcCategoryId;
        const cat = categories.find(
          (c) =>
            c.name &&
            g.categoryName &&
            c.name.toLowerCase() === g.categoryName.toLowerCase(),
        );
        return cat
          ? cat.id === srcCategoryId
          : srcCategoryId === FALLBACK_CATEGORY_ID;
      }),
    );
    if (srcCategoryId !== FALLBACK_CATEGORY_ID) {
      await persistGoalOrder(
        srcCategoryId,
        srcSiblings.map((g) => ({ id: g.id })),
      );
    }
  };

  // ---- RENDER ------------------------------------------------------------
  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
          <h3 className="text-2xl font-black text-foreground underline decoration-primary decoration-4 underline-offset-8">
            Grup, Kategori & Tugas
          </h3>
          <p className="text-muted-foreground text-sm mt-3">
            Kelola hierarki 3 tingkat dengan urutan kustom.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addGroup();
            }}
            className="flex items-center gap-2 flex-col sm:flex-row w-full sm:w-auto"
          >
            <Input
              type="text"
              placeholder="Nama Grup Baru (mis. Kelas 1)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="h-12 rounded-xl border-border bg-card shadow-soft w-full sm:w-56 font-bold"
            />
            <Button
              type="submit"
              className="h-12 w-full sm:w-auto rounded-xl shadow-primary-glow font-bold"
            >
              <Layers className="h-4 w-4 mr-2" />
              Grup Baru
            </Button>
          </form>
          <Button
            onClick={() => {
              setEditGoalData(null);
              setGoalDefaultCategoryId(null);
              setGoalModalOpen(true);
            }}
            className="h-12 w-full sm:w-auto rounded-xl shadow-primary-glow font-bold"
          >
            <Target className="h-4 w-4 mr-2" /> Tugas Baru
          </Button>
        </div>
      </div>

      <UnifiedHierarchyDnd
        tree={tree}
        groups={groups}
        categories={categories}
        masterGoals={masterGoals}
        persistGroupOrder={persistGroupOrder}
        persistCategoryOrder={persistCategoryOrder}
        persistGoalOrder={persistGoalOrder}
        moveGoalToCategory={moveGoalToCategory}
        moveCategoryToGroup={async (catId, destGroupId, destIndex) => {
          // Optimistic-ish: send full ordered list of dest group with new cat inserted at index, plus updated categoryGroup PUT.
          const cat = categories.find((c) => c.id === catId);
          if (!cat) return;
          const srcGroupId = cat.groupId || FALLBACK_GROUP_ID;
          // Update category's groupId
          try {
            await apiFetch(`/api/categories/${catId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...cat,
                groupId: destGroupId === FALLBACK_GROUP_ID ? null : destGroupId,
              }),
            });
          } catch (e) {
            console.warn("move category failed", e);
          }
          // Reorder destination
          const destSiblings = sortByOrder(
            categories.filter(
              (c) =>
                (c.groupId || FALLBACK_GROUP_ID) === destGroupId &&
                c.id !== catId,
            ),
          );
          const destNext = [...destSiblings];
          destNext.splice(Math.min(destIndex, destNext.length), 0, {
            ...cat,
            groupId: destGroupId,
          });
          await persistCategoryOrder(
            destGroupId,
            destNext.map((c) => ({ id: c.id })),
          );
          if (srcGroupId !== destGroupId) {
            const srcNext = sortByOrder(
              categories.filter(
                (c) =>
                  (c.groupId || FALLBACK_GROUP_ID) === srcGroupId &&
                  c.id !== catId,
              ),
            );
            await persistCategoryOrder(
              srcGroupId,
              srcNext.map((c) => ({ id: c.id })),
            );
          }
        }}
        renderGroupHeader={(node, gi) => {
          const isSystem = node.group.isSystem;
          return (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {!isSystem && <DragHandle />}
                {node.group.icon ? (
                  <span className="text-2xl leading-none shrink-0" aria-hidden>
                    {node.group.icon}
                  </span>
                ) : (
                  <Layers className="h-5 w-5 text-primary shrink-0" />
                )}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-black text-foreground truncate">
                    {node.group.name}
                  </span>
                  {node.group.description && (
                    <span className="text-[11px] text-muted-foreground/90 italic truncate max-w-[42ch]">
                      {node.group.description}
                    </span>
                  )}
                  <span className="text-muted-foreground text-xs font-bold">
                    {node.categories.length} kategori ·{" "}
                    {node.categories.reduce((n, c) => n + c.goals.length, 0)}{" "}
                    tugas
                  </span>
                </div>
              </div>
              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {!isSystem && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Pindah ke atas"
                      className="hidden lg:inline"
                      disabled={gi === 0}
                      onClick={() => reorderGroups(node.group.id, -1)}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Pindah ke bawah"
                      className="hidden lg:inline"
                      disabled={gi >= tree.length - 1}
                      onClick={() => reorderGroups(node.group.id, 1)}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <SimpleMenu
                      options={[
                        {
                          label: "Edit Grup",
                          onClick: () => {
                            setEditGroupData(node.group);
                            setGroupModalOpen(true);
                          },
                          icon: (
                            <Edit2 className="w-4 h-4 text-muted-foreground" />
                          ),
                        },
                        {
                          label: "Hapus Grup",
                          onClick: () => setDeleteGroupConfirm(node.group),
                          icon: (
                            <Trash2 className="w-4 h-4 text-destructive/70" />
                          ),
                          variant: "destructive" as const,
                        },
                      ]}
                    />
                  </>
                )}
                {expandedGroups[node.group.id] === true ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground ml-1" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground ml-1" />
                )}
              </div>
            </div>
          );
        }}
        isGroupExpanded={(id) => expandedGroups[id] === true}
        toggleGroup={toggleGroup}
        renderGroupBody={(node) => {
          const isSystem = node.group.isSystem;
          return (
            <CardContent className="p-4 pt-3 border-t border-border/40 bg-background space-y-3">
              {!isSystem && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addCategoryToGroup(node.group.id);
                  }}
                  className="flex gap-2"
                >
                  <Input
                    type="text"
                    placeholder="Nama Kategori Baru"
                    value={catDraftByGroup[node.group.id] || ""}
                    onChange={(e) =>
                      setCatDraftByGroup((p) => ({
                        ...p,
                        [node.group.id]: e.target.value,
                      }))
                    }
                    className="h-10 rounded-xl border-border bg-card font-bold"
                  />
                  <Button type="submit" className="h-10 rounded-xl">
                    <Plus className="h-4 w-4 mr-1" /> Kategori
                  </Button>
                </form>
              )}
              {node.categories.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-4">
                  Belum ada kategori di grup ini. Seret kategori ke sini untuk
                  memindahkan.
                </p>
              )}
            </CardContent>
          );
        }}
        renderCategory={(node, catNode, ci) => {
          const catId = catNode.category.id;
          const catExpanded = expandedCats[catId] === true;
          const isFallbackCat = catId === FALLBACK_CATEGORY_ID;
          return (
            <Card
              key={catId}
              className="rounded-xl border-border overflow-hidden"
            >
              <CardHeader
                className="p-3 cursor-pointer hover:bg-secondary/20 transition-colors flex flex-row items-center justify-between space-y-0"
                onClick={() => toggleCat(catId)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {!isFallbackCat && <DragHandle />}
                  <FolderTree className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-foreground truncate">
                      {catNode.category.name}
                    </span>
                    {catNode.category.description && (
                      <span className="text-[11px] text-muted-foreground/90 italic truncate max-w-[48ch]">
                        {catNode.category.description}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground font-bold">
                      {catNode.goals.length} tugas
                    </span>
                  </div>
                </div>
                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!isFallbackCat && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Pindah ke atas"
                        className="hidden lg:inline"
                        disabled={ci === 0}
                        onClick={() =>
                          reorderCategories(node.group.id, catId, -1)
                        }
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Pindah ke bawah"
                        className="hidden lg:inline"
                        disabled={ci >= node.categories.length - 1}
                        onClick={() =>
                          reorderCategories(node.group.id, catId, 1)
                        }
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditGoalData(null);
                          setGoalDefaultCategoryId(catId);
                          setGoalModalOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Tugas
                      </Button>
                      <SimpleMenu
                        options={[
                          {
                            label: "Edit",
                            onClick: () => {
                              setEditCatData(catNode.category);
                              setEditCatGroupId(node.group.id);
                              setCatModalOpen(true);
                            },
                            icon: (
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            ),
                          },
                          {
                            label: "Delete",
                            onClick: () =>
                              setDeleteCatConfirm(catNode.category),
                            icon: (
                              <Trash2 className="w-4 h-4 text-destructive/70" />
                            ),
                            variant: "destructive" as const,
                          },
                        ]}
                      />
                    </>
                  )}
                  {catExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />
                  )}
                </div>
              </CardHeader>
              <AnimatePresence initial={false}>
                {catExpanded && (
                  <motion.div
                    layout
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: "hidden" }}
                  >
                    <CardContent className="p-3 pt-0 border-t border-border/40 bg-card">
                      <GoalGridDropZone
                        categoryId={catId}
                        isEmpty={catNode.goals.length === 0}
                      >
                        <SortableContext
                          items={catNode.goals.map((g) => `t:${g.id}`)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                            {catNode.goals.map((mg: MasterGoal) => (
                              <SortableRow key={mg.id} id={`t:${mg.id}`}>
                                <Card className="rounded-xl border border-border shadow-none hover:shadow-soft transition-shadow group relative">
                                  <CardContent className="p-3 space-y-2">
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="flex items-start gap-1 flex-1 pt-1">
                                        <DragHandle />
                                        <h4
                                          className="font-bold text-sm text-foreground leading-tight flex-1"
                                          title={mg.title}
                                        >
                                          {mg.title}
                                        </h4>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <div className="bg-primary/10 px-2 py-1 rounded-lg text-xs font-black text-primary">
                                          +{mg.points ?? 0}
                                        </div>
                                        <SimpleMenu
                                          options={[
                                            {
                                              label: "Edit",
                                              onClick: () => {
                                                setEditGoalData(mg);
                                                setGoalDefaultCategoryId(
                                                  mg.categoryId || catId,
                                                );
                                                setGoalModalOpen(true);
                                              },
                                              icon: (
                                                <Edit2 className="w-4 h-4 text-muted-foreground" />
                                              ),
                                            },
                                            {
                                              label: "Delete",
                                              onClick: () =>
                                                setDeleteGoalConfirm(mg),
                                              icon: (
                                                <Trash2 className="w-4 h-4 text-destructive/70" />
                                              ),
                                              variant: "destructive" as const,
                                            },
                                          ]}
                                        />
                                      </div>
                                    </div>
                                    {mg.description && (
                                      <p
                                        className="text-xs text-muted-foreground italic leading-relaxed line-clamp-2"
                                        title={mg.description}
                                      >
                                        {mg.description}
                                      </p>
                                    )}
                                  </CardContent>
                                </Card>
                              </SortableRow>
                            ))}
                          </div>
                        </SortableContext>
                      </GoalGridDropZone>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        }}
      />

      {goalModalOpen && (
        <GoalAdminModal
          goal={editGoalData}
          categories={categories}
          groups={groups}
          defaultCategoryId={goalDefaultCategoryId}
          onClose={() => setGoalModalOpen(false)}
          onSave={handleSaveGoal}
        />
      )}

      {groupModalOpen && (
        <GroupAdminModal
          group={editGroupData}
          onClose={() => {
            setGroupModalOpen(false);
            setEditGroupData(null);
          }}
          onSave={saveGroup}
        />
      )}

      {catModalOpen && (
        <CategoryAdminModal
          category={editCatData}
          groupId={editCatGroupId}
          groups={groups}
          onClose={() => {
            setCatModalOpen(false);
            setEditCatData(null);
            setEditCatGroupId(null);
          }}
          onSave={saveCategory}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteGoalConfirm}
        title="Hapus Tugas Utama"
        message={`Hapus "${deleteGoalConfirm?.title}"? Santri akan tetap menyimpan referensi tetapi tidak akan disinkronkan.`}
        onConfirm={executeDeleteGoal}
        onCancel={() => setDeleteGoalConfirm(null)}
      />
      <ConfirmModal
        isOpen={!!deleteCatConfirm}
        title="Hapus Kategori"
        message={`Hapus "${deleteCatConfirm?.name}"? Tugas di kategori ini akan dipindahkan ke "Tidak Diketahui".`}
        onConfirm={executeDeleteCategory}
        onCancel={() => setDeleteCatConfirm(null)}
      />
      <ConfirmModal
        isOpen={!!deleteGroupConfirm}
        title="Hapus Grup"
        message={`Hapus grup "${deleteGroupConfirm?.name}"? Kategori di dalamnya akan dipindahkan ke "Tanpa Grup".`}
        onConfirm={executeDeleteGroup}
        onCancel={() => setDeleteGroupConfirm(null)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// UnifiedHierarchyDnd — single DndContext that owns Groups (sortable) and
// Categories (sortable AND cross-group movable). Goals render their own
// SortableList inside each category, fully isolated.
// ---------------------------------------------------------------------------
type CatMoveFn = (
  catId: string,
  destGroupId: string,
  destIndex: number,
) => Promise<void> | void;
type GoalMoveFn = (
  goalId: string,
  destCategoryId: string,
  destIndex: number,
) => Promise<void> | void;

function UnifiedHierarchyDnd({
  tree,
  groups,
  categories,
  masterGoals,
  persistGroupOrder,
  persistCategoryOrder,
  persistGoalOrder,
  moveCategoryToGroup,
  moveGoalToCategory,
  renderGroupHeader,
  renderGroupBody,
  renderCategory,
  isGroupExpanded,
  toggleGroup,
}: {
  tree: HierarchyGroupNode[];
  groups: Group[];
  categories: Category[];
  masterGoals: MasterGoal[];
  persistGroupOrder: (next: { id: string }[]) => Promise<void> | void;
  persistCategoryOrder: (
    groupId: string,
    next: { id: string }[],
  ) => Promise<void> | void;
  persistGoalOrder: (
    categoryId: string,
    next: { id: string }[],
  ) => Promise<void> | void;
  moveCategoryToGroup: CatMoveFn;
  moveGoalToCategory: GoalMoveFn;
  renderGroupHeader: (node: HierarchyGroupNode, gi: number) => React.ReactNode;
  renderGroupBody: (node: HierarchyGroupNode) => React.ReactNode;
  renderCategory: (
    node: HierarchyGroupNode,
    catNode: HierarchyGroupNode["categories"][number],
    ci: number,
  ) => React.ReactNode;
  isGroupExpanded: (id: string) => boolean;
  toggleGroup: (id: string) => void;
}) {
  const [localTree, setLocalTree] = React.useState(tree);
  React.useEffect(() => setLocalTree(tree), [tree]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const catIdToGroupId = React.useMemo(() => {
    const m = new Map<string, string>();
    localTree.forEach((g) =>
      g.categories.forEach((c) => m.set(c.category.id, g.group.id)),
    );
    return m;
  }, [localTree]);

  const goalIdToCatId = React.useMemo(() => {
    const m = new Map<string, string>();
    localTree.forEach((g) =>
      g.categories.forEach((c) =>
        c.goals.forEach((goal) => m.set(goal.id, c.category.id)),
      ),
    );
    return m;
  }, [localTree]);

  const gid = (id: string) => `g:${id}`;
  const cid = (id: string) => `c:${id}`;
  const tid = (id: string) => `t:${id}`;
  const isGroupId = (id: string) => id.startsWith("g:");
  const isCatId = (id: string) => id.startsWith("c:");
  const isGoalId = (id: string) => id.startsWith("t:");
  const stripPrefix = (id: string) => id.slice(2);

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const aId = String(active.id);
    const oId = String(over.id);
    if (aId === oId) return;

    // ---- GOAL DRAG (cross-category supported) ----------------------------
    if (isGoalId(aId)) {
      const goalRaw = stripPrefix(aId);
      const srcCat = goalIdToCatId.get(goalRaw);
      if (!srcCat) return;

      let destCat: string | undefined;
      let destIndex = 0;
      if (isGoalId(oId)) {
        destCat = goalIdToCatId.get(stripPrefix(oId));
        if (!destCat) return;
        const sib =
          localTree
            .flatMap((g) => g.categories)
            .find((c) => c.category.id === destCat)?.goals || [];
        destIndex = sib.findIndex((g) => g.id === stripPrefix(oId));
        if (destIndex < 0) destIndex = sib.length;
      } else if (oId.startsWith("gdrop:")) {
        destCat = oId.slice(6);
        const sib =
          localTree
            .flatMap((g) => g.categories)
            .find((c) => c.category.id === destCat)?.goals || [];
        destIndex = sib.length;
      } else if (isCatId(oId)) {
        destCat = stripPrefix(oId);
        const sib =
          localTree
            .flatMap((g) => g.categories)
            .find((c) => c.category.id === destCat)?.goals || [];
        destIndex = sib.length;
      }
      if (!destCat) return;

      setLocalTree((prev) => {
        const copy = prev.map((g) => ({
          ...g,
          categories: g.categories.map((c) => ({ ...c, goals: [...c.goals] })),
        }));
        const allCats = copy.flatMap((g) => g.categories);
        const sc = allCats.find((c) => c.category.id === srcCat);
        const dc = allCats.find((c) => c.category.id === destCat);
        if (!sc || !dc) return prev;
        const idx = sc.goals.findIndex((g) => g.id === goalRaw);
        if (idx < 0) return prev;
        const [moved] = sc.goals.splice(idx, 1);
        const insertAt = Math.min(destIndex, dc.goals.length);
        dc.goals.splice(insertAt, 0, moved);
        return copy;
      });

      if (srcCat === destCat) {
        const list =
          localTree
            .flatMap((g) => g.categories)
            .find((c) => c.category.id === srcCat)?.goals || [];
        const ids = list.map((g) => g.id);
        const oldIdx = ids.indexOf(goalRaw);
        const next = arrayMove(ids, oldIdx, destIndex);
        await persistGoalOrder(
          srcCat,
          next.map((id) => ({ id })),
        );
      } else {
        await moveGoalToCategory(goalRaw, destCat, destIndex);
      }
      return;
    }

    if (isGroupId(aId) && isGroupId(oId)) {
      const ids = localTree.map((g) => g.group.id);
      const oldIdx = ids.indexOf(stripPrefix(aId));
      const newIdx = ids.indexOf(stripPrefix(oId));
      if (oldIdx < 0 || newIdx < 0) return;
      const next = arrayMove(localTree, oldIdx, newIdx);
      setLocalTree(next);
      await persistGroupOrder(
        next.filter((n) => !n.group.isSystem).map((n) => ({ id: n.group.id })),
      );
      return;
    }

    if (isCatId(aId)) {
      const catRaw = stripPrefix(aId);
      const srcGroup = catIdToGroupId.get(catRaw);
      if (!srcGroup) return;

      let destGroup: string | undefined;
      let destIndex = 0;
      if (isCatId(oId)) {
        destGroup = catIdToGroupId.get(stripPrefix(oId));
        if (!destGroup) return;
        const destSiblings = localTree.find(
          (g) => g.group.id === destGroup,
        )!.categories;
        destIndex = destSiblings.findIndex(
          (c) => c.category.id === stripPrefix(oId),
        );
        if (destIndex < 0) destIndex = destSiblings.length;
      } else if (oId.startsWith("drop:")) {
        destGroup = oId.slice(5);
        destIndex =
          localTree.find((g) => g.group.id === destGroup)?.categories.length ??
          0;
      } else if (isGroupId(oId)) {
        destGroup = stripPrefix(oId);
        destIndex =
          localTree.find((g) => g.group.id === destGroup)?.categories.length ??
          0;
      }
      if (!destGroup) return;

      setLocalTree((prev) => {
        const copy = prev.map((g) => ({ ...g, categories: [...g.categories] }));
        const sg = copy.find((g) => g.group.id === srcGroup)!;
        const dg = copy.find((g) => g.group.id === destGroup)!;
        const idx = sg.categories.findIndex((c) => c.category.id === catRaw);
        if (idx < 0) return prev;
        const [moved] = sg.categories.splice(idx, 1);
        const insertAt = Math.min(destIndex, dg.categories.length);
        dg.categories.splice(insertAt, 0, moved);
        return copy;
      });

      if (srcGroup === destGroup) {
        const g = localTree.find((g) => g.group.id === srcGroup)!;
        const ids = g.categories.map((c) => c.category.id);
        const oldIdx = ids.indexOf(catRaw);
        const next = arrayMove(ids, oldIdx, destIndex);
        await persistCategoryOrder(
          srcGroup,
          next.map((id) => ({ id })),
        );
      } else {
        await moveCategoryToGroup(catRaw, destGroup, destIndex);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {localTree.length === 0 && (
          <Card className="rounded-xl p-8 text-center border-dashed">
            <p className="text-muted-foreground text-sm">
              Belum ada grup. Mulai dengan membuat grup pertama Anda.
            </p>
          </Card>
        )}
        <SortableContext
          items={localTree
            .filter((n) => !n.group.isSystem)
            .map((n) => gid(n.group.id))}
          strategy={verticalListSortingStrategy}
        >
          {localTree.map((node, gi) => {
            const expanded = isGroupExpanded(node.group.id);
            const isSystem = node.group.isSystem;
            const inner = (
              <Card className="rounded-xl shadow-soft border-border overflow-visible">
                <CardHeader
                  className="p-4 cursor-pointer hover:bg-secondary/20 transition-colors flex flex-row items-center justify-between space-y-0 bg-secondary/10"
                  onClick={() => toggleGroup(node.group.id)}
                >
                  {renderGroupHeader(node, gi)}
                </CardHeader>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      layout
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: "visible" }}
                    >
                      {renderGroupBody(node)}
                      <div className="px-4 pb-4">
                        <GroupCategoryDropZone
                          groupId={node.group.id}
                          isEmpty={node.categories.length === 0}
                        >
                          <SortableContext
                            items={node.categories.map((c) =>
                              cid(c.category.id),
                            )}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2">
                              {node.categories.map((catNode, ci) => {
                                const isFallbackCat =
                                  catNode.category.id === FALLBACK_CATEGORY_ID;
                                if (isFallbackCat) {
                                  return (
                                    <React.Fragment key={catNode.category.id}>
                                      {renderCategory(node, catNode, ci)}
                                    </React.Fragment>
                                  );
                                }
                                return (
                                  <SortableRow
                                    key={catNode.category.id}
                                    id={cid(catNode.category.id)}
                                  >
                                    {renderCategory(node, catNode, ci)}
                                  </SortableRow>
                                );
                              })}
                            </div>
                          </SortableContext>
                        </GroupCategoryDropZone>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );

            if (isSystem)
              return (
                <React.Fragment key={node.group.id}>{inner}</React.Fragment>
              );
            return (
              <SortableRow key={node.group.id} id={gid(node.group.id)}>
                {inner}
              </SortableRow>
            );
          })}
        </SortableContext>
      </div>
    </DndContext>
  );
}

function GroupCategoryDropZone({
  groupId,
  isEmpty,
  children,
}: {
  groupId: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `drop:${groupId}` });
  return (
    <div
      ref={setNodeRef}
      className={
        "rounded-xl transition-colors " +
        (isOver
          ? "bg-primary/5 ring-2 ring-primary/40 ring-offset-2 ring-offset-background "
          : "") +
        (isEmpty
          ? "min-h-[60px] border-2 border-dashed border-border/60 p-2"
          : "")
      }
    >
      {isEmpty ? (
        <p className="text-xs text-muted-foreground italic text-center py-3">
          Seret kategori ke sini.
        </p>
      ) : (
        children
      )}
    </div>
  );
}

function GoalGridDropZone({
  categoryId,
  isEmpty,
  children,
}: {
  categoryId: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `gdrop:${categoryId}` });
  return (
    <div
      ref={setNodeRef}
      className={
        "rounded-xl transition-colors " +
        (isOver
          ? "bg-primary/5 ring-2 ring-primary/40 ring-offset-2 ring-offset-background "
          : "") +
        (isEmpty
          ? "min-h-[80px] border-2 border-dashed border-border/60 p-3 mt-3"
          : "")
      }
    >
      {isEmpty ? (
        <p className="text-xs text-muted-foreground italic text-center py-4">
          Tidak ada tugas di kategori ini. Seret tugas ke sini.
        </p>
      ) : (
        children
      )}
    </div>
  );
}
function GroupAdminModal({
  group,
  onClose,
  onSave,
}: {
  group: Group | null;
  onClose: () => void;
  onSave: (g: Group) => void;
}) {
  const [name, setName] = useState(group?.name || "");
  const [order, setOrder] = useState(group?.order ?? 0);
  const [icon, setIcon] = useState(group?.icon || "");
  const [description, setDescription] = useState(group?.description || "");
  const [longDescription, setLongDescription] = useState(
    group?.longDescription || "",
  );
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex justify-center items-center p-4 overflow-y-auto">
      <Card className="w-full max-w-xl rounded-2xl shadow-2xl border-border bg-card my-8">
        <CardHeader className="p-6 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
              {icon || "📚"}
            </div>
            <div>
              <div className="font-black text-lg leading-tight">
                {group ? "Edit Program / Grup" : "Program / Grup Baru"}
              </div>
              <div className="text-xs text-muted-foreground">
                Akan tampil sebagai kartu Program di halaman publik
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-[88px_1fr] gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                Ikon
              </label>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🏫"
                maxLength={4}
                className="h-11 text-center text-xl"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                Nama Program
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="mis. Klasikal Diniyah Kelas 1-6"
                className="h-11"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
              Deskripsi Singkat
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="1-2 kalimat ringkas untuk kartu program."
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
              Deskripsi Lengkap
            </label>
            <Textarea
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              rows={5}
              placeholder="Paragraf detail program: filosofi, target, metode."
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
              Urutan
            </label>
            <Input
              type="number"
              value={String(order)}
              onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
              className="h-11 w-32"
            />
          </div>
        </CardContent>
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="rounded-xl h-11">
            Batal
          </Button>
          <Button
            onClick={() =>
              onSave({
                ...(group ?? { id: "", isSystem: false }),
                name,
                order,
                icon: icon || undefined,
                description: description || undefined,
                longDescription: longDescription || undefined,
              })
            }
            className="rounded-xl h-11 shadow-primary-glow"
          >
            Simpan
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ---- CATEGORY MODAL ------------------------------------------------------
function CategoryAdminModal({
  category,
  groupId,
  groups,
  onClose,
  onSave,
}: {
  category: Category | null;
  groupId: string | null;
  groups: Group[];
  onClose: () => void;
  onSave: (c: Category) => void;
}) {
  const [name, setName] = useState(category?.name || "");
  const [description, setDescription] = useState(category?.description || "");
  const [order, setOrder] = useState(category?.order ?? 0);
  const [grpId, setGrpId] = useState<string>(
    category?.groupId || groupId || groups[0]?.id || "",
  );
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex justify-center items-center p-4 overflow-y-auto">
      <Card className="w-full max-w-xl rounded-2xl shadow-2xl border-border bg-card my-8">
        <CardHeader className="p-6 border-b border-border bg-gradient-to-br from-accent/10 to-transparent">
          <div className="font-black text-lg leading-tight">
            {category ? "Edit Kategori / Fase" : "Kategori / Fase Baru"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Tampil sebagai fase kurikulum di kartu Program
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
              Nama Kategori / Fase
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mis. Fase Dasar: Kelas 1 - 2 (Ula)"
              className="h-11"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
              Deskripsi / Detail Kurikulum
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Materi yang dipelajari pada fase ini."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                Grup
              </label>
              <PopoverSelect
                value={grpId}
                onValueChange={setGrpId}
                options={sortByOrder(groups).map((g) => ({
                  value: g.id,
                  label: g.name,
                }))}
                placeholder="Pilih Grup"
                className="h-11 w-full"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                Urutan
              </label>
              <Input
                type="number"
                value={String(order)}
                onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                className="h-11"
              />
            </div>
          </div>
        </CardContent>
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="rounded-xl h-11">
            Batal
          </Button>
          <Button
            onClick={() =>
              onSave({
                ...(category ?? { id: "", name: "" }),
                name,
                description: description || undefined,
                groupId: grpId || undefined,
                order,
              })
            }
            className="rounded-xl h-11 shadow-primary-glow"
            disabled={!name.trim()}
          >
            Simpan
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ---- GOAL MODAL ----------------------------------------------------------
function GoalAdminModal({
  goal,
  categories,
  groups,
  defaultCategoryId,
  onClose,
  onSave,
}: {
  goal: MasterGoal | null;
  categories: Category[];
  groups: Group[];
  defaultCategoryId: string | null;
  onClose: () => void;
  onSave: (g: MasterGoal) => void;
}) {
  const initialCat =
    categories.find((c) => c.id === (goal?.categoryId || defaultCategoryId)) ||
    categories.find(
      (c) =>
        c.name &&
        goal?.categoryName &&
        c.name.toLowerCase() === goal.categoryName.toLowerCase(),
    ) ||
    categories[0];
  const [groupId, setGroupId] = useState<string>(
    initialCat?.groupId || groups[0]?.id || "",
  );
  const [categoryId, setCategoryId] = useState<string>(initialCat?.id || "");

  const filteredCats = useMemo(
    () => sortByOrder(categories.filter((c) => (c.groupId || "") === groupId)),
    [categories, groupId],
  );

  const [formData, setFormData] = useState<MasterGoal>({
    id: goal?.id || "",
    title: goal?.title || "",
    points: goal?.points ?? 10,
    categoryId: initialCat?.id,
    categoryName: initialCat?.name || goal?.categoryName || "",
    description: goal?.description || "",
    order: goal?.order,
  });

  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
    const cat = categories.find((c) => c.id === id);
    setFormData((p) => ({
      ...p,
      categoryId: id,
      categoryName: cat?.name || p.categoryName,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex justify-center items-center p-4">
      <Card className="w-full max-w-md rounded-xl shadow-2xl border-border bg-card overflow-hidden">
        <CardHeader className="p-6 border-b border-border">
          <div className="font-black text-lg text-foreground">
            {goal ? "Edit Tugas" : "Tugas Baru"}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
              Judul Tugas
            </label>
            <Input
              required
              value={formData.title}
              onChange={(e) =>
                setFormData((p) => ({ ...p, title: e.target.value }))
              }
              className="h-11"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                Grup
              </label>
              <PopoverSelect
                value={groupId}
                onValueChange={(v) => {
                  setGroupId(v);
                  const first = sortByOrder(
                    categories.filter((c) => c.groupId === v),
                  )[0];
                  if (first) handleCategoryChange(first.id);
                }}
                options={sortByOrder(groups).map((g) => ({
                  value: g.id,
                  label: g.name,
                }))}
                placeholder="Pilih Grup"
                className="h-11 w-full"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                Kategori
              </label>
              <PopoverSelect
                value={categoryId}
                onValueChange={handleCategoryChange}
                options={filteredCats.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                placeholder="Pilih Kategori"
                className="h-11 w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                Poin
              </label>
              <Input
                type="number"
                min="1"
                value={String(formData.points)}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    points: parseInt(e.target.value) || 0,
                  }))
                }
                className="h-11"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                Urutan
              </label>
              <Input
                type="number"
                value={String(formData.order ?? 0)}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    order: parseInt(e.target.value) || 0,
                  }))
                }
                className="h-11"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
              Deskripsi
            </label>
            <textarea
              rows={3}
              className="w-full bg-secondary/30 border border-border rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none resize-none"
              value={formData.description}
              onChange={(e) =>
                setFormData((p) => ({ ...p, description: e.target.value }))
              }
            />
          </div>
        </CardContent>
        <div className="p-6 border-t border-border bg-secondary/20 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-xl h-11 font-bold"
          >
            Batal
          </Button>
          <Button
            onClick={() => onSave(formData)}
            className="rounded-xl h-11 font-bold shadow-primary-glow"
          >
            Simpan Tugas
          </Button>
        </div>
      </Card>
    </div>
  );
}
