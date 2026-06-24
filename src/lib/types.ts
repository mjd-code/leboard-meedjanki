export type AdminRole = "super_admin" | "admin";

export interface AdminUser {
  id: string;
  email: string;
  password?: string;
  full_name: string;
  photo_url?: string;
  /** Firebase Storage object path for `photo_url` (used for cleanup on replace). */
  photo_path?: string;
  role: AdminRole;
  privileges: string[];
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  /** Parent Group id (new in 3-tier hierarchy). Optional for backwards compat. */
  groupId?: string;
  /** Manual ascending sort index within its Group. */
  order?: number;
  /** Detail kurikulum / deskripsi level (ditampilkan di ProgramTab). */
  description?: string;
}

export interface MasterGoal {
  id: string;
  /** Canonical FK to Category. `categoryName` is kept as a denormalized snapshot. */
  categoryId?: string;
  categoryName: string;
  title: string;
  points: number;
  description: string;
  /** Manual ascending sort index within its Category. */
  order?: number;
}

/**
 * Top-level grouping above Categories (e.g. "Kelas 1").
 * A Group has many Categories; a Category has many MasterGoals.
 */
export interface Group {
  id: string;
  name: string;
  order: number;
  isSystem?: boolean;
  /** Emoji ikon program (mis. "🏫"). */
  icon?: string;
  /** Ringkasan singkat program (1-2 kalimat). */
  description?: string;
  /** Deskripsi lengkap program (paragraf). */
  longDescription?: string;
}

export interface AssignedGoal {
  goalId: string;
  completed: boolean;
  completedAt?: string;
  completionNote?: string | null;
  markedByAdminId?: string | null;
  markedByAdminName?: string | null;
}

/**
 * Audit-grade junction record between a student and a goal.
 * Stored in the flat `student_achievements` Firestore collection so it can be
 * queried for leaderboards and exported to CSV without traversing
 * subcollections.
 */
export interface StudentAchievement {
  id: string;
  studentId: string;
  goalId: string;
  /** Snapshot of goal points at completion time — safe for historical export. */
  goalPoints: number;
  status: "assigned" | "completed";
  /** ISO date string; null while only assigned. */
  completedAt: string | null;
  markedByAdminId: string | null;
  markedByAdminName: string | null;
  completionNote: string | null;
  /** ISO date string. */
  assignedAt: string;
}

/**
 * Gallery category (album) for the public "Galeri" tab.
 * Has many GalleryItem rows. `thumbnailItemId` references an existing item
 * whose image is used as the album cover.
 */
export interface GalleryCategory {
  id: string;
  name: string;
  /** Short tag/label shown on the album card (e.g. "Kajian"). */
  tag?: string;
  description?: string;
  /** Id of a GalleryItem (in this category) used as the album cover. */
  thumbnailItemId?: string | null;
  order: number;
  createdAt?: string;
}

/** A single image inside a GalleryCategory. */
export interface GalleryItem {
  id: string;
  categoryId: string;
  title: string;
  description?: string;
  /** "drive" = Google Drive shareable link; "upload" = Firebase Storage blob. */
  sourceType: "drive" | "upload";
  /** Final image URL (raw drive URL or uploaded https URL). */
  imageUrl: string;
  /** Storage object path for cleanup when sourceType="upload". */
  imagePath?: string;
  order: number;
  createdAt?: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string; // HTML or JSON
  excerpt: string;
  featured_image: string;
  author_id: string;
  status: "draft" | "published";
  category: string;
  tags: string[];
  meta_title?: string;
  meta_description?: string;
  published_at: string | null;
  updated_at: string;
  created_at: string;
  organic_views?: number;
  offset_views?: number;
  /** Firebase Storage object path for `featured_image` (cleanup on replace). */
  featured_image_path?: string;
}

export interface Student {
  id: string;
  name: string;
  bio: string;
  photo: string;
  /** Firebase Storage object path for `photo` (cleanup on replace). Optional/back-compat. */
  photoPath?: string;
  tags?: string[];
  assignedGoals: AssignedGoal[];
  totalPoints?: number;
  previousRank?: number;
  createdAt?: string;
}
