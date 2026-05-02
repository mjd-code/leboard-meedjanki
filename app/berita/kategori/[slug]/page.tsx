"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const CategoryPage = dynamic(
  () => import("@/components/pages/CategoryPage").then((m) => m.CategoryPage),
  { ssr: false }
);

export default function Page() {
  const params = useParams();
  const slug = params?.slug as string;
  if (!slug) return null;
  return <CategoryPage slug={slug} />;
}
