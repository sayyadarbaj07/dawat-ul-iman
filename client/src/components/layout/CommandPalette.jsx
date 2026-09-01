import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAuth, ROLE_PERMISSIONS } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { NAV_GROUPS, NAV_ITEMS } from "./nav";

export function CommandPalette({ open, onOpenChange }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { tr } = useLanguage();
  const allowed = user ? ROLE_PERMISSIONS[user.role] || [] : [];
  const items = NAV_ITEMS.filter((item) => allowed.includes(item.href));

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={tr("dashboard", "searchPages")} />
      <CommandList>
        <CommandEmpty>{tr("dashboard", "noSearchResults")}</CommandEmpty>
        {NAV_GROUPS.map((group) => {
          const groupItems = items.filter((item) => item.group === group.id);
          if (!groupItems.length) return null;
          return (
            <CommandGroup
              key={group.id}
              heading={tr("navigation", group.labelKey)}
            >
              {groupItems.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${tr("navigation", item.key)} ${item.href}`}
                  onSelect={() => {
                    setLocation(item.href);
                    onOpenChange(false);
                  }}
                >
                  <item.icon />
                  {tr("navigation", item.key)}
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
