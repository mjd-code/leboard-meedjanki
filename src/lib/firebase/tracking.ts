import { doc, increment, setDoc } from "firebase/firestore";
import { blogPostsCol } from "./collections";

/** Increment a post's organic view counter. Best-effort — never throws. */
export async function trackArticleView(postIdOrSlug: string): Promise<void> {
  try {
    await setDoc(doc(blogPostsCol, postIdOrSlug), { organic_views: increment(1) }, { merge: true });
  } catch (e) {
    console.warn("[tracking] view increment failed", e);
  }
}