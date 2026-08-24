import { api } from "./client.js";

const dashboardEndpoints = {
  admin: "/dashboard/admin/",
  regional: "/dashboard/regional/",
  outpost: "/dashboard/outpost/",
};

export const getDashboardData = async (role) => {
  const endpoint = dashboardEndpoints[role];

  if (!endpoint) {
    throw new Error("Бул роль үчүн башкаруу панели жөндөлгөн эмес.");
  }

  const { data } = await api.get(endpoint);
  return data;
};

export const createMethodicalSubject = async (payload) => {
  const { data } = await api.post("/dashboard/methodical-subjects/", payload);
  return data;
};

export const getMethodicalSubjects = async (collection) => {
  const { data } = await api.get("/dashboard/methodical-subjects/", {
    params: collection ? { collection } : undefined,
  });
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

export const getThematicAccountSubmissions = async (registrationNumber) => {
  const { data } = await api.get("/dashboard/thematic-account-submissions/", {
    params: registrationNumber ? { registrationNumber } : undefined,
  });
  return data;
};

export const markThematicAccountSubmissionRead = async (id) => {
  const { data } = await api.patch(
    `/dashboard/thematic-account-submissions/${id}/`,
    { isRead: true }
  );
  return data;
};

export const getCombatTrainingJournalOutposts = async () => {
  const { data } = await api.get("/dashboard/combat-training-journal-outposts/");
  return data;
};

export const createThematicAccountSubmission = async (payload) => {
  const { data } = await api.post("/dashboard/thematic-account-submissions/", payload);
  return data;
};

export const updateThematicAccountSubmission = async (id, payload) => {
  const { data } = await api.patch(`/dashboard/thematic-account-submissions/${id}/`, payload);
  return data;
};

export const deleteThematicAccountSubmission = async (id, subjectId) => {
  const { data } = await api.delete(`/dashboard/thematic-account-submissions/${id}/`, {
    params: subjectId ? { subjectId } : undefined,
  });
  return data || null;
};

export const deleteCombatTrainingJournalRevision = async (id) => {
  await api.delete(`/dashboard/combat-training-journal-revisions/${id}/`);
};

export const markCombatTrainingJournalRevisionRead = async (id) => {
  const { data } = await api.patch(
    `/dashboard/combat-training-journal-revisions/${id}/`,
    { isRead: true }
  );
  return data;
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

export const hideThematicAccountSubmission = async (id) => {
  await api.post(`/dashboard/thematic-account-submissions/${id}/hide/`);
};

export const deleteSubmissionEditRequest = async (id) => {
  await api.delete(`/dashboard/submission-edit-requests/${id}/`);
};

export const getCombatTrainingPlans = async (layout = "plan") => {
  const { data } = await api.get("/dashboard/combat-training-plans/", {
    params: { layout },
  });
  return data;
};

export const getCombatTrainingPlanUnreadCount = async () => {
  const { data } = await api.get("/dashboard/combat-training-plans/unread-count/");
  return data.unreadCount || 0;
};

export const markAllCombatTrainingPlansRead = async () => {
  const { data } = await api.post("/dashboard/combat-training-plans/read-all/");
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

export const getCombatTrainingJournalSubjects = async (unitNumber) => {
  const { data } = await api.get("/dashboard/combat-training-journal-subjects/", {
    params: unitNumber ? { unitNumber } : undefined,
  });
  return data;
};

export const createCombatTrainingJournalSubject = async (payload) => {
  const { data } = await api.post("/dashboard/combat-training-journal-subjects/", payload);
  return data;
};

export const updateCombatTrainingJournalSubject = async (id, payload) => {
  const { data } = await api.patch(
    `/dashboard/combat-training-journal-subjects/${id}/`,
    payload
  );
  return data;
};

export const deleteCombatTrainingJournalSubject = async (id) => {
  await api.delete(`/dashboard/combat-training-journal-subjects/${id}/`);
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

export const getModuleTemplates = async (moduleKey) => {
  const { data } = await api.get("/dashboard/module-templates/", {
    params: { moduleKey },
  });
  return data;
};

export const getRegionalUnitRatings = async () => {
  const { data } = await api.get("/dashboard/admin/regional-unit-ratings/");
  return data.results || [];
};

export const getOutpostRatings = async () => {
  const { data } = await api.get("/dashboard/regional/outpost-ratings/");
  return data.results || [];
};

export const createOutpostBroadcastMessage = async (payload) => {
  const { data } = await api.post("/auth/chat/broadcast/outposts/", payload);
  return data;
};

export const deleteAdminChatConversation = async (partnerId) => {
  await api.delete(`/auth/chat/conversations/${partnerId}/`);
};

export const createModuleTemplate = async (payload) => {
  const { data } = await api.post("/dashboard/module-templates/", payload);
  return data;
};

export const deleteModuleTemplate = async (id) => {
  await api.delete(`/dashboard/module-templates/${id}/`);
};

export const getModuleBanners = async (moduleKey) => {
  const { data } = await api.get("/dashboard/module-banners/", {
    params: { moduleKey },
  });
  return data;
};

export const createModuleBanner = async (payload) => {
  const { data } = await api.post("/dashboard/module-banners/", payload);
  return data;
};

export const updateModuleBanner = async (id, payload) => {
  const { data } = await api.patch(`/dashboard/module-banners/${id}/`, payload);
  return data;
};

export const deleteModuleBanner = async (id) => {
  await api.delete(`/dashboard/module-banners/${id}/`);
};
