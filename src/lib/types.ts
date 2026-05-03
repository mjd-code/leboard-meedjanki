export type AdminRole = 'super_admin' | 'admin';

export interface AdminUser {
  id: string;
  email: string;
  password?: string;
  full_name: string;
  photo_url?: string;
  role: AdminRole;
  privileges: string[];
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface MasterGoal {
  id: string;
  categoryName: string;
  title: string;
  points: number;
  description: string;
}

export interface AssignedGoal {
  goalId: string;
  completed: boolean;
  completedAt?: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string; // HTML or JSON
  excerpt: string;
  featured_image: string;
  author_id: string;
  status: 'draft' | 'published';
  category: string;
  tags: string[];
  meta_title?: string;
  meta_description?: string;
  published_at: string | null;
  updated_at: string;
  created_at: string;
  organic_views?: number;
  offset_views?: number;
}

export interface Student {
  id: string;
  name: string;
  bio: string;
  photo: string;
  tags?: string[];
  assignedGoals: AssignedGoal[];
  totalPoints?: number;
  previousRank?: number;
  createdAt?: string;
}
