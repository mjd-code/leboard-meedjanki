// Plain Firestore collection / doc references. No converters — readers must
// run mappers from ./mappers to translate snake_case <-> camelCase.

import { collection, doc } from "firebase/firestore";
import { db } from "./firebase";

export const studentsCol = collection(db, "students");
export const goalsCol = collection(db, "master_goals");
export const categoriesCol = collection(db, "categories");
export const groupsCol = collection(db, "groups");
export const blogPostsCol = collection(db, "posts");
export const adminUsersCol = collection(db, "admin_users");
export const achievementsCol = collection(db, "student_achievements");
export const pageViewsCol = collection(db, "page_views");
export const appEventsCol = collection(db, "events");
export const activityLogsCol = collection(db, "logs");

export const settingsDoc = doc(db, "settings", "app");
