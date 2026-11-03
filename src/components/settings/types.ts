import { User, UserRole, Workspace } from "@/types";

export type SettingsTab =
  | "profile"
  | "members"
  | "workspace"
  | "appearance"
  | "outlook";

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users: User[];
  workspace: Workspace;
  onUpdateCurrentUser: (updates: Partial<User>) => void;
  onUpdateUserRole: (userId: string, newRole: UserRole) => void;
  onAddMember?: (member: { name: string; email: string; role: UserRole; title: string }) => void;
  onRemoveMember?: (userId: string) => void;
  onUpdateWorkspace: (updates: Partial<Workspace>) => void;
  onOpenCreateWorkspace?: () => void;
  onOpenOutlookSync?: () => void;
  onTriggerManualSync?: () => Promise<void>;
  onLogout?: () => void;
  initialTab?: SettingsTab;
  isLoading?: boolean;
}
