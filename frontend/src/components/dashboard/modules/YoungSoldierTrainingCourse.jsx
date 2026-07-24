import React, { useState } from "react";

import Meetings from "./Meetings.jsx";
import SMR from "./SMR.jsx";

const COURSE_TITLE = "Жаш жоокерлерди даярдоо курсу";
const PROGRAM_TITLE = "Жаш жоокерлерди даярдоо программасы";
const THEMATIC_TITLE = "Сабактардын тематикалык эсеби";
const SCHEDULE_TITLE = "Сабактардын жүгүртмөсү";
const JOURNAL_TITLE = "Күжүрмөн даярдоонун каттоо журналы";
const OBSERVATION_TITLE = "Көзөмөл сабактары";
const COURSE_ANALYSIS_TITLE =
  "Жаш жоокерлердин даярдоо курсунун талдоосу";
const GENERAL_ANALYSIS_TITLE =
  "Жаш жоокерлердин даярдоо курсунун жалпы талдоосу";
const PROGRAM_DATA = { subjects: [], title: PROGRAM_TITLE };
const COURSE_STORAGE_NAMESPACE = "young-soldier-training-course";

export default function YoungSoldierTrainingCourse({ modules, user }) {
  const [activeSection, setActiveSection] = useState(null);

  if (user?.role === "admin") {
    if (activeSection === "program") {
      return (
        <SMR
          allowTextMaterials
          collection="young_soldier_program"
          data={PROGRAM_DATA}
          onBack={() => setActiveSection(null)}
          user={user}
        />
      );
    }

    if (activeSection === "general-analysis") {
      return (
        <Meetings
          analysisSourceSectionId="young-soldier-analysis"
          directSectionId="meeting-analysis"
          disableAdminBrowser
          moduleTitle={GENERAL_ANALYSIS_TITLE}
          modules={modules}
          onBack={() => setActiveSection(null)}
          sectionIds={["meeting-analysis"]}
          sectionTitleOverrides={{
            "meeting-analysis": GENERAL_ANALYSIS_TITLE,
          }}
          storageNamespace="young-soldier-general-analysis"
          user={user}
        />
      );
    }

    return (
      <Meetings
        adminExtraCards={[
          {
            onOpen: () => setActiveSection("program"),
            title: PROGRAM_TITLE,
          },
          {
            onOpen: () => setActiveSection("general-analysis"),
            title: GENERAL_ANALYSIS_TITLE,
          },
        ]}
        moduleTitle={COURSE_TITLE}
        modules={modules}
        sectionIds={[
          "thematic-account",
          "lesson-schedule",
          "combat-training-journal",
          "observation",
          "meeting-analysis",
        ]}
        sectionTitleOverrides={{
          "meeting-analysis": COURSE_ANALYSIS_TITLE,
        }}
        storageNamespace={COURSE_STORAGE_NAMESPACE}
        user={user}
      />
    );
  }

  if (activeSection === "program") {
    return (
      <SMR
        allowTextMaterials
        collection="young_soldier_program"
        data={PROGRAM_DATA}
        onBack={() => setActiveSection(null)}
        user={user}
      />
    );
  }

  if (activeSection === "thematic-account") {
    return (
      <Meetings
        directSectionId="thematic-account"
        moduleTitle={THEMATIC_TITLE}
        modules={modules}
        onBack={() => setActiveSection(null)}
        sectionIds={["thematic-account"]}
        storageNamespace={COURSE_STORAGE_NAMESPACE}
        user={user}
      />
    );
  }

  if (activeSection === "lesson-schedule") {
    return (
      <Meetings
        directSectionId="lesson-schedule"
        moduleTitle={SCHEDULE_TITLE}
        modules={modules}
        onBack={() => setActiveSection(null)}
        sectionIds={["lesson-schedule"]}
        storageNamespace={COURSE_STORAGE_NAMESPACE}
        user={user}
      />
    );
  }

  if (activeSection === "combat-training-journal") {
    return (
      <Meetings
        directSectionId="combat-training-journal"
        moduleTitle={JOURNAL_TITLE}
        modules={modules}
        onBack={() => setActiveSection(null)}
        sectionIds={["combat-training-journal"]}
        storageNamespace={COURSE_STORAGE_NAMESPACE}
        user={user}
      />
    );
  }

  if (activeSection === "observation") {
    return (
      <Meetings
        directSectionId="observation"
        moduleTitle={OBSERVATION_TITLE}
        modules={modules}
        onBack={() => setActiveSection(null)}
        sectionIds={["observation"]}
        storageNamespace={COURSE_STORAGE_NAMESPACE}
        user={user}
      />
    );
  }

  if (activeSection === "meeting-analysis") {
    return (
      <Meetings
        directSectionId="meeting-analysis"
        moduleTitle={COURSE_ANALYSIS_TITLE}
        modules={modules}
        onBack={() => setActiveSection(null)}
        sectionIds={["meeting-analysis"]}
        sectionTitleOverrides={{
          "meeting-analysis": COURSE_ANALYSIS_TITLE,
        }}
        storageNamespace={COURSE_STORAGE_NAMESPACE}
        user={user}
      />
    );
  }

  return (
    <section className="module-panel">
      <header className="module-header">
        <h1>{COURSE_TITLE}</h1>
      </header>
      <div className="module-document-list">
        <button
          className="module-document-card"
          onClick={() => setActiveSection("program")}
          type="button"
        >
          <span aria-hidden="true" className="module-document-icon" />
          <strong>{PROGRAM_TITLE}</strong>
        </button>
        <button
          className="module-document-card"
          onClick={() => setActiveSection("thematic-account")}
          type="button"
        >
          <span aria-hidden="true" className="module-document-icon" />
          <strong>{THEMATIC_TITLE}</strong>
        </button>
        <button
          className="module-document-card"
          onClick={() => setActiveSection("lesson-schedule")}
          type="button"
        >
          <span aria-hidden="true" className="module-document-icon" />
          <strong>{SCHEDULE_TITLE}</strong>
        </button>
        <button
          className="module-document-card"
          onClick={() => setActiveSection("combat-training-journal")}
          type="button"
        >
          <span aria-hidden="true" className="module-document-icon" />
          <strong>{JOURNAL_TITLE}</strong>
        </button>
        <button
          className="module-document-card"
          onClick={() => setActiveSection("observation")}
          type="button"
        >
          <span aria-hidden="true" className="module-document-icon" />
          <strong>{OBSERVATION_TITLE}</strong>
        </button>
        <button
          className="module-document-card"
          onClick={() => setActiveSection("meeting-analysis")}
          type="button"
        >
          <span aria-hidden="true" className="module-document-icon" />
          <strong>{COURSE_ANALYSIS_TITLE}</strong>
        </button>
      </div>
    </section>
  );
}
