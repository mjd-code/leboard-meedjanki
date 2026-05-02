"use client";

import dynamic from "next/dynamic";
const CategoryIndexPage = dynamic(
  () => import("@/components/pages/CategoryIndexPage").then((m) => m.CategoryIndexPage),
  { ssr: false }
);

export default function Page() {
  return <CategoryIndexPage />;
}
