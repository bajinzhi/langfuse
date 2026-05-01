import Header from "@/src/components/layouts/header";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { CodeView } from "@/src/components/ui/CodeJsonViewer";
import { Input } from "@/src/components/ui/input";
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
  TableCellWithCopyButton,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { CreateApiKeyButton } from "@/src/features/public-api/components/CreateApiKeyButton";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { useHasOrganizationAccess } from "@/src/features/rbac/utils/checkOrganizationAccess";
import { api } from "@/src/utils/api";
import { DialogDescription } from "@radix-ui/react-dialog";
import { TrashIcon } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { useLangfuseEnvCode } from "@/src/features/public-api/hooks/useLangfuseEnvCode";
import { useI18n } from "@/src/features/i18n";

type ApiKeyScope = "project" | "organization";
type ApiKeyEntity = { id: string; note: string | null };

export function ApiKeyList(props: { entityId: string; scope: ApiKeyScope }) {
  const { entityId, scope } = props;
  const envCode = useLangfuseEnvCode();
  const { t, formatDate } = useI18n();

  if (!entityId) {
    throw new Error(
      `${scope}Id is required for ApiKeyList with scope ${scope}`,
    );
  }

  const hasProjectAccess = useHasProjectAccess({
    projectId: props.entityId,
    scope: "apiKeys:CUD",
  });
  const hasOrganizationAccess = useHasOrganizationAccess({
    organizationId: props.entityId,
    scope: "organization:CRUD_apiKeys",
  });

  const hasAccess =
    props.scope === "project" ? hasProjectAccess : hasOrganizationAccess;

  const projectApiKeysQuery = api.projectApiKeys.byProjectId.useQuery(
    { projectId: entityId },
    { enabled: hasProjectAccess && props.scope === "project" },
  );
  const organizationApiKeysQuery =
    api.organizationApiKeys.byOrganizationId.useQuery(
      { orgId: entityId },
      { enabled: hasOrganizationAccess && props.scope === "organization" },
    );
  const apiKeysQuery =
    props.scope === "project" ? projectApiKeysQuery : organizationApiKeysQuery;

  if (!hasAccess) {
    return (
      <div>
        <Header title={t("publicApi.apiKeys")} />
        <Alert>
          <AlertTitle>{t("publicApi.accessDenied")}</AlertTitle>
          <AlertDescription>
            {t("publicApi.apiKeysNoPermission", { scope })}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Header
        title={t("publicApi.apiKeys")}
        help={{
          description: t("publicApi.learnMoreApiKeys", { scope }),
          href:
            scope === "project"
              ? "https://langfuse.com/docs/api#authentication"
              : "https://langfuse.com/docs/api#org-scoped-routes",
        }}
        actionButtons={<CreateApiKeyButton entityId={entityId} scope={scope} />}
      />
      <CodeView
        content={envCode}
        title=".env"
        copiedToClipboardMessage={t("publicApi.secretsNotIncluded")}
      />
      <Card className="mb-4 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-primary hidden md:table-cell">
                {t("publicApi.created")}
              </TableHead>
              <TableHead className="text-primary">
                {t("publicApi.note")}
              </TableHead>
              <TableHead className="text-primary">
                {t("publicApi.publicKey")}
              </TableHead>
              <TableHead className="text-primary">
                {t("publicApi.secretKey")}
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody className="text-muted-foreground">
            {apiKeysQuery.data?.length === 0 ? (
              <TableRow>
                <TableCell
                  density="comfortable"
                  colSpan={5}
                  className="text-center"
                >
                  {t("publicApi.none")}
                </TableCell>
              </TableRow>
            ) : (
              apiKeysQuery.data?.map((apiKey) => (
                <TableRow
                  key={apiKey.id}
                  className="hover:bg-primary-foreground"
                >
                  <TableCell
                    density="comfortable"
                    className="hidden md:table-cell"
                  >
                    {formatDate(apiKey.createdAt)}
                  </TableCell>
                  <TableCell density="comfortable">
                    <ApiKeyNote
                      apiKey={apiKey}
                      entityId={entityId}
                      scope={scope}
                    />
                  </TableCell>
                  <TableCellWithCopyButton
                    density="comfortable"
                    text={apiKey.publicKey}
                    className="truncate font-mono"
                  />
                  <TableCell density="comfortable" className="font-mono">
                    {apiKey.displaySecretKey}
                  </TableCell>
                  <TableCell density="comfortable">
                    <DeleteApiKeyButton
                      entityId={entityId}
                      apiKeyId={apiKey.id}
                      scope={scope}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// show dialog to let user confirm that this is a destructive action
function DeleteApiKeyButton(props: {
  entityId: string;
  apiKeyId: string;
  scope: ApiKeyScope;
}) {
  const { entityId, apiKeyId, scope } = props;
  const capture = usePostHogClientCapture();
  const { t } = useI18n();

  const hasProjectAccess = useHasProjectAccess({
    projectId: props.entityId,
    scope: "apiKeys:CUD",
  });
  const hasOrganizationAccess = useHasOrganizationAccess({
    organizationId: props.entityId,
    scope: "organization:CRUD_apiKeys",
  });

  const hasAccess =
    props.scope === "project" ? hasProjectAccess : hasOrganizationAccess;

  const utils = api.useUtils();

  const mutDeleteProjectApiKey = api.projectApiKeys.delete.useMutation({
    onSuccess: () => utils.projectApiKeys.invalidate(),
  });
  const mutDeleteOrgApiKey = api.organizationApiKeys.delete.useMutation({
    onSuccess: () => utils.organizationApiKeys.invalidate(),
  });

  const [open, setOpen] = useState(false);

  if (!hasAccess) return null;

  const handleDelete = () => {
    if (scope === "project") {
      mutDeleteProjectApiKey
        .mutateAsync({
          projectId: entityId,
          id: apiKeyId,
        })
        .then(() => {
          capture(`${scope}_settings:api_key_delete`);
          setOpen(false);
        })
        .catch((error) => {
          console.error(error);
        });
    } else {
      mutDeleteOrgApiKey
        .mutateAsync({
          orgId: entityId,
          id: apiKeyId,
        })
        .then(() => {
          capture(`${scope}_settings:api_key_delete`);
          setOpen(false);
        })
        .catch((error) => {
          console.error(error);
        });
    }
  };

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
            {t("publicApi.deleteApiKey")}
          </DialogTitle>
          <DialogDescription>
            {t("publicApi.deleteApiKeyConfirm")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={
              mutDeleteOrgApiKey.isPending || mutDeleteProjectApiKey.isPending
            }
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

function ApiKeyNote({
  apiKey,
  entityId,
  scope,
}: {
  apiKey: ApiKeyEntity;
  entityId: string;
  scope: ApiKeyScope;
}) {
  const utils = api.useUtils();
  const { t } = useI18n();

  const hasProjectAccess = useHasProjectAccess({
    projectId: entityId,
    scope: "apiKeys:CUD",
  });
  const hasOrganizationAccess = useHasOrganizationAccess({
    organizationId: entityId,
    scope: "organization:CRUD_apiKeys",
  });
  const hasEditAccess =
    scope === "project" ? hasProjectAccess : hasOrganizationAccess;

  const mutUpdateProjectApiKey = api.projectApiKeys.updateNote.useMutation({
    onSuccess: () => utils.projectApiKeys.invalidate(),
  });
  const mutUpdateOrgApiKey = api.organizationApiKeys.updateNote.useMutation({
    onSuccess: () => utils.organizationApiKeys.invalidate(),
  });

  const [note, setNote] = useState(apiKey.note ?? "");
  const [isEditing, setIsEditing] = useState(false);

  const handleBlur = () => {
    setIsEditing(false);
    if (note !== apiKey.note) {
      if (scope === "project") {
        mutUpdateProjectApiKey.mutate({
          projectId: entityId,
          keyId: apiKey.id,
          note,
        });
      } else {
        mutUpdateOrgApiKey.mutate({
          orgId: entityId,
          keyId: apiKey.id,
          note,
        });
      }
    }
  };

  if (!hasEditAccess) return note ?? "";

  if (isEditing) {
    return (
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={handleBlur}
        autoFocus
        className="h-8"
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="hover:bg-secondary/50 -mx-2 cursor-pointer rounded px-2 py-1"
    >
      {note || t("publicApi.clickToAddNote")}
    </div>
  );
}
