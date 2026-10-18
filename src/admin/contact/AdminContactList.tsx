import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { usePortfolioScope } from "../../portfolio/PortfolioScope";
import type { ApiEnvelope, ContactMessage, PaginatedResponse } from "../../api/types";
import { ListCard } from "../components/ListCard";
import { RowActions } from "../components/RowActions";
import { confirmDelete } from "../components/confirmDelete";
import VirtualTable from "../dms/components/VirtualTable";
import "../admin.css";

export function AdminContactList() {
  const queryClient = useQueryClient();
  const scope = usePortfolioScope();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-contact-messages", scope?.cacheKey],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<PaginatedResponse<ContactMessage>>>("/admin/contact", {
        params: { page: 1, pageSize: 500 },
      });
      return data.data;
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/contact/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contact-messages"] });
    },
  });

  async function handleDelete(id: number) {
    if (await confirmDelete("message")) {
      deleteMessage.mutate(id);
    }
  }

  const items = data?.items ?? [];

  const columns = useMemo(
    () => [
      {
        name: "Actions",
        cell: (row: any) => <RowActions onDelete={() => handleDelete(row.id)} />,
        export: false,
        ignoreRowClick: true,
        button: true,
      },
      { name: "Name", selector: (row: any) => row.name, sortable: true },
      { name: "Email", selector: (row: any) => row.email, sortable: true },
      { name: "Subject", selector: (row: any) => row.subject, sortable: true },
      {
        name: "Message",
        cell: (row: any) => <div style={{ whiteSpace: "pre-wrap", maxWidth: 320 }}>{row.message}</div>,
        wrap: true,
      },
      {
        name: "Sent At",
        selector: (row: any) => new Date(row.sentAt).toLocaleString(),
        sortable: true,
      },
    ],
    [],
  );

  return (
    <ListCard title="Contact Messages">
      <VirtualTable data={items} columns={columns} loading={isLoading} title="Contact Messages" displayTitle="" />
    </ListCard>
  );
}
