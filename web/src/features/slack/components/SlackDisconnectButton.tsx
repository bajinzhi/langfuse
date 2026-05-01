import React, { useState } from "react";
import { Unlink, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { showSuccessToast } from "@/src/features/notifications/showSuccessToast";
import { showErrorToast } from "@/src/features/notifications/showErrorToast";
import { api } from "@/src/utils/api";
import { useI18n } from "@/src/features/i18n";

/**
 * Props for the SlackDisconnectButton component
 */
interface SlackDisconnectButtonProps {
  /** Project ID for the Slack integration */
  projectId: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Button variant */
  variant?:
    | "default"
    | "outline-solid"
    | "secondary"
    | "destructive"
    | "ghost"
    | "link";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Custom button text */
  buttonText?: string;
  /** Callback when disconnection is successful */
  onSuccess?: () => void;
  /** Callback when disconnection fails */
  onError?: (error: Error) => void;
  /** Whether to show confirmation dialog */
  showConfirmation?: boolean;
  /** Whether to show the button text */
  showText?: boolean;
}

/**
 * A button component that handles disconnecting the Slack integration.
 *
 * This component handles:
 * - Showing a confirmation dialog before disconnecting
 * - Calling the disconnect API endpoint
 * - Providing loading states during the disconnection process
 * - Displaying appropriate success/error messages
 * - Calling success/error callbacks
 *
 * The component includes safety measures to prevent accidental disconnection:
 * - Confirmation dialog with clear warning about consequences
 * - Information about what happens when disconnecting
 * - Option to cancel the operation
 *
 * @param projectId - The project ID for the Slack integration
 * @param disabled - Whether the button should be disabled
 * @param variant - Button variant (default: "destructive")
 * @param size - Button size (default: "sm")
 * @param buttonText - Custom button text (default: "Disconnect")
 * @param onSuccess - Callback when disconnection is successful
 * @param onError - Callback when disconnection fails
 * @param showConfirmation - Whether to show confirmation dialog (default: true)
 * @param showText - Whether to show the button text (default: true)
 */
export const SlackDisconnectButton: React.FC<SlackDisconnectButtonProps> = ({
  projectId,
  disabled = false,
  variant = "destructive",
  size = "sm",
  buttonText,
  onSuccess,
  onError,
  showConfirmation = true,
  showText = true,
}) => {
  const { t } = useI18n();
  const resolvedButtonText = buttonText ?? t("slack.disconnect");
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Disconnect mutation
  const disconnectMutation = api.slack.disconnect.useMutation({
    onSuccess: () => {
      setIsDisconnecting(false);
      setIsDialogOpen(false);

      showSuccessToast({
        title: t("slack.disconnectedTitle"),
        description: t("slack.disconnectedDescription"),
      });

      onSuccess?.();
    },
    onError: (error: any) => {
      setIsDisconnecting(false);

      const errorMessage = error.message || t("slack.disconnectFailed");

      showErrorToast(t("slack.disconnectionFailed"), errorMessage);

      onError?.(new Error(errorMessage));
    },
  });

  // Handle disconnect action
  const handleDisconnect = async () => {
    if (isDisconnecting) return;

    setIsDisconnecting(true);

    try {
      await disconnectMutation.mutateAsync({ projectId });
    } catch (error) {
      // Error handling is done in the mutation callbacks
      console.error(t("slack.disconnectionError"), error);
    }
  };

  // Handle button click
  const handleClick = () => {
    if (showConfirmation) {
      setIsDialogOpen(true);
    } else {
      handleDisconnect();
    }
  };

  const buttonContent = (
    <>
      {isDisconnecting ? (
        <Loader2
          className={
            showText ? "mr-2 h-4 w-4 animate-spin" : "h-4 w-4 animate-spin"
          }
        />
      ) : (
        <Unlink className={showText ? "mr-2 h-4 w-4" : "h-4 w-4"} />
      )}
      {showText &&
        (isDisconnecting ? t("slack.disconnecting") : resolvedButtonText)}
    </>
  );

  if (showConfirmation) {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            disabled={disabled || isDisconnecting}
          >
            {buttonContent}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive h-5 w-5" />
              {t("slack.disconnectTitle")}
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                {t("slack.disconnectConfirm")}
              </p>
              <div className="bg-muted space-y-2 rounded-md p-3">
                <p className="text-sm font-medium">
                  {t("slack.disconnectThisWill")}
                </p>
                <ul className="ml-4 space-y-1 text-sm">
                  <li>• {t("slack.disconnectRemoveBot")}</li>
                  <li>• {t("slack.disconnectDisableAutomations")}</li>
                  <li>• {t("slack.disconnectStopNotifications")}</li>
                  <li>• {t("slack.disconnectDeleteCredentials")}</li>
                </ul>
              </div>
              <p className="text-muted-foreground text-sm">
                {t("slack.disconnectReconnectHelp")}
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isDisconnecting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("slack.disconnecting")}
                </>
              ) : (
                <>
                  <Unlink className="mr-2 h-4 w-4" />
                  {t("slack.disconnect")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled || isDisconnecting}
    >
      {buttonContent}
    </Button>
  );
};
