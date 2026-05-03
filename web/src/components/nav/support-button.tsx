import { LifeBuoy } from "lucide-react";
import { SidebarMenuButton, useSidebar } from "@/src/components/ui/sidebar";
import { useSupportDrawer } from "@/src/features/support-chat/SupportDrawerProvider";
import { useI18n } from "@/src/features/i18n";

export const SupportButton = () => {
  const { setOpen: setSupportDrawerOpen } = useSupportDrawer();
  const { isMobile, setOpenMobile: setOpenMobileSidebar } = useSidebar();
  const { t } = useI18n();

  return (
    <SidebarMenuButton
      onClick={() => {
        if (isMobile) {
          setOpenMobileSidebar(false);
        }
        setTimeout(() => {
          // push to next tick to avoid flickering when hiding sidebar on mobile
          setSupportDrawerOpen(true);
        }, 1);
      }}
    >
      <LifeBuoy className="h-4 w-4" />
      {t("nav.support")}
    </SidebarMenuButton>
  );
};
