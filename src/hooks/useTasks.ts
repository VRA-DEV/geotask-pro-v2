"use client";

import useSWR from "swr";
import { useCallback } from "react";
import type { Task, PaginatedResponse } from "@/types";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error("Erro ao carregar dados");
    return r.json();
  });

interface UseTasksOptions {
  status?: string;
  sector_id?: number;
  responsible_id?: number;
  team_id?: number;
  search?: string;
  page?: number;
  limit?: number;
  summary?: boolean;
}

export function useTasks(options: UseTasksOptions = {}) {
  const params = new URLSearchParams();
  if (options.status) params.set("status", options.status);
  if (options.sector_id) params.set("sector_id", String(options.sector_id));
  if (options.responsible_id) params.set("responsible_id", String(options.responsible_id));
  if (options.team_id) params.set("team_id", String(options.team_id));
  if (options.search) params.set("search", options.search);
  if (options.page) params.set("page", String(options.page));
  if (options.limit) params.set("limit", String(options.limit));
  if (options.summary) params.set("summary", "true");

  const queryString = params.toString();
  const url = `/api/tasks${queryString ? `?${queryString}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Task>>(
    url,
    fetcher,
    { refreshInterval: 30000 }
  );

  return {
    tasks: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useTask(id: number | null) {
  const { data, error, isLoading, mutate } = useSWR<{ data: Task }>(
    id ? `/api/tasks/${id}` : null,
    fetcher
  );

  return {
    task: data?.data || null,
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useTaskActions() {
  const updateStatus = useCallback(
    async (id: number, status: string, userId: number) => {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, action: "update_status", status, user_id: userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao atualizar status");
      }
      return res.json();
    },
    []
  );

  const updateFields = useCallback(
    async (id: number, fields: Record<string, unknown>, userId: number) => {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, action: "update_fields", user_id: userId, ...fields }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao atualizar");
      }
      return res.json();
    },
    []
  );

  const createTask = useCallback(async (data: Record<string, unknown>) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || "Erro ao criar tarefa");
    }
    return res.json();
  }, []);

  const deleteTask = useCallback(async (id: number) => {
    const res = await fetch(`/api/tasks?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erro ao excluir");
    }
    return res.json();
  }, []);

  return { updateStatus, updateFields, createTask, deleteTask };
}
