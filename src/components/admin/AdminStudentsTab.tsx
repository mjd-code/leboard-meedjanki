import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Image as ImageIcon, Save, Trash2, Edit2, Info, Loader2, Link as LinkIcon, Download, X, Search, Filter, ArrowUpAZ, ArrowDownAZ, TrendingUp, Plus, CheckSquare, Square, CheckCircle2, ArrowLeft, ZoomOut, ZoomIn, MoreHorizontal } from 'lucide-react';
import { ImageUploader } from '../ui/ImageUploader';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../../lib/api';
import { useUpdateStudentMutation } from '../../hooks/useAppQueries';
import { Avatar } from '../ui/custom-avatar';
import { StudentSearchFilter } from '../StudentSearchFilter';
import { applyStudentSearchFilter, emptyStudentSearchFilter } from '../StudentSearchFilter';
import { StudentSearchAdvanced } from '../StudentSearchAdvanced';
import { StudentSortDropdown, sortStudents, SortKey } from '../StudentSortDropdown';
import { dicebearAvatar } from '../ImageFallback';
import { ConfirmModal } from '../ui/ConfirmModal';
import type { Category, MasterGoal, AssignedGoal, Student } from '../../lib/types';
import { TimeRangeValue } from '../TimeRangeFilter';
import { StudentSearchFilterValue } from '../StudentSearchFilter';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { SimpleMenu } from '../ui/SimpleMenu';
import { ArrowUpDown } from 'lucide-react';

export function AdminStudentsTab({ students, refreshData, masterGoals, categories, calculateTotalPoints }: any) {
  const [searchFilter, setSearchFilter] = useState<StudentSearchFilterValue>(emptyStudentSearchFilter);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
  const updateStudentMutation = useUpdateStudentMutation();

  const studentsList = Array.isArray(students) ? students : [];
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    studentsList.forEach((s: any) => (s.tags || []).forEach((t: string) => t && set.add(t)));
    return Array.from(set);
  }, [studentsList]);
  const studentTagSource = useMemo(
    () => studentsList.map((s: any) => s.tags || []),
    [studentsList]
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
      const mapped = list.map(s => ({ ...s, totalPts: calculateTotalPoints(s.assignedGoals || []) }));
      mapped.sort((a,b) => b.totalPts - a.totalPts);
      return mapped.map((s, index) => ({ id: s.id, rank: index + 1 }));
    };
    
    const oldRanks = calculateRanks(studentsList);
    const oldRanksMap = Object.fromEntries(oldRanks.map(r => [r.id, r.rank]));

    const isNew = !formData.id;
    let finalData = { ...formData };
    if (!isNew && oldRanksMap[formData.id]) {
        finalData.previousRank = oldRanksMap[formData.id];
    }

    try {
      await updateStudentMutation.mutateAsync({ id: formData.id, data: finalData });
      refreshData();
      setModalOpen(false);
      alert('Data siswa berhasil disimpan!');
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    const res = await apiFetch(`/api/students/${deleteConfirm.id}`, { method: 'DELETE' });
    if (!res.ok) alert(`Failed to delete: ${res.statusText}`);
    setDeleteConfirm(null);
    refreshData();
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteIds || bulkDeleteIds.length === 0) return;
    try {
      await Promise.all(bulkDeleteIds.map(id => apiFetch(`/api/students/${id}`, { method: 'DELETE' })));
      setBulkDeleteIds(null);
      refreshData();
    } catch (err: any) {
      alert('Gagal menghapus beberapa siswa: ' + err.message);
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
        )
      },
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="flex items-center gap-4">
            <Avatar src={student.photo} alt={student.name} className="w-12 h-12" wrapperClassName="w-12 h-12" />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-foreground line-clamp-1">{student.name}</span>
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
            {student.assignedGoals?.length || 0} Tujuan Ditugaskan
          </div>
        );
      },
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.original.tags || [];
        if (tags.length === 0) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag: string, idx: number) => (
              <Badge key={idx} variant="secondary" className="bg-primary/10 text-primary border-0 rounded-md text-[10px] px-1.5 py-0.5">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="secondary" className="bg-secondary text-secondary-foreground border-0 rounded-md text-[10px] px-1.5 py-0.5">
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
            onClick: () => { setEditData(student); setModalOpen(true); },
            icon: <Edit2 className="w-4 h-4 text-muted-foreground" />
          },
          {
            label: "Hapus Siswa",
            onClick: () => setDeleteConfirm(student),
            icon: <Trash2 className="w-4 h-4 text-destructive/70" />,
            variant: "destructive" as const
          }
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
          <h3 className="text-2xl font-black text-foreground underline decoration-primary decoration-4 underline-offset-8">Daftar Siswa</h3>
          <p className="text-muted-foreground text-sm mt-3">Kelola profil dan tugas kompetensi dasar.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => { setEditData(null); setModalOpen(true); }} 
            className="rounded-xl h-12 flex-1 sm:flex-none shadow-primary-glow gap-2 font-bold"
          >
            <Plus className="h-4 w-4" /> Tambah Siswa
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <StudentSearchAdvanced
          value={searchFilter}
          onChange={setSearchFilter}
          sortKey={sortKey}
          onSortChange={setSortKey}
          availableTags={availableTags}
          studentTagSource={studentTagSource}
          placeholder="Cari siswa..."
        />
      </div>

      <DataTable 
        columns={columns} 
        data={filtered} 
        filterColumn="name" 
        filterPlaceholder="Filter siswa..." 
        onDeleteSelected={(ids) => setBulkDeleteIds(ids)}
      />

      {modalOpen && (
        <StudentAdminModal 
          student={editData} 
          masterGoals={masterGoals} 
          categories={categories} 
          onClose={() => setModalOpen(false)} 
          onSave={handleSave} 
        />
      )}
      
      <ConfirmModal 
        isOpen={!!deleteConfirm}
        title="Konfirmasi Hapus"
        message={`Apakah Anda yakin ingin menghapus data siswa "${deleteConfirm?.name}"? Aksi ini akan menghapus semua riwayat tujuan dan poin mereka. Operasi ini tidak dapat dibatalkan.`}
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      <ConfirmModal 
        isOpen={!!bulkDeleteIds}
        title="Konfirmasi Hapus Massal"
        message={`Apakah Anda yakin ingin menghapus kumpulan data sejumlah ${bulkDeleteIds?.length} siswa? Data poin dan perkembangan siswa juga akan terhapus. Operasi ini tidak dapat dibatalkan.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteIds(null)}
      />
    </div>
  );
}

// Student Edit Modal (Shared with initial but updated styles)
function StudentAdminModal({ student, masterGoals, categories, onClose, onSave }: any) {
  const [formData, setFormData] = useState<Student>({
    id: student?.id || '',
    name: student?.name || '',
    bio: student?.bio || '',
    photo: student?.photo || dicebearAvatar(student?.name || student?.id || 'student'),
    tags: student?.tags ? [...student.tags] : [],
    assignedGoals: student?.assignedGoals ? [...student.assignedGoals] : []
  });

  const [filterCat, setFilterCat] = useState('ALL');
  const [tagInput, setTagInput] = useState('');

  const addTag = () => {
    if (tagInput.trim() !== '' && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tagToRemove) }));
  };

  const displayedMasterGoals = filterCat === 'ALL' 
    ? masterGoals 
    : masterGoals.filter((mg: any) => (mg.categoryName || '').toLowerCase() === String(filterCat).toLowerCase());

  const isAssigned = (goalId: string) => formData.assignedGoals.some(ag => ag.goalId === goalId);
  const isCompleted = (goalId: string) => formData.assignedGoals.find(ag => ag.goalId === goalId)?.completed || false;

  const toggleAssignment = (goalId: string) => {
    setFormData(prev => {
      if (isAssigned(goalId)) {
        return { ...prev, assignedGoals: prev.assignedGoals.filter(ag => ag.goalId !== goalId) };
      } else {
        return { ...prev, assignedGoals: [...prev.assignedGoals, { goalId, completed: false }] };
      }
    });
  };

  const toggleCompletion = (goalId: string) => {
    if (!isAssigned(goalId)) return;
    setFormData(prev => ({
      ...prev,
      assignedGoals: prev.assignedGoals.map(ag => ag.goalId === goalId ? { ...ag, completed: !ag.completed, completedAt: !ag.completed ? new Date().toISOString() : undefined } : ag)
    }));
  };

  const visibleGoalIds: string[] = displayedMasterGoals.map((mg: any) => mg.id);
  const visibleAssignedCount = visibleGoalIds.filter(id => isAssigned(id)).length;
  const visibleCompletedCount = visibleGoalIds.filter(id => isCompleted(id)).length;
  const allVisibleAssigned = visibleGoalIds.length > 0 && visibleAssignedCount === visibleGoalIds.length;
  const allVisibleCompleted = visibleAssignedCount > 0 && visibleCompletedCount === visibleAssignedCount;
  const scopeLabel = filterCat === 'ALL' ? 'all tracks' : filterCat;

  const bulkSetAssigned = (assign: boolean) => {
    setFormData(prev => {
      if (assign) {
        const existingIds = new Set(prev.assignedGoals.map(ag => ag.goalId));
        const additions = visibleGoalIds
          .filter(id => !existingIds.has(id))
          .map(id => ({ goalId: id, completed: false }));
        if (additions.length === 0) return prev;
        return { ...prev, assignedGoals: [...prev.assignedGoals, ...additions] };
      }
      const drop = new Set(visibleGoalIds);
      return { ...prev, assignedGoals: prev.assignedGoals.filter(ag => !drop.has(ag.goalId)) };
    });
  };

  const bulkSetCompleted = (complete: boolean) => {
    setFormData(prev => {
      const scope = new Set(visibleGoalIds);
      const nowIso = new Date().toISOString();
      let next = prev.assignedGoals.map(ag => {
        if (!scope.has(ag.goalId)) return ag;
        if (complete) {
          return ag.completed ? ag : { ...ag, completed: true, completedAt: ag.completedAt || nowIso };
        }
        return { ...ag, completed: false, completedAt: undefined };
      });
      if (complete) {
        const existingIds = new Set(next.map(ag => ag.goalId));
        const additions = visibleGoalIds
          .filter(id => !existingIds.has(id))
          .map(id => ({ goalId: id, completed: true, completedAt: nowIso }));
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
          <h2 className="text-xl font-black text-foreground">{student ? 'Edit Credentials' : 'Enroll Student'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl transition-colors"><X className="h-6 w-6 text-muted-foreground" /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 flex flex-col lg:flex-row gap-8">
          {/* Biodata */}
          <div className="w-full lg:w-80 space-y-6">
            <div className="text-center">
              <div className="relative inline-block group">
                <Avatar src={formData.photo} alt="Avatar" className="w-32 h-32 rounded-xl border-4 border-card bg-secondary shadow-md object-cover" wrapperClassName="w-32 h-32" />
                <ImageUploader 
                  folder="avatars"
                  aspectRatio={1}
                  onUploadSuccess={(url) => setFormData(prev => ({ ...prev, photo: url }))}
                  trigger={
                    <button type="button" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-foreground/60 p-3 rounded-full text-background opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow-soft" title="Unggah Foto">
                      <ImageIcon className="w-6 h-6" />
                    </button>
                  }
                  className="absolute inset-0 z-10"
                />
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 w-max">
                  <button type="button" onClick={() => setFormData(p => ({...p, photo: `https://api.dicebear.com/7.x/bottts/svg?seed=${Math.floor(Math.random()*1000)}&backgroundColor=d1d4f9`}))} className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all">Robot</button>
                  <button type="button" onClick={() => setFormData(p => ({...p, photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'S')}&background=random`}))} className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all">Inisial</button>
                  <button type="button" onClick={() => setFormData(p => ({...p, photo: `https://api.dicebear.com/7.x/shapes/svg?seed=${Math.floor(Math.random()*1000)}&backgroundColor=random`}))} className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all">Bentuk</button>
                </div>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-12">Profile Identity</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Photo URL (Optional)</label>
                <input type="text" className="w-full bg-secondary border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/50" placeholder="Paste image URL here" value={formData.photo} onChange={e => setFormData(p => ({...p, photo: e.target.value}))}/>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Nama Lengkap</label>
                <input type="text" className="w-full bg-secondary border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/50" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))}/>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Short Bio</label>
                <textarea rows={2} className="w-full bg-secondary border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/50" value={formData.bio} onChange={e => setFormData(p => ({...p, bio: e.target.value}))}/>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Tag (Untuk Pencarian)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(formData.tags || []).map((tag, idx) => (
                    <span key={idx} className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                      {tag} <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => removeTag(tag)} />
                    </span>
                  ))}
                </div>
                <input 
                  type="text" 
                  className="w-full bg-secondary border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/50" 
                  placeholder="Ketik tag dan tekan Enter" 
                  value={tagInput} 
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                />
              </div>
            </div>
          </div>

          {/* Goal Selector */}
          <div className="flex-1 border-border lg:border-l lg:pl-8 pt-8 lg:pt-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
              <div>
                <h3 className="text-lg font-black text-foreground">Penugasan Jalur</h3>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mt-1">Atur tugas untuk siswa ini</p>
              </div>
              <select className="bg-secondary border-none rounded-xl p-2 text-xs font-bold text-foreground focus:ring-2 focus:ring-primary/50" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                <option value="ALL">Semua Jalur</option>
                {categories.map((c: any, index: number) => <option key={c.id || `cp1-${index}`} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            {/* Bulk actions for the current track scope */}
            {visibleGoalIds.length > 0 && (
              <div className="mb-4 p-3 rounded-2xl bg-secondary/30 border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Pilih Semua di <span className="text-primary">{scopeLabel}</span>
                  <span className="ml-2 normal-case tracking-normal font-bold text-muted-foreground">
                    · {visibleAssignedCount}/{visibleGoalIds.length} assigned · {visibleCompletedCount} completed
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => bulkSetAssigned(!allVisibleAssigned)}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all ${
                      allVisibleAssigned
                        ? 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                    title={allVisibleAssigned ? 'Hapus semua yang terlihat' : 'Tugaskan semua yang terlihat'}
                  >
                    {allVisibleAssigned ? <Square className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                    {allVisibleAssigned ? 'Hapus Semua' : 'Tugaskan Semua'}
                  </button>
                  <button
                    type="button"
                    onClick={() => bulkSetCompleted(!allVisibleCompleted)}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all ${
                      allVisibleCompleted
                        ? 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                        : 'bg-[var(--accent)] text-[var(--accent-foreground)] hover:brightness-95'
                    }`}
                    title={allVisibleCompleted ? 'Batalkan Selesai' : 'Tandai Selesai'}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {allVisibleCompleted ? 'Batalkan Selesai Semua' : 'Tandai Semua Selesai'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3 pb-4">
              {displayedMasterGoals.map((mg: any, index: number) => {
                const assigned = isAssigned(mg.id);
                const completed = isCompleted(mg.id);
                
                return (
                  <div key={`${mg.id}-${index}`} className={`p-4 rounded-xl border transition-all ${
                    assigned 
                      ? completed ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-primary bg-primary/10' 
                      : 'border-transparent bg-card hover:border-border shadow-soft'
                  }`}>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="font-bold text-sm text-foreground">{mg.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">{mg.points !== undefined ? mg.points : (mg as any).pointValue || 0} pts</span>
                          <span className="text-[10px] text-muted-foreground">•</span>
                          <span className="text-[10px] font-medium text-muted-foreground">{mg.categoryName || '—'}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 shrink-0">
                        <button 
                          onClick={() => toggleAssignment(mg.id)}
                          className={`p-2 rounded-xl transition-all ${assigned ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
                        >
                          {assigned ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </button>
                        <button 
                          onClick={() => toggleCompletion(mg.id)}
                          disabled={!assigned}
                          className={`p-2 rounded-xl transition-all ${!assigned ? 'opacity-20' : completed ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'bg-secondary text-muted-foreground'}`}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-border bg-secondary/30 flex justify-end gap-4">
          <Button variant="ghost" onClick={onClose} disabled={busy} className="rounded-xl font-bold h-12">Batal</Button>
          <Button onClick={handleConfirmSave} disabled={busy} className="rounded-xl font-bold h-12 shadow-primary-glow min-w-[200px]">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Konfirmasi Perubahan'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
