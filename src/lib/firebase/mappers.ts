// Snake_case (Firestore) <-> camelCase (app) mappers.
// Centralized so every read/write uses a single source of truth.

import type { Category, Group, MasterGoal, Post, Student } from "@/types";

export const mapStudentRow = (r: any): Student => ({
  id: r.id,
  name: r.name,
  bio: r.bio || "",
  photo: r.photo || "",
  tags: r.tags || [],
  assignedGoals: r.assigned_goals || r.assignedGoals || [],
  totalPoints: r.total_points ?? r.totalPoints ?? 0,
  previousRank: r.previous_rank ?? r.previousRank,
  createdAt: r.created_at ?? r.createdAt,
});

export const mapStudentInput = (s: Partial<Student>): any => {
  const out: any = {};
  if (s.name !== undefined) out.name = s.name;
  if (s.bio !== undefined) out.bio = s.bio;
  if (s.photo !== undefined) out.photo = s.photo;
  if (s.tags !== undefined) out.tags = s.tags;
  if (s.assignedGoals !== undefined) out.assigned_goals = s.assignedGoals;
  if (s.totalPoints !== undefined) out.total_points = s.totalPoints;
  if (s.previousRank !== undefined) out.previous_rank = s.previousRank;
  if (s.createdAt !== undefined) out.created_at = s.createdAt;
  return out;
};

export const mapGoalRow = (r: any): MasterGoal => ({
  id: r.id,
  categoryId: r.category_id ?? r.categoryId,
  categoryName: r.category_name ?? r.categoryName ?? "",
  title: r.title,
  points: r.points,
  description: r.description || "",
  order: r.order ?? 0,
});

export const mapGoalInput = (g: Partial<MasterGoal>): any => {
  const out: any = {};
  if (g.categoryName !== undefined) out.category_name = g.categoryName;
  if (g.categoryId !== undefined) out.category_id = g.categoryId || null;
  if (g.title !== undefined) out.title = g.title;
  if (g.points !== undefined) out.points = g.points;
  if (g.description !== undefined) out.description = g.description;
  if (g.order !== undefined) out.order = g.order;
  return out;
};

export const mapCategoryRow = (r: any): Category => ({
  id: r.id,
  name: r.name,
  groupId: r.group_id ?? r.groupId,
  order: r.order ?? 0,
});

export const mapCategoryInput = (c: Partial<Category>): any => {
  const out: any = {};
  if (c.name !== undefined) out.name = c.name;
  if (c.groupId !== undefined) out.group_id = c.groupId || null;
  if (c.order !== undefined) out.order = c.order;
  return out;
};

export const mapGroupRow = (r: any): Group => ({
  id: r.id,
  name: r.name,
  order: r.order ?? 0,
  isSystem: !!(r.is_system ?? r.isSystem),
});

export const mapGroupInput = (g: Partial<Group>): any => {
  const out: any = {};
  if (g.name !== undefined) out.name = g.name;
  if (g.order !== undefined) out.order = g.order;
  if (g.isSystem !== undefined) out.is_system = g.isSystem;
  return out;
};

export const mapPostRow = (r: any): Post => ({
  ...r,
  id: r.id,
  featured_image: r.featured_image || r.cover_image || "",
  author_id: r.author_id || r.author || "",
  organic_views: r.organic_views || 0,
  offset_views: r.offset_views || 0,
});

export const mapPostInput = (b: Partial<Post>): any => {
  const out: any = { ...b };
  if (out.featured_image !== undefined) out.cover_image = out.featured_image;
  if (out.author_id !== undefined) out.author = out.author_id;
  if (out.organic_views === undefined) out.organic_views = 0;
  if (out.offset_views === undefined) out.offset_views = 0;
  delete (out as any).id;
  return out;
};