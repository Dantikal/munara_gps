import React from "react";
import { useEffect, useState } from "react";

const roleLabels = {
  admin: "Администратор",
  regional: "Областное управление",
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
  { id: "combatTrainingAnalytics", label: "Күжүрмөн даярдоонун талдоолору (1 айдын, окуу мезгилинин, окуу жылынын)" },
  { id: "smr", label: "Күжүрмөн даярдоо боюнча усулдук колдонмолор" },
  { id: "combatTrainingPlan", label: "Күжүрмөн даярдоонун 1 айга иш -чараларынын пландоосу" },
  { id: "combatTrainingReport", label: "Аткарылган иш-чаралардын баяндамасы" },
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
    ],
  },
];

const fieldItems = [
  { id: "library", label: "Сабактардын тематикасынын эсеби жана жүгүртмөсү" },
  { id: "combatTrainingJournal", label: "Күжүрмөн даярдоону каттоо журналы" },
  { id: "combatTrainingResults", label: "Күжүрмөн даярдоонун жыйынтыктары ( көзөмөл сабактары, көзөмөл текшерүү сабактары)" },
  { id: "combatTrainingAnalytics", label: "Күжүрмөн даярдоонун талдоолору (1 айдын, окуу мезгилинин, окуу жылынын)" },
  { id: "smr", label: "Күжүрмөн даярдоо боюнча усулдук колдонмолор" },
  { id: "combatTrainingPlan", label: "Күжүрмөн даярдоонун 1 айга иш -чараларынын пландоосу" },
  { id: "combatTrainingReport", label: "Аткарылган иш-чаралардын баяндамасы" },
  { id: "contactAdmin", label: "Администратор менен байланыш" },
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
  const isAdminChildActive = activeItem === "users" || activeItem === "requests";
  const [adminOpen, setAdminOpen] = useState(isAdminChildActive);
  const sections =
    role === "admin"
      ? getAdminSections(pendingCount)
      : [{ id: "field", items: fieldItems }];
  const hiddenItemIds = new Set(
    modules && !modules.combatTrainingJournal ? ["combatTrainingJournal"] : []
  );

  useEffect(() => {
    if (isAdminChildActive) {
      setAdminOpen(true);
    }
  }, [isAdminChildActive]);

  const handleClick = (itemId) => {
    if (itemId === "requests") {
      onOpenRequests?.();
      return;
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
                  {item.id === "contactAdmin" && modules?.chatUnreadCount > 0 ? (
                    <span className="dashboard-sidebar__item-badge">{modules.chatUnreadCount}</span>
                  ) : null}
                </button>
              ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
