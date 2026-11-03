import { useMutation } from "@tanstack/react-query";

export interface UploadResponse {
  url: string;
  name?: string;
  size?: number;
  type?: string;
}

export function useUploadMutation() {
  return useMutation<UploadResponse, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal mengunggah file ke server storage");
      }

      return res.json();
    },
  });
}
