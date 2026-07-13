import { api } from "./client.js";

const dashboardEndpoints = {
  admin: "/dashboard/admin/",
  regional: "/dashboard/regional/",
  outpost: "/dashboard/outpost/",
};

export const getDashboardData = async (role) => {
  const endpoint = dashboardEndpoints[role];

  if (!endpoint) {
    throw new Error("Для этой роли dashboard не настроен.");
  }

  const { data } = await api.get(endpoint);
  return data;
};

export const createMethodicalSubject = async (payload) => {
  const { data } = await api.post("/dashboard/methodical-subjects/", payload);
  return data;
};

export const getMethodicalSubjects = async () => {
  const { data } = await api.get("/dashboard/methodical-subjects/");
  return data;
};

export const updateMethodicalSubject = async (id, payload) => {
  const { data } = await api.patch(`/dashboard/methodical-subjects/${id}/`, payload);
  return data;
};

export const deleteMethodicalSubject = async (id) => {
  await api.delete(`/dashboard/methodical-subjects/${id}/`);
};

export const createLessonSchedulePeriod = async (payload) => {
  const { data } = await api.post("/dashboard/lesson-schedule-periods/", payload);
  return data;
};

export const getCombatTrainingJournals = async (scope) => {
  const { data } = await api.get("/dashboard/combat-training-journals/", {
    params: scope ? { scope } : undefined,
  });
  return data;
};

export const createCombatTrainingJournal = async (payload) => {
  const { data } = await api.post("/dashboard/combat-training-journals/", payload);
  return data;
};

export const updateCombatTrainingJournal = async (id, payload) => {
  const { data } = await api.patch(`/dashboard/combat-training-journals/${id}/`, payload);
  return data;
};

export const getAdminChatMessages = async (params = {}) => {
  const { data } = await api.get("/auth/chat/messages/", { params });
  return data;
};

export const createAdminChatMessage = async (payload) => {
  const { data } = await api.post("/auth/chat/messages/", payload);
  return data;
};

export const getScopedUsers = async () => {
  const { data } = await api.get("/auth/users/");
  return data;
};
