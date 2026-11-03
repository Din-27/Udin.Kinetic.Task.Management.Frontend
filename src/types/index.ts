export type UserRole = "ADMIN" | "MEMBER" | "VIEWER";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  title: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  taskId: string;
}

export interface CommentAttachment {
  id: string;
  type: "image" | "file" | "audio";
  url: string;
  name: string;
  size?: string;
  duration?: number;
}

export interface TaskComment {
  id: string;
  content: string;
  taskId: string;
  userId: string;
  createdAt: string;
  user?: User;
  attachments?: CommentAttachment[];
}

export interface ActivityLog {
  id: string;
  action: string;
  details?: string;
  taskId: string;
  userId: string;
  createdAt: string;
  user?: User;
}

export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | (string & {});
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskVisibility = "PUBLIC" | "PRIVATE";

export interface BoardColumn {
  id: TaskStatus;
  title: string;
}

export const DEFAULT_BOARD_COLUMNS: BoardColumn[] = [
  { id: "BACKLOG", title: "Backlog" },
  { id: "TODO", title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "IN_REVIEW", title: "In Review" },
  { id: "DONE", title: "Done" },
];

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "TAG_ADDED" | "TAG_REMOVED" | "COLLABORATOR_ADDED" | "COLLABORATOR_REMOVED" | "JOIN_REQUEST" | "GENERAL";
  taskId?: string;
  taskTitle?: string;
  createdAt: string;
  read: boolean;
  actor?: User;
  workspaceId?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  visibility?: TaskVisibility;
  tags?: string[];
  collaboratorIds?: string[];
  collaborators?: User[];
  dueDate: string | null;
  order: number;
  completed: boolean;
  completedAt?: string | null;
  projectId: string;
  creatorId: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: User | null;
  creator?: User;
  subtasks: Subtask[];
  comments: TaskComment[];
  activities: ActivityLog[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  workspaceId: string;
  taskCount?: number;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string;
  color?: string;
  createdBy?: string;
  ownerId?: string;
}

export const WORKSPACE_ACCENT_COLORS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Emerald", value: "#10b981" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Sky", value: "#0284c7" },
  { name: "Orange", value: "#ea580c" },
  { name: "Pink", value: "#ec4899" },
  { name: "Slate", value: "#64748b" },
];

export interface ChatMessage {
  id: string;
  content: string;
  workspaceId: string;
  projectId?: string | null;
  senderId: string;
  type?: "PROJECT_CHAT" | "TEAM_DISCUSSION";
  createdAt: string;
  sender?: User;
}
