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

export const getMethodicalDocuments = async (subjectId) => {
  const { data } = await api.get(`/dashboard/methodical-subjects/${subjectId}/documents/`);
  return data;
};

export const createMethodicalDocument = async (subjectId, payload) => {
  const { data } = await api.post(
    `/dashboard/methodical-subjects/${subjectId}/documents/`,
    payload
  );
  return data;
};

export const deleteMethodicalDocument = async (subjectId, documentId) => {
  await api.delete(
    `/dashboard/methodical-subjects/${subjectId}/documents/${documentId}/`
  );
};

export const createLessonSchedulePeriod = async (payload) => {
  const { data } = await api.post("/dashboard/lesson-schedule-periods/", payload);
  return data;
};

export const deleteLessonSchedulePeriod = async (sectionId, periodId) => {
  await api.delete(`/dashboard/lesson-schedule-periods/${sectionId}/${periodId}/`);
};

export const createLibraryPeriod = async (payload) => {
  const { data } = await api.post("/dashboard/library-periods/", payload);
  return data;
};

export const updateLibraryPeriod = async (sectionId, periodId, payload) => {
  const { data } = await api.patch(
    `/dashboard/library-periods/${sectionId}/${periodId}/`,
    payload
  );
  return data;
};

export const deleteLibraryPeriod = async (sectionId, periodId) => {
  await api.delete(`/dashboard/library-periods/${sectionId}/${periodId}/`);
};

export const getThematicAccountSubmissions = async () => {
  const { data } = await api.get("/dashboard/thematic-account-submissions/");
  return data;
};

export const createThematicAccountSubmission = async (payload) => {
  const { data } = await api.post("/dashboard/thematic-account-submissions/", payload);
  return data;
};

export const deleteThematicAccountSubmission = async (id, subjectId) => {
  const { data } = await api.delete(`/dashboard/thematic-account-submissions/${id}/`, {
    params: subjectId ? { subjectId } : undefined,
  });
  return data || null;
};

export const forwardThematicAccountSubmission = async (id, documentTitle) => {
  const { data } = await api.post(
    `/dashboard/thematic-account-submissions/${id}/forward/`,
    { documentTitle }
  );
  return data;
};

export const requestSubmissionEditPermission = async (id) => {
  const { data } = await api.post(`/dashboard/thematic-account-submissions/${id}/edit-request/`);
  return data;
};

export const getSubmissionEditRequests = async () => {
  const { data } = await api.get("/dashboard/submission-edit-requests/");
  return data;
};

export const decideSubmissionEditRequest = async (id, status) => {
  const { data } = await api.patch(`/dashboard/submission-edit-requests/${id}/`, { status });
  return data;
};

export const getCombatTrainingPlans = async (layout = "plan") => {
  const { data } = await api.get("/dashboard/combat-training-plans/", {
    params: { layout },
  });
  return data;
};

export const createCombatTrainingPlan = async (payload) => {
  const { data } = await api.post("/dashboard/combat-training-plans/", payload);
  return data;
};

export const updateCombatTrainingPlan = async (id, payload) => {
  const { data } = await api.patch(`/dashboard/combat-training-plans/${id}/`, payload);
  return data;
};

export const deleteCombatTrainingPlan = async (id) => {
  await api.delete(`/dashboard/combat-training-plans/${id}/`);
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

export const deleteCombatTrainingJournal = async (id) => {
  await api.delete(`/dashboard/combat-training-journals/${id}/`);
};

export const getCombatTrainingNews = async () => {
  const { data } = await api.get("/dashboard/combat-training-news/");
  return data.results || [];
};

export const createCombatTrainingNews = async (payload) => {
  const { data } = await api.post("/dashboard/combat-training-news/", payload);
  return data;
};

export const updateCombatTrainingNews = async (id, payload) => {
  const { data } = await api.patch(`/dashboard/combat-training-news/${id}/`, payload);
  return data;
};

export const deleteCombatTrainingNews = async (id) => {
  await api.delete(`/dashboard/combat-training-news/${id}/`);
};

export const toggleCombatTrainingNewsLike = async (id) => {
  const { data } = await api.post(`/dashboard/combat-training-news/${id}/like/`);
  return data;
};

export const getCombatTrainingNewsUnreadCount = async () => {
  const { data } = await api.get("/dashboard/combat-training-news/unread-count/");
  return data.unreadCount || 0;
};

export const markAllCombatTrainingNewsRead = async () => {
  const { data } = await api.post("/dashboard/combat-training-news/read-all/");
  return data;
};

export const getAdminChatMessages = async (params = {}) => {
  const { data } = await api.get("/auth/chat/messages/", { params });
  return data;
};

export const getChatPartners = async () => {
  const { data } = await api.get("/auth/chat/partners/");
  return data;
};

export const getChatUnreadCount = async () => {
  const { data } = await api.get("/auth/chat/unread-count/");
  return data.unreadCount || 0;
};

export const createAdminChatMessage = async (payload) => {
  const { data } = await api.post("/auth/chat/messages/", payload);
  return data;
};

export const deleteAdminChatMessage = async (id, mode) => {
  const { data } = await api.delete(`/auth/chat/messages/${id}/`, {
    data: { mode },
  });
  return data;
};

export const getScopedUsers = async () => {
  const { data } = await api.get("/auth/users/");
  return data;
};
