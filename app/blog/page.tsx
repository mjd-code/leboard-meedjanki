"use client";

import dynamic from "next/dynamic";
const BlogListPage = dynamic(() => import("@/components/pages/BlogListPage").then(mod => mod.BlogListPage), { ssr: false });

export default function Page() {
  return <BlogListPage />;
}
