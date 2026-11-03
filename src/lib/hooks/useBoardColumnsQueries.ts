import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BoardColumn, DEFAULT_BOARD_COLUMNS } from "@/types";

export function useBoardColumnsQuery(workspaceId?: string) {
  const ws = workspaceId || "default";

  return useQuery<BoardColumn[]>({
    queryKey: ["board-columns", ws],
    queryFn: async () => {
      const res = await fetch(`/api/board-columns?workspaceId=${encodeURIComponent(ws)}&t=${Date.now()}`);
      if (!res.ok) {
        return DEFAULT_BOARD_COLUMNS;
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      return DEFAULT_BOARD_COLUMNS;
    },
    staleTime: 1000 * 60 * 5, // 5 menit
  });
}

export function useSaveBoardColumnsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      columns,
    }: {
      workspaceId?: string;
      columns: BoardColumn[];
    }) => {
      const ws = workspaceId || "default";
      const res = await fetch("/api/board-columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: ws, columns }),
      });
      if (!res.ok) {
        throw new Error("Gagal menyimpan konfigurasi kolom board");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      const ws = variables.workspaceId || "default";
      queryClient.invalidateQueries({ queryKey: ["board-columns", ws] });
    },
  });
}
