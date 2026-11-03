import { Workspace, Project, Task } from "@/types";

/**
 * Generate a shareable URL containing workspace, project, and task identifiers.
 * Example: https://myapp.com/?workspace=acme-corp&project=prj-1&taskId=tsk-2
 */
export function generateTaskShareUrl(
  taskId: string,
  projectId: string,
  workspaceId: string = "ws-1"
): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?workspace=${encodeURIComponent(workspaceId)}&project=${encodeURIComponent(
    projectId
  )}&taskId=${encodeURIComponent(taskId)}`;
}

/**
 * Copy task shareable URL to clipboard with fallback for various environments.
 */
export async function copyTaskShareUrl(
  taskId: string,
  projectId: string,
  workspaceId: string = "ws-1"
): Promise<boolean> {
  const url = generateTaskShareUrl(taskId, projectId, workspaceId);
  if (!url) return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      return true;
    }

    // Fallback for non-https or restricted clipboard contexts
    const textArea = document.createElement("textarea");
    textArea.value = url;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "-9999px";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Clipboard copy failed:", err);
    return false;
  }
}
