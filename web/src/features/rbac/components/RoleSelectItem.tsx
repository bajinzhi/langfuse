import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/src/components/ui/hover-card";
import { SelectItem } from "@/src/components/ui/select";
import { Role } from "@langfuse/shared";
import { HoverCardPortal } from "@radix-ui/react-hover-card";
import { organizationRoleAccessRights } from "@/src/features/rbac/constants/organizationAccessRights";
import { projectRoleAccessRights } from "@/src/features/rbac/constants/projectAccessRights";
import { orderedRoles } from "@/src/features/rbac/constants/orderedRoles";
import { useI18n, type MessageKey } from "@/src/features/i18n";

type Translate = (
  key: MessageKey,
  values?: Record<string, string | number | boolean | null>,
) => string;

export const RoleSelectItem = ({
  role,
  isProjectRole,
}: {
  role: Role;
  isProjectRole?: boolean;
}) => {
  const { t } = useI18n();
  const isProjectNoneRole = role === Role.NONE && isProjectRole;
  const isOrgNoneRole = role === Role.NONE && !isProjectRole;

  return (
    <HoverCard openDelay={0} closeDelay={0}>
      <HoverCardTrigger asChild>
        <SelectItem value={role} className="max-w-56">
          <span>
            {formatRole(role, t)}
            {isProjectNoneRole ? ` ${t("rbac.keepDefaultRole")}` : ""}
          </span>
        </SelectItem>
      </HoverCardTrigger>
      <HoverCardPortal>
        <HoverCardContent hideWhenDetached={true} align="center" side="right">
          {isProjectNoneRole ? (
            <div className="text-xs">{t("rbac.projectNoneRoleComment")}</div>
          ) : isOrgNoneRole ? (
            <div className="text-xs">{t("rbac.orgNoneRoleComment")}</div>
          ) : (
            <>
              <div className="font-bold">
                {t("rbac.roleLabel", { role: formatRole(role, t) })}
              </div>
              <p className="mt-2 text-xs font-semibold">
                {t("rbac.organizationScopes")}
              </p>
              <ul className="list-inside list-disc text-xs">
                {reduceScopesToListItems(
                  organizationRoleAccessRights,
                  role,
                  t,
                )}
              </ul>
              <p className="mt-2 text-xs font-semibold">
                {t("rbac.projectScopes")}
              </p>
              <ul className="list-inside list-disc text-xs">
                {reduceScopesToListItems(projectRoleAccessRights, role, t)}
              </ul>
              <p className="mt-2 border-t pt-2 text-xs">
                {t("rbac.note")}{" "}
                <span className="text-muted-foreground">
                  {t("rbac.mutedScopes")}
                </span>{" "}
                {t("rbac.inheritedScopes")}
              </p>
            </>
          )}
        </HoverCardContent>
      </HoverCardPortal>
    </HoverCard>
  );
};

const reduceScopesToListItems = (
  accessRights: Record<string, string[]>,
  role: Role,
  t: Translate,
) => {
  const currentRoleLevel = orderedRoles[role];
  const lowerRole = Object.entries(orderedRoles).find(
    ([_role, level]) => level === currentRoleLevel - 1,
  )?.[0] as Role | undefined;
  const inheritedScopes = lowerRole ? accessRights[lowerRole] : [];

  return accessRights[role].length > 0 ? (
    <>
      {Object.entries(
        accessRights[role].reduce(
          (acc, scope) => {
            const [resource, action] = scope.split(":");
            if (!acc[resource]) {
              acc[resource] = [];
            }
            acc[resource].push(action);
            return acc;
          },
          {} as Record<string, string[]>,
        ),
      ).map(([resource, actions]) => {
        const inheritedActions = actions.filter((action) =>
          inheritedScopes.includes(`${resource}:${action}`),
        );
        const newActions = actions.filter(
          (action) => !inheritedScopes.includes(`${resource}:${action}`),
        );

        return (
          <li key={resource}>
            <span>{resource}: </span>
            <span className="text-muted-foreground">
              {inheritedActions.length > 0 ? inheritedActions.join(", ") : ""}
              {newActions.length > 0 && inheritedActions.length > 0 ? ", " : ""}
            </span>
            <span className="font-semibold">
              {newActions.length > 0 ? newActions.join(", ") : ""}
            </span>
          </li>
        );
      })}
    </>
  ) : (
    <li>{t("common.none")}</li>
  );
};

const roleMessageKeys: Record<Role, MessageKey> = {
  [Role.OWNER]: "rbac.roles.owner",
  [Role.ADMIN]: "rbac.roles.admin",
  [Role.MEMBER]: "rbac.roles.member",
  [Role.VIEWER]: "rbac.roles.viewer",
  [Role.NONE]: "common.none",
};

const formatRole = (role: Role, t: Translate) => t(roleMessageKeys[role]);
