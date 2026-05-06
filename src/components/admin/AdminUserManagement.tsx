"use client";

import React, { useState, useEffect } from "react";
import { useAuthRole } from "@/hooks/useAuthRole";
import { apiFetch } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PopoverSelect } from "@/components/ui/PopoverSelect";
import { Loader2, Plus, Pencil, Trash2, X, User } from "lucide-react";
import { ConfirmModal } from "../ui/ConfirmModal";
import type { AdminUser, AdminRole } from "@/lib/types";

export function AdminUserManagement() {
  const { user, isSuperAdmin, loading: authLoading } = useAuthRole();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<AdminUser> | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "admin" as AdminRole,
    photo_url: "",
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin_users");
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [authLoading, isSuperAdmin]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = "/api/admin_users";
      // If regular admin, they can only update themselves
      const targetId = editingUser?.id || (isSuperAdmin ? null : user?.id);
      const method = targetId ? "PUT" : "POST";
      const payload = { ...formData, id: targetId };

      // Ensure a regular admin cannot escalate role to super_admin
      if (!isSuperAdmin) {
        payload.role = "admin"; // Force role to stay admin
      }

      const res = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsDialogOpen(false);
        if (isSuperAdmin) {
          fetchUsers();
          alert('Admin berhasil diperbarui!');
        } else {
          alert("Profil berhasil diperbarui. Silakan refresh halaman.");
        }
      } else {
        alert("Gagal menyimpan data pengguna.");
      }
    } catch {
      alert("Terjadi kesalahan teknis.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await apiFetch(`/api/admin_users?id=${deleteConfirmId}`, { method: "DELETE" });
      if (res.ok) {
        fetchUsers();
      } else {
        alert("Gagal menghapus admin.");
      }
    } catch {
      alert("Terjadi kesalahan saat menghapus.");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const openForm = (u: AdminUser | null) => {
    if (u) {
      setEditingUser(u);
      setFormData({
        email: u.email,
        password: "", // do not show existing password
        full_name: u.full_name,
        role: u.role,
        photo_url: u.photo_url || "",
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: "",
        password: "",
        full_name: "",
        role: "admin",
        photo_url: "",
      });
    }
    setIsDialogOpen(true);
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Self-Service form for regular admins
  if (!isSuperAdmin) {
    return (
      <Card className="max-w-2xl mx-auto shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <CardTitle>Profil Admin</CardTitle>
          </div>
          <CardDescription>
            Perbarui nama lengkap, email, atau kata sandi Anda. Anda tidak dapat mengubah tipe peran.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => {
               e.preventDefault();
               setEditingUser({ id: user?.id });
               handleSave(e);
             }} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email || user?.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password Baru (Kosongkan jika tidak ingin mengubah)</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Nama Lengkap</Label>
              <Input
                id="full_name"
                required
                value={formData.full_name || user?.full_name || ""}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Peran</Label>
              <PopoverSelect 
                disabled 
                value="admin"
                onValueChange={() => {}}
                options={[{value: "admin", label: "Admin"}]}
                className="bg-muted cursor-not-allowed text-muted-foreground"
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" className="w-full sm:w-auto">Simpan Profil</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8 p-2 md:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-card p-6 md:p-8 rounded-2xl border border-border shadow-sm">
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Manajemen Pengguna</h2>
          <p className="text-muted-foreground text-sm">Kelola akses dan tipe peran admin.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openForm(null)} className="shadow-sm px-6 py-6 rounded-xl gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Tambah Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px] p-6 md:p-8">
            <DialogHeader className="space-y-2 mb-2">
              <DialogTitle className="text-xl">{editingUser ? "Ubah Admin" : "Tambah Admin Baru"}</DialogTitle>
              <DialogDescription>Atur kredensial dan peran administrator.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-5 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password {editingUser && "(Kosongkan jika tidak diubah)"}</Label>
                <Input
                  id="password"
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Nama Lengkap</Label>
                <Input
                  id="full_name"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Peran</Label>
                <PopoverSelect
                  value={formData.role}
                  onValueChange={(v) => setFormData({ ...formData, role: v as AdminRole })}
                  options={[
                    { value: "super_admin", label: "Super Admin" },
                    { value: "admin", label: "Admin" }
                  ]}
                  placeholder="Pilih Peran"
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" className="w-full sm:w-auto px-6">Simpan</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6 py-4">Nama</TableHead>
              <TableHead className="px-6 py-4">Email</TableHead>
              <TableHead className="px-6 py-4">Peran</TableHead>
              <TableHead className="px-6 py-4 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium px-6 py-4">{u.full_name}</TableCell>
                <TableCell className="text-muted-foreground px-6 py-4">{u.email}</TableCell>
                <TableCell className="px-6 py-4">
                  <Badge variant={u.role === "super_admin" ? "default" : "secondary"} className={u.role === "super_admin" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-blue-500 hover:bg-blue-600 text-white"}>
                    {u.role === "super_admin" ? "Super Admin" : "Admin"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="icon" onClick={() => openForm(u)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => setDeleteConfirmId(u.id)}
                      disabled={u.id === user?.id}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  Belum ada data admin.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <ConfirmModal 
        isOpen={!!deleteConfirmId}
        title="Konfirmasi Hapus Admin"
        message="Apakah Anda yakin ingin menghapus admin ini? Akses mereka ke dalam sistem akan dicabut secara permanen."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
