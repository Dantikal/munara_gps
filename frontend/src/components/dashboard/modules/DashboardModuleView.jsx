import React from "react";

import Analytics from "./Analytics.jsx";
import CombatTrainingJournal from "./CombatTrainingJournal.jsx";
import CombatTrainingNews from "./CombatTrainingNews.jsx";
import CombatTrainingPlan from "./CombatTrainingPlan.jsx";
import CombatTrainingResults from "./CombatTrainingResults.jsx";
import ContactAdmin from "./ContactAdmin.jsx";
import Journal from "./Journal.jsx";
import Library from "./Library.jsx";
import Profile from "./Profile.jsx";
import SavedTables from "./SavedTables.jsx";
import Schedule from "./Schedule.jsx";
import SMR from "./SMR.jsx";

export default function DashboardModuleView({ activeModule, modules, onRefresh, user }) {
  if (activeModule === "profile") {
    return <Profile user={user} />;
  }

  if (activeModule === "library") {
    return <Library data={modules?.library} onRefresh={onRefresh} />;
  }

  if (activeModule === "combatTrainingJournal") {
    return (
      <CombatTrainingJournal
        data={modules?.combatTrainingJournal}
        methodicalSubjects={modules?.smr?.subjects || []}
        user={user}
      />
    );
  }

  if (activeModule === "combatTrainingResults") {
    return <CombatTrainingResults data={modules?.combatTrainingResults} user={user} />;
  }

  if (activeModule === "combatTrainingPlan") {
    return <CombatTrainingPlan user={user} />;
  }

  if (activeModule === "combatTrainingReport") {
    return <CombatTrainingNews user={user} />;
  }

  if (activeModule === "savedTables") {
    return <SavedTables />;
  }

  if (activeModule === "smr") {
    return <SMR data={modules?.smr} user={user} />;
  }

  if (activeModule === "schedule") {
    return <Schedule data={modules?.schedule} />;
  }

  if (activeModule === "journal") {
    return <Journal data={modules?.journal} />;
  }

  if (activeModule === "analytics" || activeModule === "combatTrainingAnalytics") {
    return <Analytics data={modules?.analytics} user={user} />;
  }

  if (activeModule === "contactAdmin") {
    return <ContactAdmin user={user} onRefresh={onRefresh} />;
  }

  return null;
}
