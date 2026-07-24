import React from "react";
import { useEffect, useState } from "react";

import {
  getChatUnreadCount,
  getCombatTrainingNewsUnreadCount,
  getCombatTrainingPlanUnreadCount,
  markAllCombatTrainingPlansRead,
} from "../../api/dashboard.js";

const BellIcon = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="16"
    viewBox="0 0 24 24"
    width="16"
  >
    <path
      d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

const roleLabels = {
  admin: "Администратор",
  regional: "Аскер бөлүгү",
  outpost: "Застава",
};

const getInitials = (user) => {
  const source = user?.full_name || user?.email || "Пользователь";
  return source
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

const adminItems = [
  { id: "library", label: "Сабактардын тематикасынын эсеби жана жүгүртмөсү" },
  { id: "combatTrainingJournal", label: "Күжүрмөн даярдоону каттоо журналы" },
  { id: "combatTrainingResults", label: "Күжүрмөн даярдоонун жыйынтыктары ( көзөмөл сабактары, көзөмөл текшерүү сабактары)" },
  { id: "meetings", label: "Жыйындар" },
  { id: "youngSoldierTrainingCourse", label: "Жаш жоокерлерди даярдоо курсу" },
  { id: "combatTrainingAnalytics", label: "Күжүрмөн даярдоонун талдоолору (1 айдын, окуу мезгилинин, окуу жылынын)" },
  { id: "smr", label: "Күжүрмөн даярдоо боюнча усулдук колдонмолор" },
  { id: "combatTrainingPlan", label: "Күжүрмөн даярдоонун пландалган иш-чаралары" },
  { id: "combatTrainingReport", label: "Күжүрмөн даярдоонун маалыматтары" },
  { id: "contactAdmin", label: "Администратор менен байланыш" },
];

const getAdminSections = (pendingCount) => [
  { id: "work", items: adminItems },
  {
    id: "admin",
    title: "Админ",
    items: [
      { id: "users", label: "Пользователи" },
      { id: "requests", label: `Заявки (${pendingCount})` },
      { id: "submissionEditRequests", label: "Запросы на разрешение" },
      { id: "drafts", label: "Черновик" },
    ],
  },
];

const fieldItems = [
  { id: "library", label: "Сабактардын тематикасынын эсеби жана жүгүртмөсү" },
  { id: "combatTrainingJournal", label: "Күжүрмөн даярдоону каттоо журналы" },
  { id: "combatTrainingResults", label: "Күжүрмөн даярдоонун жыйынтыктары ( көзөмөл сабактары, көзөмөл текшерүү сабактары)" },
  { id: "combatTrainingAnalytics", label: "Күжүрмөн даярдоонун талдоолору (1 айдын, окуу мезгилинин, окуу жылынын)" },
  { id: "smr", label: "Күжүрмөн даярдоо боюнча усулдук колдонмолор" },
  { id: "combatTrainingPlan", label: "Күжүрмөн даярдоонун пландалган иш-чаралары" },
  { id: "combatTrainingReport", label: "Күжүрмөн даярдоонун маалыматтары" },
  { id: "contactAdmin", label: "Администратор менен байланыш" },
];

const regionalItems = [
  ...fieldItems.slice(0, 3),
  { id: "meetings", label: "Жыйындар" },
  { id: "youngSoldierTrainingCourse", label: "Жаш жоокерлерди даярдоо курсу" },
  ...fieldItems.slice(3),
];

export default function Sidebar({
  role,
  activeItem,
  modules,
  pendingCount = 0,
  user,
  onNavigate,
  onOpenRequests,
}) {
  const avatarSrc = user?.avatar || user?.photo_face;
  const isAdminChildActive =
    activeItem === "users" || activeItem === "requests" || activeItem === "submissionEditRequests" || activeItem === "drafts";
  const [adminOpen, setAdminOpen] = useState(isAdminChildActive);
  const [newsUnreadCount, setNewsUnreadCount] = useState(0);
  const [planUnreadCount, setPlanUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(modules?.chatUnreadCount || 0);
  const sections =
    role === "admin"
      ? getAdminSections(pendingCount)
      : [{ id: "field", items: role === "regional" ? regionalItems : fieldItems }];
  const hiddenItemIds = new Set(
    modules && !modules.combatTrainingJournal ? ["combatTrainingJournal"] : []
  );

  useEffect(() => {
    if (isAdminChildActive) {
      setAdminOpen(true);
    }
  }, [isAdminChildActive]);

  useEffect(() => {
    if (role === "admin") {
      setNewsUnreadCount(0);
      return undefined;
    }

    let isMounted = true;
    const refreshUnreadCount = async () => {
      try {
        const count = await getCombatTrainingNewsUnreadCount();
        if (isMounted) setNewsUnreadCount(count);
      } catch {
        // The sidebar remains usable while the notification service is unavailable.
      }
    };

    refreshUnreadCount();
    const intervalId = window.setInterval(refreshUnreadCount, 60000);
    window.addEventListener("focus", refreshUnreadCount);
    window.addEventListener("combat-training-news-read", refreshUnreadCount);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshUnreadCount);
      window.removeEventListener("combat-training-news-read", refreshUnreadCount);
    };
  }, [role]);

  useEffect(() => {
    if (role === "admin") {
      setPlanUnreadCount(0);
      return undefined;
    }

    let isMounted = true;
    const refreshPlanUnreadCount = async () => {
      try {
        const count = await getCombatTrainingPlanUnreadCount();
        if (isMounted) setPlanUnreadCount(count);
      } catch {
        // Navigation remains available if notification loading fails.
      }
    };

    refreshPlanUnreadCount();
    const intervalId = window.setInterval(refreshPlanUnreadCount, 60000);
    window.addEventListener("focus", refreshPlanUnreadCount);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshPlanUnreadCount);
    };
  }, [role]);

  useEffect(() => {
    let isMounted = true;
    const refreshChatUnreadCount = async () => {
      try {
        const count = await getChatUnreadCount();
        if (isMounted) setChatUnreadCount(count);
      } catch {
        // The sidebar remains usable while chat notifications are unavailable.
      }
    };

    refreshChatUnreadCount();
    const intervalId = window.setInterval(refreshChatUnreadCount, 15000);
    window.addEventListener("focus", refreshChatUnreadCount);
    window.addEventListener("chat-messages-read", refreshChatUnreadCount);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshChatUnreadCount);
      window.removeEventListener("chat-messages-read", refreshChatUnreadCount);
    };
  }, [role]);

  const handleClick = (itemId) => {
    if (itemId === "requests") {
      onOpenRequests?.();
      return;
    }

    if (itemId === "combatTrainingPlan" && planUnreadCount > 0) {
      setPlanUnreadCount(0);
      markAllCombatTrainingPlansRead().catch(() => {
        getCombatTrainingPlanUnreadCount()
          .then(setPlanUnreadCount)
          .catch(() => {});
      });
    }

    onNavigate(itemId);
  };

  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-user-card">
        <div className="profile-avatar">
          {avatarSrc ? (
            <img alt={user.full_name || user.email} src={avatarSrc} />
          ) : (
            <span>{getInitials(user)}</span>
          )}
        </div>
        <div>
          <strong>{user?.full_name || user?.email || "Пользователь"}</strong>
          <span>{roleLabels[user?.role] || roleLabels[role]}</span>
        </div>
        <button
          className={activeItem === "profile" ? "is-active profile-open-button" : "profile-open-button"}
          onClick={() => onNavigate("profile")}
          type="button"
        >
          Мой профиль
        </button>
      </div>
      <nav className="dashboard-sidebar__nav">
        {sections.map((section) => (
          <div className="dashboard-sidebar__group" key={section.id}>
            {section.title && (
              <button
                className={adminOpen ? "dashboard-sidebar__group-toggle is-open" : "dashboard-sidebar__group-toggle"}
                onClick={() => setAdminOpen((current) => !current)}
                type="button"
              >
                {section.title}
              </button>
            )}
            {(!section.title || adminOpen) &&
              section.items.filter((item) => !hiddenItemIds.has(item.id)).map((item) => (
                <button
                  className={[
                    activeItem === item.id ? "is-active" : "",
                    section.title ? "dashboard-sidebar__subitem" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={item.id}
                  onClick={() => handleClick(item.id)}
                >
                  <span className="dashboard-sidebar__item-label">{item.label}</span>
                  {item.id === "contactAdmin" && chatUnreadCount > 0 ? (
                    <span className="dashboard-sidebar__item-badge">{chatUnreadCount}</span>
                  ) : null}
                  {item.id === "combatTrainingReport" && newsUnreadCount > 0 ? (
                    <span
                      aria-label={`Жаңы маалыматтар: ${newsUnreadCount}`}
                      className="dashboard-sidebar__item-badge dashboard-sidebar__item-badge--bell"
                      title="Жаңы маалымат"
                    >
                      <BellIcon />
                    </span>
                  ) : null}
                  {item.id === "combatTrainingPlan" && planUnreadCount > 0 ? (
                    <span
                      aria-label="Пландалган иш-чаралар жаңыртылды"
                      className="dashboard-sidebar__item-badge dashboard-sidebar__item-badge--bell"
                      title="Жаңы жаңыртуу"
                    >
                      <BellIcon />
                    </span>
                  ) : null}
                </button>
              ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
