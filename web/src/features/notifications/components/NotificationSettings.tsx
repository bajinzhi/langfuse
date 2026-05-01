import { useState } from "react";
import { useRouter } from "next/router";
import { api } from "@/src/utils/api";
import Header from "@/src/components/layouts/header";
import { Card, CardContent } from "@/src/components/ui/card";
import { Label } from "@/src/components/ui/label";
import { Switch } from "@/src/components/ui/switch";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { useI18n } from "@/src/features/i18n";

export function NotificationSettings() {
  const { t } = useI18n();
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const [isSaving, setIsSaving] = useState(false);

  const hasAccess = useHasProjectAccess({
    projectId,
    scope: "project:read",
  });

  const {
    data: preferences,
    isLoading,
    refetch,
  } = api.notificationPreferences.getForProject.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );

  const updatePreference = api.notificationPreferences.update.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleToggle = async (enabled: boolean) => {
    setIsSaving(true);
    await updatePreference.mutateAsync({
      projectId,
      channel: "EMAIL",
      type: "COMMENT_MENTION",
      enabled,
    });
    setIsSaving(false);
  };

  if (isLoading || !preferences) {
    return (
      <div>
        <Header title={t("notifications.settingsTitle")} />
        <Card className="mt-4">
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">
              {t("notifications.loadingPreferences")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const emailCommentMention = preferences.find(
    (p) => p.channel === "EMAIL" && p.type === "COMMENT_MENTION",
  );

  return (
    <div>
      <Header title={t("notifications.settingsTitle")} />
      <Card className="mt-4">
        <CardContent className="space-y-6 p-6">
          <div>
            <h3 className="text-lg font-medium">
              {t("notifications.emailNotifications")}
            </h3>
            <p className="text-muted-foreground text-sm">
              {t("notifications.emailDescription")}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="comment-mention" className="text-base">
                  {t("notifications.commentMentions")}
                </Label>
                <p className="text-muted-foreground text-sm">
                  {t("notifications.commentMentionsDescription")}
                </p>
              </div>
              <Switch
                id="comment-mention"
                checked={emailCommentMention?.enabled ?? true}
                onCheckedChange={handleToggle}
                disabled={isSaving || !hasAccess}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {updatePreference.isError && (
        <div className="border-destructive bg-destructive/10 mt-4 rounded-lg border p-4">
          <p className="text-destructive text-sm">
            {t("notifications.updateFailed")}
          </p>
        </div>
      )}
    </div>
  );
}
