/**
 * TraceMetadataBadges - Extracted badge components for trace metadata
 *
 * Following the pattern from ObservationDetailView/ObservationMetadataBadgesSimple.tsx
 * Each badge handles its own null check and returns null when data is unavailable.
 */

import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { useI18n } from "@/src/features/i18n";

export function SessionBadge({
  sessionId,
  projectId,
}: {
  sessionId: string | null;
  projectId: string;
}) {
  const { t } = useI18n();
  if (!sessionId) return null;
  return (
    <Link
      href={`/project/${projectId}/sessions/${encodeURIComponent(sessionId)}`}
      className="inline-flex"
    >
      <Badge>
        <span className="truncate">
          {t("trace.sessionLabel", { id: sessionId })}
        </span>
        <ExternalLinkIcon className="ml-1 h-3 w-3" />
      </Badge>
    </Link>
  );
}

export function UserIdBadge({
  userId,
  projectId,
}: {
  userId: string | null;
  projectId: string;
}) {
  const { t } = useI18n();
  if (!userId) return null;
  return (
    <Link
      href={`/project/${projectId}/users/${encodeURIComponent(userId)}`}
      className="inline-flex"
    >
      <Badge>
        <span className="truncate">{t("trace.userIdLabel", { id: userId })}</span>
        <ExternalLinkIcon className="ml-1 h-3 w-3" />
      </Badge>
    </Link>
  );
}

export function TargetTraceBadge({
  targetTraceId,
  projectId,
}: {
  targetTraceId: string | null;
  projectId: string;
}) {
  const { t } = useI18n();
  if (!targetTraceId) return null;
  return (
    <Link
      href={`/project/${projectId}/traces/${encodeURIComponent(targetTraceId)}`}
      className="inline-flex"
    >
      <Badge>
        <span className="truncate">
          {t("trace.targetTraceLabel", { id: targetTraceId })}
        </span>
        <ExternalLinkIcon className="ml-1 h-3 w-3" />
      </Badge>
    </Link>
  );
}

export function EnvironmentBadge({
  environment,
}: {
  environment: string | null;
}) {
  const { t } = useI18n();
  if (!environment) return null;
  return (
    <Badge variant="tertiary">
      {t("trace.environmentLabel", { value: environment })}
    </Badge>
  );
}

export function ReleaseBadge({ release }: { release: string | null }) {
  const { t } = useI18n();
  if (!release) return null;
  return (
    <Badge variant="tertiary">
      {t("trace.releaseLabel", { value: release })}
    </Badge>
  );
}

export function VersionBadge({ version }: { version: string | null }) {
  const { t } = useI18n();
  if (!version) return null;
  return (
    <Badge variant="tertiary">
      {t("trace.versionLabel", { value: version })}
    </Badge>
  );
}
