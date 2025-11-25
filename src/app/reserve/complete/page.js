// src/app/reserve/complete/page.js
import { Suspense } from "react";
import CompletePageClient from "./CompletePageClient";

// このページはクエリパラメータ（id）を使うので動的レンダリングにする
export const dynamic = "force-dynamic";

export default function CompletePage() {
  return (
    <Suspense fallback={<div>読み込み中です...</div>}>
      <CompletePageClient />
    </Suspense>
  );
}
