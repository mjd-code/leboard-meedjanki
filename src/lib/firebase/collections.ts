import { collection, doc } from "firebase/firestore";
import type {
  CollectionReference,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  AdminUser,
  Category,
  Group,
  MasterGoal,
  Post,
  Student,
  StudentAchievement,
} from "@/types";

/**
 * Generic id-aware converter: keeps `id` on read, strips it on write so the
 * stored document never duplicates the doc id as a field.
 */
function idConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(model: T): DocumentData {
      const { id: _omit, ...rest } = model as any;
      return rest;
    },
    fromFirestore(snap: QueryDocumentSnapshot): T {
      return { id: snap.id, ...(snap.data() as any) } as T;
    },
  };
}

function typedCol<T extends { id: string }>(name: string): CollectionReference<T> {
  return collection(db, name).withConverter(idConverter<T>());
}

export const studentsCol = typedCol<Student>("students");
export const goalsCol = typedCol<MasterGoal>("master_goals");
export const categoriesCol = typedCol<Category>("categories");
export const groupsCol = typedCol<Group>("groups");
export const blogPostsCol = typedCol<Post>("posts");
export const adminUsersCol = typedCol<AdminUser>("admin_users");
export const achievementsCol = typedCol<StudentAchievement>("student_achievements");

// Loosely-typed event/log collections (analytics is schemaless in practice).
export const pageViewsCol = collection(db, "page_views");
export const appEventsCol = collection(db, "events");
export const activityLogsCol = collection(db, "logs");

export const settingsDoc = doc(db, "settings", "app");