import { apiDelete, apiGet, apiPatch, apiPost } from "../api";

export type LeadStatus = "NEW" | "CONTACTED" | "ARCHIVED";

export interface Lead {
  id: number;
  name: string | null;
  email: string;
  company: string | null;
  message: string;
  source: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export const leadStatuses: LeadStatus[] = ["NEW", "CONTACTED", "ARCHIVED"];

export interface BulkResult {
  count: number;
}

export const leadsClient = {
  list(): Promise<Lead[]> {
    return apiGet<Lead[]>("/leads");
  },

  get(id: number): Promise<Lead> {
    return apiGet<Lead>(`/leads/${id}`);
  },

  updateStatus(id: number, status: LeadStatus): Promise<Lead> {
    return apiPatch<Lead>(`/leads/${id}`, { status });
  },

  delete(id: number): Promise<void> {
    return apiDelete<void>(`/leads/${id}`);
  },

  // Bulk ops are a single backend request each (server-side updateMany/
  // deleteMany), not a per-id loop. `count` is how many rows actually changed.
  bulkUpdateStatus(ids: number[], status: LeadStatus): Promise<BulkResult> {
    return apiPost<BulkResult>("/leads/bulk-status", { ids, status });
  },

  bulkDelete(ids: number[]): Promise<BulkResult> {
    return apiPost<BulkResult>("/leads/bulk-delete", { ids });
  },
};

export function leadStatusLabel(status: LeadStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}
