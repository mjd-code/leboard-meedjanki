"use client";

import { AboutPage } from "@/components/about/AboutPage";
import dynamic from "next/dynamic";

// const AboutPage = dynamic(
//   () => import("@/components/pages/AboutPage").then((m) => m.AboutPage),
//   { ssr: true },
// );

export default function Page() {
  return (
    <>
      <AboutPage />
    </>
  );
}
