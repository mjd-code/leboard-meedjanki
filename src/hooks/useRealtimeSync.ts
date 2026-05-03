"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Empty hook since Supabase was eradicated. 
 * Realtime sync can be implemented with Firestore onSnapshot natively later.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // No-op
  }, [queryClient]);
}