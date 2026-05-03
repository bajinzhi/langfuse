import { TrashIcon } from "lucide-react";
import { useState } from "react";
import Header from "@/src/components/layouts/header";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { api } from "@/src/utils/api";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { CreateLLMApiKeyDialog } from "./CreateLLMApiKeyDialog";
import { UpdateLLMApiKeyDialog } from "./UpdateLLMApiKeyDialog";
import { useI18n } from "@/src/features/i18n";

export function LlmApiKeyList(props: { projectId: string }) {
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  const hasAccess = useHasProjectAccess({
    projectId: props.projectId,
    scope: "llmApiKeys:read",
  });

  const apiKeys = api.llmApiKey.all.useQuery(
    {
      projectId: props.projectId,
    },
    {
      enabled: hasAccess,
    },
  );

  const hasExtraHeaderKeys = apiKeys.data?.data.some(
    (key) => key.extraHeaderKeys.length > 0,
  );

  if (!hasAccess) {
    return (
      <div>
        <Header title={t("publicApi.llmConnections")} />
        <Alert>
          <AlertTitle>{t("publicApi.accessDenied")}</AlertTitle>
          <AlertDescription>
            {t("publicApi.llmConnectionsNoPermission")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div id="llm-api-keys">
      <Header title={t("publicApi.llmConnections")} />
      <p className="mb-4 text-sm">{t("publicApi.llmConnectionsDescription")}</p>
      <Card className="mb-4 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-foreground md:table-cell">
                {t("publicApi.provider")}
              </TableHead>
              <TableHead className="text-foreground md:table-cell">
                {t("publicApi.adapter")}
              </TableHead>
              <TableHead className="text-foreground md:table-cell">
                {t("publicApi.baseUrl")}
              </TableHead>
              <TableHead className="text-foreground">
                {t("publicApi.apiKey")}
              </TableHead>
              {hasExtraHeaderKeys ? (
                <TableHead className="text-foreground">
                  {t("publicApi.extraHeaders")}
                </TableHead>
              ) : null}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody className="text-muted-foreground">
            {apiKeys.data?.data.length === 0 ? (
              <TableRow>
                <TableCell
                  density="comfortable"
                  colSpan={6}
                  className="text-center"
                >
                  {t("publicApi.none")}
                </TableCell>
              </TableRow>
            ) : (
              apiKeys.data?.data.map((apiKey) => (
                <TableRow
                  key={apiKey.id}
                  className="hover:bg-primary-foreground cursor-default"
                  onClick={() => setEditingKeyId(apiKey.id)}
                >
                  <TableCell density="comfortable" className="font-mono">
                    {apiKey.provider}
                  </TableCell>
                  <TableCell density="comfortable" className="font-mono">
                    {apiKey.adapter}
                  </TableCell>
                  <TableCell
                    density="comfortable"
                    className="max-w-md overflow-auto font-mono"
                  >
                    {apiKey.baseURL ?? "default"}
                  </TableCell>
                  <TableCell density="comfortable" className="font-mono">
                    {apiKey.displaySecretKey}
                  </TableCell>
                  {hasExtraHeaderKeys ? (
                    <TableCell density="comfortable">
                      {" "}
                      {apiKey.extraHeaderKeys.join(", ")}{" "}
                    </TableCell>
                  ) : null}
                  <TableCell density="comfortable" className="text-right">
                    <div
                      className="flex justify-end space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <UpdateLLMApiKeyDialog
                        apiKey={apiKey}
                        projectId={props.projectId}
                        open={editingKeyId === apiKey.id}
                        onOpenChange={(open: boolean) => {
                          if (open) {
                            setEditingKeyId(apiKey.id);
                          } else {
                            setEditingKeyId(null);
                          }
                        }}
                      />
                      <DeleteApiKeyButton
                        projectId={props.projectId}
                        apiKeyId={apiKey.id}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      <CreateLLMApiKeyDialog open={open} setOpen={setOpen} />
    </div>
  );
}

// show dialog to let user confirm that this is a destructive action
function DeleteApiKeyButton(props: { projectId: string; apiKeyId: string }) {
  const capture = usePostHogClientCapture();
  const { t } = useI18n();
  const hasAccess = useHasProjectAccess({
    projectId: props.projectId,
    scope: "llmApiKeys:delete",
  });

  const utils = api.useUtils();
  const mutDeleteApiKey = api.llmApiKey.delete.useMutation({
    onSuccess: () => utils.llmApiKey.invalidate(),
  });
  const [open, setOpen] = useState(false);

  if (!hasAccess) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <TrashIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="mb-5">
            {t("publicApi.deleteLlmConnection")}
          </DialogTitle>
          <DialogDescription>
            {t("publicApi.deleteLlmConnectionConfirm")}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="destructive"
            onClick={() => {
              mutDeleteApiKey
                .mutateAsync({
                  projectId: props.projectId,
                  id: props.apiKeyId,
                })
                .then(() => {
                  capture("project_settings:llm_api_key_delete");
                  setOpen(false);
                })
                .catch((error) => {
                  console.error(error);
                });
            }}
            loading={mutDeleteApiKey.isPending}
          >
            {t("publicApi.permanentlyDelete")}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
