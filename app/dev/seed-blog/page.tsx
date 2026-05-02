"use client";

import dynamic from "next/dynamic";

const SeedBlogPage = dynamic(
  () => import("@/components/pages/SeedBlogPage").then((m) => m.SeedBlogPage),
  { ssr: false }
);

export default function Page() {
  return <SeedBlogPage />;
}
