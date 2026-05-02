"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to Supabase Realtime changes on key tables and invalidates
 * the matching React Query caches so the UI auto-refreshes on
 * INSERT/UPDATE/DELETE from any client (admin panel, other tabs, etc).
 */

// Map db table -> list of React Query keys to invalidate
const TABLE_TO_QUERY_KEYS: Record<string, string[][]> = {
  posts: [
    ["public-posts"],
    ["public-post"],
    ["posts"],
    ["app-data"],
  ],
  students: [["public-students"], ["app-data"]],
  categories: [["app-data"]],
  master_goals: [["app-data"]],
  settings: [["app-data"]],
};

export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const tables = Object.keys(TABLE_TO_QUERY_KEYS);

    const channel = supabase.channel("public-realtime-sync");

    tables.forEach((table) => {
      (channel as any).on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload: any) => {
          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.log(`[realtime] ${table} ${payload.eventType}`);
          }
          const keys = TABLE_TO_QUERY_KEYS[table] || [];
          keys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}