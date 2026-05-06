import { useEffect } from "react";
import { useRouter } from "next/router";
import {
  installCrossTabSync,
  setActiveProject,
} from "@/src/features/currency/store";

/**
 * Top-level mounter that:
 *
 *  1. Hydrates the global currency store with the project resolved from
 *     the current route (`projectId` URL segment).
 *  2. Installs the cross-tab `storage` listener exactly once so writes
 *     from another tab propagate into the in-memory store.
 *
 * Renders nothing. Mount once near the top of `_app.tsx`.
 */
export function CurrencyPreferenceSyncer() {
  const router = useRouter();
  const projectId =
    typeof router.query.projectId === "string" ? router.query.projectId : null;

  useEffect(() => {
    installCrossTabSync();
  }, []);

  useEffect(() => {
    setActiveProject(projectId);
  }, [projectId]);

  return null;
}
