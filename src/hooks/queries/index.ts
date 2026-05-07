import {
  achievementsCol,
  adminUsersCol,
  blogPostsCol,
  categoriesCol,
  goalsCol,
  groupsCol,
  studentsCol,
} from "@/lib/firebase/collections";
import {
  mapCategoryInput,
  mapCategoryRow,
  mapGoalInput,
  mapGoalRow,
  mapGroupInput,
  mapGroupRow,
  mapPostInput,
  mapPostRow,
  mapStudentInput,
  mapStudentRow,
} from "@/lib/firebase/mappers";
import { createDomainHooks } from "./factory";

export const StudentsAPI = createDomainHooks({
  ref: studentsCol,
  key: "students",
  mapRow: mapStudentRow,
  mapInput: mapStudentInput,
});

export const GoalsAPI = createDomainHooks({
  ref: goalsCol,
  key: "master_goals",
  mapRow: mapGoalRow,
  mapInput: mapGoalInput,
});

export const CategoriesAPI = createDomainHooks({
  ref: categoriesCol,
  key: "categories",
  mapRow: mapCategoryRow,
  mapInput: mapCategoryInput,
});

export const GroupsAPI = createDomainHooks({
  ref: groupsCol,
  key: "groups",
  mapRow: mapGroupRow,
  mapInput: mapGroupInput,
});

export const BlogPostsAPI = createDomainHooks({
  ref: blogPostsCol,
  key: "posts",
  mapRow: mapPostRow,
  mapInput: mapPostInput,
});

export const AdminUsersAPI = createDomainHooks({
  ref: adminUsersCol,
  key: "admin_users",
});

export const AchievementsAPI = createDomainHooks({
  ref: achievementsCol,
  key: "student_achievements",
});