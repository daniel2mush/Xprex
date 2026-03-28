import {
  AdminReportsResponse,
  ReportStatus,
  UpdateReportStatusResponse,
} from "@/types/Types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useAdminReports = (status?: ReportStatus | "ALL") => {
  return useQuery({
    queryKey: ["admin", "reports", status ?? "ALL"],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "40",
      });

      if (status && status !== "ALL") {
        params.set("status", status);
      }

      const response = await fetch(`/api/admin/reports?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to load reports");
      }

      return response.json() as Promise<AdminReportsResponse>;
    },
    staleTime: 1000 * 20,
  });
};

export const useUpdateAdminReportStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      status,
    }: {
      reportId: string;
      status: ReportStatus;
    }) => {
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update report");
      }

      return response.json() as Promise<UpdateReportStatusResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
  });
};
