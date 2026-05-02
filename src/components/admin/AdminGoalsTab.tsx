import React, { useState, useMemo } from 'react';
import { Target, ChevronUp, ChevronDown, Plus, MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SimpleMenu } from '../ui/SimpleMenu';
import type { Category, MasterGoal } from '../../lib/types';

export function AdminGoalsTab({ masterGoals, refreshData, categories }: any) {
  // Goal Modal States
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editGoalData, setEditGoalData] = useState<any>(null);
  const [deleteGoalConfirm, setDeleteGoalConfirm] = useState<any>(null);

  // Category States
  const [newCatName, setNewCatName] = useState('');
  const [editCatData, setEditCatData] = useState<any>(null);
  const [editCatName, setEditCatName] = useState('');
  const [deleteCatConfirm, setDeleteCatConfirm] = useState<any>(null);

  // UI States
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  const toggleCat = (id: string) => {
    setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- GOAL ACTIONS ---
  const handleSaveGoal = async (formData: any) => {
    const isNew = !formData.id;
    const url = isNew ? '/api/masterGoals' : `/api/masterGoals/${formData.id}`;
    const res = await apiFetch(url, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (!res.ok) alert(`Failed to save template: ${res.statusText}`);
    else { refreshData(); setGoalModalOpen(false); }
  };

  const executeDeleteGoal = async () => {
    if (!deleteGoalConfirm) return;
    const res = await apiFetch(`/api/masterGoals/${deleteGoalConfirm.id}`, { method: 'DELETE' });
    if (!res.ok) alert(`Failed to delete: ${res.statusText}`);
    setDeleteGoalConfirm(null); refreshData();
  };

  // --- CATEGORY ACTIONS ---
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    const res = await apiFetch('/api/categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCatName })
    });
    if (!res.ok) alert(`Failed to create category: ${res.statusText}`);
    else { setNewCatName(''); refreshData(); }
  };

  const updateCategory = async () => {
    if (!editCatName.trim() || !editCatData) return;
    const res = await apiFetch(`/api/categories/${editCatData.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editCatName })
    });
    if (!res.ok) alert(`Failed to update category: ${res.statusText}`);
    else { setEditCatData(null); setEditCatName(''); refreshData(); }
  };

  const executeDeleteCategory = async () => {
    if (!deleteCatConfirm) return;
    const res = await apiFetch(`/api/categories/${deleteCatConfirm.id}`, { method: 'DELETE' });
    if (!res.ok) alert(`Failed to delete: ${res.statusText}`);
    setDeleteCatConfirm(null); refreshData();
  };

  // --- DATA PREP ---
  const groupedGoals = useMemo(() => {
    const groups: { [key: string]: { category: any, goals: any[] } } = {};
    const unknownCatId = 'unknown-cat';
    
    categories.forEach((c: any) => {
      groups[c.id] = { category: c, goals: [] };
    });
    groups[unknownCatId] = { category: { id: unknownCatId, name: 'Kategori Tidak Diketahui', isSystem: true }, goals: [] };

    masterGoals.forEach((g: any) => {
      if (g.categoryId && groups[g.categoryId]) {
        groups[g.categoryId].goals.push(g);
      } else {
        groups[unknownCatId].goals.push(g);
      }
    });

    return Object.values(groups).filter(g => !g.category.isSystem || g.goals.length > 0);
  }, [categories, masterGoals]);

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
          <h3 className="text-2xl font-black text-foreground underline decoration-primary decoration-4 underline-offset-8">Jalur & Tujuan</h3>
          <p className="text-muted-foreground text-sm mt-3">Kelola kategori dan template tujuannya.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <form 
            onSubmit={(e) => { e.preventDefault(); addCategory(); }} 
            className="flex items-center gap-2 flex-col sm:flex-row w-full sm:w-auto"
          >
            <Input 
              type="text" 
              placeholder="Nama Jalur Baru" 
              value={newCatName} 
              onChange={e => setNewCatName(e.target.value)}
              className="h-12 rounded-xl border-border bg-card shadow-soft w-full sm:w-48 font-bold"
            />
            <Button type="submit" className="h-12 w-full sm:w-auto rounded-xl shadow-primary-glow font-bold">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Jalur
            </Button>
          </form>
          <Button 
            onClick={() => { setEditGoalData(null); setGoalModalOpen(true); }} 
            className="h-12 w-full sm:w-auto rounded-xl shadow-primary-glow font-bold"
          >
            <Target className="h-4 w-4 mr-2" /> Tujuan Baru
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {groupedGoals.map((group, groupIndex) => {
          const isExpanded = expandedCats[group.category.id] !== false; // Default expanded
          const isSystem = group.category.isSystem;
          
          return (
            <Card key={`${group.category.id}-${groupIndex}`} className="rounded-xl shadow-soft border-border overflow-hidden">
              <CardHeader 
                className={`p-4 cursor-pointer hover:bg-secondary/20 transition-colors flex flex-row items-center justify-between space-y-0`}
                onClick={() => toggleCat(group.category.id)}
              >
                <div className="flex items-center gap-4 flex-1">
                  {editCatData?.id === group.category.id ? (
                    <div className="flex flex-1 gap-2 items-center" onClick={e => e.stopPropagation()}>
                      <Input 
                        type="text" 
                        value={editCatName} 
                        onChange={e => setEditCatName(e.target.value)} 
                        autoFocus
                        className="bg-background rounded-xl font-bold h-10 w-full sm:w-64"
                      />
                      <Button onClick={updateCategory} className="rounded-xl h-10">Save</Button>
                      <Button variant="ghost" onClick={() => setEditCatData(null)} className="rounded-xl h-10">Batal</Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 items-start ml-2">
                      <span className="font-black text-foreground">{group.category.name}</span>
                      <span className="text-muted-foreground text-xs font-bold">{group.goals.length} goals</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {!isSystem && editCatData?.id !== group.category.id && (
                    <div className="flex items-center" onClick={e => e.stopPropagation()}>
                      <SimpleMenu
                        options={[
                          {
                            label: "Edit",
                            onClick: () => { setEditCatData(group.category); setEditCatName(group.category.name); },
                            icon: <Edit2 className="w-4 h-4 text-muted-foreground" />
                          },
                          {
                            label: "Delete",
                            onClick: () => setDeleteCatConfirm(group.category),
                            icon: <Trash2 className="w-4 h-4 text-destructive/70" />,
                            variant: "destructive" as const
                          }
                        ]}
                      />
                    </div>
                  )}
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                </div>
              </CardHeader>

              {/* Goals Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <CardContent className="p-4 pt-0 border-t border-border/40 bg-card rounded-b-[1.5rem]">
                      {group.goals.length === 0 ? (
                        <p className="text-sm font-medium text-muted-foreground text-center py-8">Tidak ada tujuan di jalur ini.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          {group.goals.map((mg: any, mgIndex: number) => (
                            <Card key={`${mg.id}-${mgIndex}`} className="rounded-xl border border-border shadow-none hover:shadow-soft transition-shadow group relative flex flex-col justify-between">
                              <CardContent className="p-4 space-y-2">
                                <div className="flex justify-between items-start gap-2">
                                  <h4 className="font-bold text-foreground leading-tight flex-1 pt-1" title={mg.title}>{mg.title}</h4>
                                  <div className="flex items-start gap-2 shrink-0">
                                    <div className="bg-primary/10 px-2 py-1 rounded-lg text-xs font-black text-primary mt-0.5 shrink-0">
                                      +{mg.points !== undefined ? mg.points : mg.pointValue || 0}
                                    </div>
                                    <div className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-1">
                                      <SimpleMenu
                                        triggerClassName="bg-secondary/50 sm:bg-transparent rounded-full sm:rounded-md"
                                        options={[
                                          {
                                            label: "Edit",
                                            onClick: () => { setEditGoalData(mg); setGoalModalOpen(true); },
                                            icon: <Edit2 className="w-4 h-4 text-muted-foreground" />
                                          },
                                          {
                                            label: "Delete",
                                            onClick: () => setDeleteGoalConfirm(mg),
                                            icon: <Trash2 className="w-4 h-4 text-destructive/70" />,
                                            variant: "destructive" as const
                                          }
                                        ]}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground italic leading-relaxed line-clamp-2 pr-4" title={mg.description}>{mg.description}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>

      {goalModalOpen && <GoalAdminModal goal={editGoalData} categories={categories} onClose={() => setGoalModalOpen(false)} onSave={handleSaveGoal} />}
      
      <ConfirmModal 
        isOpen={!!deleteGoalConfirm} title="Hapus Tujuan Utama"
        message={`Apakah Anda yakin ingin menghapus ${deleteGoalConfirm?.title}? Siswa akan tetap menyimpan referensi ini tetapi datanya tidak akan disinkronkan.`}
        onConfirm={executeDeleteGoal} onCancel={() => setDeleteGoalConfirm(null)}
      />

      <ConfirmModal 
        isOpen={!!deleteCatConfirm} title="Hapus Jalur"
        message={`Are you sure you want to delete ${deleteCatConfirm?.name}? Tujuan yang menggunakan jalur ini akan dipindahkan ke Tidak Diketahui.`}
        onConfirm={executeDeleteCategory} onCancel={() => setDeleteCatConfirm(null)}
      />
    </div>
  );
}

// Goal Admin Modal (Internal usage)
function GoalAdminModal({ goal, categories, onClose, onSave }: any) {
  const [formData, setFormData] = useState<MasterGoal>({
    id: goal?.id || '',
    title: goal?.title || '',
    points: goal?.points || 10,
    categoryId: goal?.categoryId || categories[0]?.id || '',
    description: goal?.description || ''
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex justify-center items-center p-4">
      <Card className="w-full max-w-md rounded-xl shadow-2xl border-border bg-card overflow-hidden">
        <CardHeader className="p-6 border-b border-border">
          <div className="font-black text-lg text-foreground">{goal ? 'Edit Model' : 'Model Baru'}</div>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Nama Jalur</label>
            <Input 
              type="text" 
              className="bg-secondary/30 h-12 border-border font-bold text-sm rounded-xl"
              required 
              value={formData.title} 
              onChange={e => setFormData(p=>({...p, title: e.target.value}))}
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Category</label>
              <Select 
                value={formData.categoryId} 
                onValueChange={v => setFormData(p=>({...p, categoryId: v}))}
              >
                <SelectTrigger className="bg-secondary/30 h-12 border-border font-bold text-sm rounded-xl w-full">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-soft border-border">
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id} className="font-medium">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Poin</label>
              <Input 
                type="number" 
                className="bg-secondary/30 h-12 border-border font-bold text-sm rounded-xl" 
                min="1" 
                value={String(formData.points)} 
                onChange={e => setFormData(p=>({...p, points: parseInt(e.target.value)||0}))}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Deskripsi</label>
            <textarea 
              rows={3} 
              className="w-full bg-secondary/30 border border-border rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none text-foreground placeholder:text-muted-foreground resize-none" 
              value={formData.description} 
              onChange={e => setFormData(p=>({...p, description: e.target.value}))}
            />
          </div>
        </CardContent>
        <div className="p-6 border-t border-border bg-secondary/20 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="rounded-xl h-12 font-bold">Cancel</Button>
          <Button onClick={() => onSave(formData)} className="rounded-xl h-12 font-bold shadow-primary-glow">Simpan Model</Button>
        </div>
      </Card>
    </div>
  );
}
