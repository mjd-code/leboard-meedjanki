"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const BlogPostPage = dynamic(() => import("@/components/pages/BlogPostPage").then(mod => mod.BlogPostPage), { ssr: false });

export default function Page() {
  const params = useParams();
  const slug = params?.slug as string;
  
  if (!slug) return null;

  return <BlogPostPage slug={slug} />;
}
