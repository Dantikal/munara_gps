import React, { useEffect, useRef, useState } from "react";

const kyrgyzstanCoatOfArmsUrl =
  "https://upload.wikimedia.org/wikipedia/commons/f/f1/Emblem_of_Kyrgyzstan.svg";
const MONTHLY_ANALYSIS_REGISTRY_COUNTER_KEY = "monthly-analysis-registry-counter";
const MONTHLY_ANALYSIS_DRAFT_STORAGE_KEY = "monthly-analysis-draft";
const MONTHLY_ANALYSIS_DOCUMENTS_STORAGE_KEY = "monthly-analysis-documents";
const MONTHLY_ANALYSIS_ACTIVE_DOCUMENT_ID_KEY = "monthly-analysis-active-document-id";
const ANALYSIS_DOCUMENTS_BY_SECTION_KEY = "analysis-documents-by-section";
const ANALYSIS_ACTIVE_IDS_BY_SECTION_KEY = "analysis-active-document-ids-by-section";

const getMonthlyAnalysisDraftStorageKey = (sectionId) =>
  `${MONTHLY_ANALYSIS_DRAFT_STORAGE_KEY}:${sectionId || "monthly-analysis"}`;

const analyticsSections = [
  {
    id: "monthly-analysis",
    title: "Айдын талдоосу",
  },
  {
    id: "period-analysis",
    title: "Окуу мезгилеринин жыйынтыгы жана талдоосу",
  },
  {
    id: "year-analysis",
    title: "Окуу жылынын жыйынтыгы жана талдоосу",
  },
];

export default function Analytics() {
  const commanderSignatureCanvasRef = useRef(null);
  const isDrawingCommanderSignatureRef = useRef(false);
  const hasHydratedMonthlyAnalysisRef = useRef(false);
  const monthlyAnalysisPhotoInputRef = useRef(null);
  const monthlyAnalysisVideoInputRef = useRef(null);
  const monthlyAnalysisDocumentInputRef = useRef(null);
  const monthlyAnalysisDocumentsRef = useRef([]);
  const activeMonthlyAnalysisDocumentIdRef = useRef(null);
  const analysisDocumentsBySectionRef = useRef({});
  const analysisActiveIdsBySectionRef = useRef({});
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [monthlyAnalysisDocuments, setMonthlyAnalysisDocuments] = useState([]);
  const [activeMonthlyAnalysisDocumentId, setActiveMonthlyAnalysisDocumentId] = useState(null);
  const [analysisDocumentsBySection, setAnalysisDocumentsBySection] = useState({
    "monthly-analysis": [],
    "period-analysis": [],
    "year-analysis": [],
  });
  const [analysisActiveIdsBySection, setAnalysisActiveIdsBySection] = useState({
    "monthly-analysis": null,
    "period-analysis": null,
    "year-analysis": null,
  });
  const [monthlyAnalysisCreated, setMonthlyAnalysisCreated] = useState(false);
  const [monthlyAnalysisTitle, setMonthlyAnalysisTitle] = useState("");
  const [monthlyAnalysisBody, setMonthlyAnalysisBody] = useState("");
  const [monthlyAnalysisExtraPages, setMonthlyAnalysisExtraPages] = useState([]);
  const [monthlyAnalysisAttachments, setMonthlyAnalysisAttachments] = useState([]);
  const monthlyAnalysisAttachmentUrlsRef = useRef([]);
  const monthlyAnalysisBodyTextareaRef = useRef(null);
  const monthlyAnalysisExtraTextareaRefs = useRef([]);
  const [monthlyAnalysisCommanderTitle, setMonthlyAnalysisCommanderTitle] = useState("");
  const [monthlyAnalysisCommanderRank, setMonthlyAnalysisCommanderRank] = useState("");
  const [monthlyAnalysisCommanderName, setMonthlyAnalysisCommanderName] = useState("");
  const [monthlyAnalysisCommanderSignature, setMonthlyAnalysisCommanderSignature] = useState("");
  const [isCommanderSignatureDialogOpen, setIsCommanderSignatureDialogOpen] = useState(false);
  const [isMonthlyDocumentOpen, setIsMonthlyDocumentOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isMonthlyAnalysisPickerOpen, setIsMonthlyAnalysisPickerOpen] = useState(false);
  const [selectedMonthlyAnalysisSourceDocumentIds, setSelectedMonthlyAnalysisSourceDocumentIds] = useState([]);
  const [draftMonthlyAnalysisTitle, setDraftMonthlyAnalysisTitle] = useState("");
  const [monthlyAnalysisRegistryNumber, setMonthlyAnalysisRegistryNumber] = useState(null);
  const [monthlyAnalysisAddressee, setMonthlyAnalysisAddressee] = useState(
    "КР Мамлекетик чек ара кызматынын күжүрмөн даярдоо башкармалыгынын башчысына"
  );
  const selectedSection = analyticsSections.find((section) => section.id === selectedSectionId);
  const currentAnalysisSectionDocuments = selectedSectionId
    ? analysisDocumentsBySection[selectedSectionId] || []
    : [];
  const analysisSourceSectionId =
    selectedSectionId === "year-analysis"
      ? "period-analysis"
      : selectedSectionId === "period-analysis"
        ? "monthly-analysis"
        : "monthly-analysis";
  const monthlyAnalysisPlaceholder =
    "2021 аскер болугунун кара-бак чек ара заставасынын декабрь айына талдоосу";
  const periodAnalysisPlaceholder =
    "2030 аскер бөлүгүнүн Көк-Таш чек ара заставасынын 1-окуу мезгилинин жыйынтыгы жана талдоосу";
  const yearAnalysisPlaceholder = "Окуу жылынын жыйынтыгы жана талдоосу";
  const monthlyAnalysisSourceDocuments = analysisDocumentsBySection[analysisSourceSectionId] || [];
  const monthlyAnalysisSourcePlaceholder =
    analysisSourceSectionId === "period-analysis"
      ? periodAnalysisPlaceholder
      : monthlyAnalysisPlaceholder;
  const monthlyAnalysisPickerTitle =
    selectedSectionId === "year-analysis"
      ? "Окуу мезгилеринин жыйынтыгы жана талдоосунан тандоо"
      : "Айдын талдоосунан тандоо";
  const monthlyAnalysisPickerEmptyText =
    selectedSectionId === "year-analysis"
      ? "Окуу мезгилеринин жыйынтыгында документ жок"
      : "Айдын талдоосунда документ жок";
  const currentAnalysisPlaceholder =
    selectedSectionId === "period-analysis"
      ? periodAnalysisPlaceholder
      : selectedSectionId === "year-analysis"
        ? yearAnalysisPlaceholder
        : monthlyAnalysisPlaceholder;
  const currentDate = new Date();
  const currentDay = String(currentDate.getDate()).padStart(2, "0");
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, "0");
  const currentYear = currentDate.getFullYear();
  const formattedDocumentDate = `"${currentDay}"${currentMonth}"${currentYear}-ж`;
  const formattedRegistryNumber = `№ ${currentMonth}/${monthlyAnalysisRegistryNumber || "__"}`;
  const isMonthlyAnalysisSent = Boolean(monthlyAnalysisRegistryNumber);
  const activeMonthlyAnalysisDocument = monthlyAnalysisDocuments.find(
    (document) => document.id === activeMonthlyAnalysisDocumentId
  );

  const createMonthlyAnalysisDocumentId = () =>
    `monthly-analysis-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const createMonthlyAnalysisAttachmentId = () =>
    `monthly-analysis-attachment-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const sanitizeMonthlyAnalysisAttachments = (attachments) =>
    (Array.isArray(attachments) ? attachments : []).map(({ objectUrl, ...attachment }) => attachment);

  const syncMonthlyAnalysisTextareaHeight = (element) => {
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${element.scrollHeight}px`;
  };

  const applyMonthlyAnalysisSourceDocumentToCurrentDocument = (sourceDocument) => {
    if (!sourceDocument) return;

    const nextAttachments = Array.isArray(sourceDocument.attachments) ? sourceDocument.attachments : [];
    const nextExtraPages = Array.isArray(sourceDocument.extraPages) ? sourceDocument.extraPages : [];

    setMonthlyAnalysisAddressee(sourceDocument.addressee || "");
    setMonthlyAnalysisTitle(sourceDocument.title || "");
    setMonthlyAnalysisBody(sourceDocument.body || "");
    setMonthlyAnalysisAttachments(nextAttachments);
    setMonthlyAnalysisExtraPages(nextExtraPages);
    setMonthlyAnalysisCommanderTitle(sourceDocument.commanderTitle || "");
    setMonthlyAnalysisCommanderRank(sourceDocument.commanderRank || "");
    setMonthlyAnalysisCommanderName(sourceDocument.commanderName || "");
    setMonthlyAnalysisCommanderSignature(sourceDocument.commanderSignature || "");

    updateActiveMonthlyAnalysisDocument({
      addressee: sourceDocument.addressee || "",
      attachments: sanitizeMonthlyAnalysisAttachments(nextAttachments),
      body: sourceDocument.body || "",
      commanderName: sourceDocument.commanderName || "",
      commanderRank: sourceDocument.commanderRank || "",
      commanderSignature: sourceDocument.commanderSignature || "",
      commanderTitle: sourceDocument.commanderTitle || "",
      extraPages: nextExtraPages,
      title: sourceDocument.title || "",
    });

    persistMonthlyAnalysisDraft({
      addressee: sourceDocument.addressee || "",
      attachments: sanitizeMonthlyAnalysisAttachments(nextAttachments),
      body: sourceDocument.body || "",
      commanderName: sourceDocument.commanderName || "",
      commanderRank: sourceDocument.commanderRank || "",
      commanderSignature: sourceDocument.commanderSignature || "",
      commanderTitle: sourceDocument.commanderTitle || "",
      draftTitle: sourceDocument.title || "",
      extraPages: nextExtraPages,
      title: sourceDocument.title || "",
    });
  };

  const handleToggleMonthlyAnalysisSourceDocument = (documentId) => {
    setSelectedMonthlyAnalysisSourceDocumentIds((currentIds) =>
      currentIds.includes(documentId)
        ? currentIds.filter((currentId) => currentId !== documentId)
        : [...currentIds, documentId]
    );
  };

  const composeMonthlyAnalysisDocumentsText = (documents) =>
    documents
      .map((document, index) => {
        const parts = [];
        if (document.title) parts.push(document.title);
        if (document.body) parts.push(document.body);
        return parts.filter(Boolean).join("\n\n").trim();
      })
      .filter(Boolean)
      .join("\n\n");

  const applyMonthlyAnalysisDocumentToState = (document) => {
    if (!document) return;

    setMonthlyAnalysisCreated(Boolean(document.created));
    setMonthlyAnalysisTitle(document.title || "");
    setMonthlyAnalysisBody(document.body || "");
    setMonthlyAnalysisExtraPages(Array.isArray(document.extraPages) ? document.extraPages : []);
    setMonthlyAnalysisAttachments(Array.isArray(document.attachments) ? document.attachments : []);
    monthlyAnalysisAttachmentUrlsRef.current = [];
    setMonthlyAnalysisCommanderTitle(document.commanderTitle || "");
    setMonthlyAnalysisCommanderRank(document.commanderRank || "");
    setMonthlyAnalysisCommanderName(document.commanderName || "");
    setMonthlyAnalysisCommanderSignature(document.commanderSignature || "");
    setMonthlyAnalysisAddressee(document.addressee || "");
    setMonthlyAnalysisRegistryNumber(
      typeof document.registryNumber === "number" && Number.isFinite(document.registryNumber)
        ? document.registryNumber
        : null
    );
  };

  const updateActiveMonthlyAnalysisDocument = (partialDocument) => {
    const activeDocumentId = activeMonthlyAnalysisDocumentIdRef.current;
    if (!activeDocumentId) return;

    setMonthlyAnalysisDocuments((currentDocuments) => {
      const nextDocuments = currentDocuments.map((document) =>
        document.id === activeDocumentId
          ? { ...document, ...partialDocument, updatedAt: Date.now() }
          : document
      );

      monthlyAnalysisDocumentsRef.current = nextDocuments;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          MONTHLY_ANALYSIS_DOCUMENTS_STORAGE_KEY,
          JSON.stringify(nextDocuments)
        );
      }

      return nextDocuments;
    });
  };

  const persistMonthlyAnalysisDraft = (nextPartialState = {}) => {
    if (typeof window === "undefined") return;

    const draftPayload = {
      addressee: monthlyAnalysisAddressee,
      body: monthlyAnalysisBody,
      commanderName: monthlyAnalysisCommanderName,
      commanderRank: monthlyAnalysisCommanderRank,
      commanderSignature: monthlyAnalysisCommanderSignature,
      commanderTitle: monthlyAnalysisCommanderTitle,
      created: monthlyAnalysisCreated,
      draftTitle: draftMonthlyAnalysisTitle,
      attachments: monthlyAnalysisAttachments,
      extraPages: monthlyAnalysisExtraPages,
      isCreateDialogOpen,
      isMonthlyDocumentOpen,
      registryNumber: monthlyAnalysisRegistryNumber,
      selectedSectionId,
      title: monthlyAnalysisTitle,
      ...nextPartialState,
    };

    window.localStorage.setItem(
      getMonthlyAnalysisDraftStorageKey(selectedSectionId),
      JSON.stringify(draftPayload)
    );
  };

  useEffect(() => {
    try {
      const storedDocumentsBySectionValue = window.localStorage.getItem(ANALYSIS_DOCUMENTS_BY_SECTION_KEY);
      if (storedDocumentsBySectionValue) {
        const parsedDocumentsBySectionValue = JSON.parse(storedDocumentsBySectionValue);
        if (parsedDocumentsBySectionValue && typeof parsedDocumentsBySectionValue === "object") {
          analysisDocumentsBySectionRef.current = parsedDocumentsBySectionValue;
          setAnalysisDocumentsBySection(parsedDocumentsBySectionValue);
        }
      }

      const storedActiveIdsBySectionValue = window.localStorage.getItem(ANALYSIS_ACTIVE_IDS_BY_SECTION_KEY);
      if (storedActiveIdsBySectionValue) {
        const parsedActiveIdsBySectionValue = JSON.parse(storedActiveIdsBySectionValue);
        if (parsedActiveIdsBySectionValue && typeof parsedActiveIdsBySectionValue === "object") {
          analysisActiveIdsBySectionRef.current = parsedActiveIdsBySectionValue;
          setAnalysisActiveIdsBySection(parsedActiveIdsBySectionValue);
        }
      }

      const storedDocumentsValue = window.localStorage.getItem(MONTHLY_ANALYSIS_DOCUMENTS_STORAGE_KEY);
      if (storedDocumentsValue) {
        const parsedDocumentsValue = JSON.parse(storedDocumentsValue);
        if (Array.isArray(parsedDocumentsValue)) {
          setMonthlyAnalysisDocuments(parsedDocumentsValue);
          monthlyAnalysisDocumentsRef.current = parsedDocumentsValue;
          analysisDocumentsBySectionRef.current = {
            ...(analysisDocumentsBySectionRef.current || {}),
            "monthly-analysis": parsedDocumentsValue,
          };
          setAnalysisDocumentsBySection((currentValue) => ({
            ...currentValue,
            "monthly-analysis": parsedDocumentsValue,
          }));
        }
      }

      const storedActiveDocumentId = window.localStorage.getItem(MONTHLY_ANALYSIS_ACTIVE_DOCUMENT_ID_KEY);
      if (storedActiveDocumentId) {
        setActiveMonthlyAnalysisDocumentId(storedActiveDocumentId);
        activeMonthlyAnalysisDocumentIdRef.current = storedActiveDocumentId;
        analysisActiveIdsBySectionRef.current = {
          ...(analysisActiveIdsBySectionRef.current || {}),
          "monthly-analysis": storedActiveDocumentId,
        };
        setAnalysisActiveIdsBySection((currentValue) => ({
          ...currentValue,
          "monthly-analysis": storedActiveDocumentId,
        }));
      }

      const storedValue = window.localStorage.getItem(MONTHLY_ANALYSIS_DRAFT_STORAGE_KEY);
      if (!storedValue) {
        hasHydratedMonthlyAnalysisRef.current = true;
        return;
      }

      const parsedValue = JSON.parse(storedValue);
      if (parsedValue && typeof parsedValue === "object") {
        if (typeof parsedValue.selectedSectionId === "string" || parsedValue.selectedSectionId === null) {
          setSelectedSectionId(parsedValue.selectedSectionId);
        }
        if (typeof parsedValue.created === "boolean") setMonthlyAnalysisCreated(parsedValue.created);
        if (typeof parsedValue.title === "string") setMonthlyAnalysisTitle(parsedValue.title);
        if (typeof parsedValue.draftTitle === "string") setDraftMonthlyAnalysisTitle(parsedValue.draftTitle);
        if (typeof parsedValue.body === "string") setMonthlyAnalysisBody(parsedValue.body);
        if (Array.isArray(parsedValue.extraPages)) setMonthlyAnalysisExtraPages(parsedValue.extraPages);
        if (Array.isArray(parsedValue.attachments)) setMonthlyAnalysisAttachments(parsedValue.attachments);
        if (typeof parsedValue.commanderTitle === "string") {
          setMonthlyAnalysisCommanderTitle(parsedValue.commanderTitle);
        }
        if (typeof parsedValue.commanderRank === "string") {
          setMonthlyAnalysisCommanderRank(parsedValue.commanderRank);
        }
        if (typeof parsedValue.commanderName === "string") {
          setMonthlyAnalysisCommanderName(parsedValue.commanderName);
        }
        if (typeof parsedValue.commanderSignature === "string") {
          setMonthlyAnalysisCommanderSignature(parsedValue.commanderSignature);
        }
        if (typeof parsedValue.addressee === "string") {
          setMonthlyAnalysisAddressee(parsedValue.addressee);
        }
        setIsMonthlyDocumentOpen(false);
        setIsCreateDialogOpen(false);
        if (typeof parsedValue.registryNumber === "number" && Number.isFinite(parsedValue.registryNumber)) {
          setMonthlyAnalysisRegistryNumber(parsedValue.registryNumber);
        }
      }
    } catch {
      // Ignore invalid stored data and continue with defaults.
    } finally {
      hasHydratedMonthlyAnalysisRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!selectedSectionId || !analyticsSections.some((section) => section.id === selectedSectionId)) return;

    const nextDocuments = analysisDocumentsBySection[selectedSectionId] || [];
    const nextActiveDocumentId = analysisActiveIdsBySection[selectedSectionId] || null;

    setMonthlyAnalysisDocuments(nextDocuments);
    monthlyAnalysisDocumentsRef.current = nextDocuments;
    setActiveMonthlyAnalysisDocumentId(nextActiveDocumentId);
    activeMonthlyAnalysisDocumentIdRef.current = nextActiveDocumentId;
  }, [selectedSectionId, analysisDocumentsBySection, analysisActiveIdsBySection]);

  useEffect(() => {
    if (!hasHydratedMonthlyAnalysisRef.current) return;
    if (!selectedSectionId || !analyticsSections.some((section) => section.id === selectedSectionId)) return;

    try {
      const storedValue = window.localStorage.getItem(getMonthlyAnalysisDraftStorageKey(selectedSectionId));
      if (!storedValue) return;

      const parsedValue = JSON.parse(storedValue);
      if (!parsedValue || typeof parsedValue !== "object") return;

      if (typeof parsedValue.created === "boolean") setMonthlyAnalysisCreated(parsedValue.created);
      if (typeof parsedValue.title === "string") setMonthlyAnalysisTitle(parsedValue.title);
      if (typeof parsedValue.draftTitle === "string") setDraftMonthlyAnalysisTitle(parsedValue.draftTitle);
      if (typeof parsedValue.body === "string") setMonthlyAnalysisBody(parsedValue.body);
      if (Array.isArray(parsedValue.extraPages)) setMonthlyAnalysisExtraPages(parsedValue.extraPages);
      if (Array.isArray(parsedValue.attachments)) setMonthlyAnalysisAttachments(parsedValue.attachments);
      if (typeof parsedValue.commanderTitle === "string") {
        setMonthlyAnalysisCommanderTitle(parsedValue.commanderTitle);
      }
      if (typeof parsedValue.commanderRank === "string") {
        setMonthlyAnalysisCommanderRank(parsedValue.commanderRank);
      }
      if (typeof parsedValue.commanderName === "string") {
        setMonthlyAnalysisCommanderName(parsedValue.commanderName);
      }
      if (typeof parsedValue.commanderSignature === "string") {
        setMonthlyAnalysisCommanderSignature(parsedValue.commanderSignature);
      }
      if (typeof parsedValue.addressee === "string") {
        setMonthlyAnalysisAddressee(parsedValue.addressee);
      }
      if (typeof parsedValue.registryNumber === "number" && Number.isFinite(parsedValue.registryNumber)) {
        setMonthlyAnalysisRegistryNumber(parsedValue.registryNumber);
      }
      if (typeof parsedValue.isMonthlyDocumentOpen === "boolean") {
        setIsMonthlyDocumentOpen(parsedValue.isMonthlyDocumentOpen);
      }
      if (typeof parsedValue.isCreateDialogOpen === "boolean") {
        setIsCreateDialogOpen(parsedValue.isCreateDialogOpen);
      }
    } catch {
      // Ignore invalid section draft data.
    }
  }, [selectedSectionId]);

  useEffect(() => {
    if (!hasHydratedMonthlyAnalysisRef.current) return;
    if (activeMonthlyAnalysisDocument) {
      applyMonthlyAnalysisDocumentToState(activeMonthlyAnalysisDocument);
    }
  }, [activeMonthlyAnalysisDocument]);

  useEffect(() => {
    syncMonthlyAnalysisTextareaHeight(monthlyAnalysisBodyTextareaRef.current);
  }, [monthlyAnalysisBody]);

  useEffect(() => {
    monthlyAnalysisExtraTextareaRefs.current.forEach((textarea) => {
      syncMonthlyAnalysisTextareaHeight(textarea);
    });
  }, [monthlyAnalysisExtraPages]);

  useEffect(() => {
    return () => {
      monthlyAnalysisAttachmentUrlsRef.current.forEach((attachmentUrl) => {
        try {
          URL.revokeObjectURL(attachmentUrl);
        } catch {
          // ignore cleanup failures
        }
      });
      monthlyAnalysisAttachmentUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedMonthlyAnalysisRef.current) return;
    persistMonthlyAnalysisDraft();
    window.localStorage.setItem(
      MONTHLY_ANALYSIS_DOCUMENTS_STORAGE_KEY,
      JSON.stringify(monthlyAnalysisDocumentsRef.current)
    );
    if (activeMonthlyAnalysisDocumentIdRef.current) {
      window.localStorage.setItem(
        MONTHLY_ANALYSIS_ACTIVE_DOCUMENT_ID_KEY,
        activeMonthlyAnalysisDocumentIdRef.current
      );
    } else {
      window.localStorage.removeItem(MONTHLY_ANALYSIS_ACTIVE_DOCUMENT_ID_KEY);
    }

    if (selectedSectionId && analyticsSections.some((section) => section.id === selectedSectionId)) {
      const nextDocumentsBySection = {
        ...analysisDocumentsBySectionRef.current,
        [selectedSectionId]: monthlyAnalysisDocumentsRef.current,
      };
      const nextActiveIdsBySection = {
        ...analysisActiveIdsBySectionRef.current,
        [selectedSectionId]: activeMonthlyAnalysisDocumentIdRef.current,
      };

      analysisDocumentsBySectionRef.current = nextDocumentsBySection;
      analysisActiveIdsBySectionRef.current = nextActiveIdsBySection;
      setAnalysisDocumentsBySection(nextDocumentsBySection);
      setAnalysisActiveIdsBySection(nextActiveIdsBySection);

      window.localStorage.setItem(
        ANALYSIS_DOCUMENTS_BY_SECTION_KEY,
        JSON.stringify(nextDocumentsBySection)
      );
      window.localStorage.setItem(
        ANALYSIS_ACTIVE_IDS_BY_SECTION_KEY,
        JSON.stringify(nextActiveIdsBySection)
      );
    }
  }, [
    monthlyAnalysisAddressee,
    monthlyAnalysisBody,
    monthlyAnalysisCommanderName,
    monthlyAnalysisCommanderRank,
    monthlyAnalysisCommanderSignature,
    monthlyAnalysisCommanderTitle,
    monthlyAnalysisCreated,
    draftMonthlyAnalysisTitle,
    monthlyAnalysisAttachments,
    monthlyAnalysisExtraPages,
    isCreateDialogOpen,
    isMonthlyDocumentOpen,
    monthlyAnalysisRegistryNumber,
    monthlyAnalysisTitle,
  ]);

  const handleCreateMonthlyAnalysis = () => {
    setDraftMonthlyAnalysisTitle("");
    setIsMonthlyAnalysisPickerOpen(false);
    persistMonthlyAnalysisDraft({
      draftTitle: "",
      isCreateDialogOpen: true,
    });
    setIsCreateDialogOpen(true);
  };

  const handleSelectAnalyticsSection = (sectionId) => {
    setSelectedSectionId(sectionId);
    setIsMonthlyDocumentOpen(false);
    setIsCreateDialogOpen(false);
    setIsMonthlyAnalysisPickerOpen(false);
    persistMonthlyAnalysisDraft({
      isCreateDialogOpen: false,
      isMonthlyDocumentOpen: false,
      selectedSectionId: sectionId,
    });
  };

  const openMonthlyAnalysisDocument = (documentId) => {
    const document = currentAnalysisSectionDocuments.find((currentDocument) => currentDocument.id === documentId);
    if (!document) return;

    setActiveMonthlyAnalysisDocumentId(documentId);
    activeMonthlyAnalysisDocumentIdRef.current = documentId;
    setSelectedSectionId(selectedSectionId || document.sectionId || "monthly-analysis");
    setIsMonthlyDocumentOpen(true);
    setIsCreateDialogOpen(false);
    setIsMonthlyAnalysisPickerOpen(false);
    applyMonthlyAnalysisDocumentToState(document);
    persistMonthlyAnalysisDraft({
      activeDocumentId: documentId,
      attachments: Array.isArray(document.attachments) ? document.attachments : [],
      addressee: document.addressee || "",
      body: document.body || "",
      commanderName: document.commanderName || "",
      commanderRank: document.commanderRank || "",
      commanderSignature: document.commanderSignature || "",
      commanderTitle: document.commanderTitle || "",
      created: Boolean(document.created),
      extraPages: Array.isArray(document.extraPages) ? document.extraPages : [],
      isMonthlyDocumentOpen: true,
      registryNumber:
        typeof document.registryNumber === "number" && Number.isFinite(document.registryNumber)
          ? document.registryNumber
          : null,
      title: document.title || "",
    });

    if (typeof window !== "undefined") {
      window.localStorage.setItem(MONTHLY_ANALYSIS_ACTIVE_DOCUMENT_ID_KEY, documentId);
    }
  };

  const handleDeleteMonthlyAnalysisDocument = (documentId) => {
    setMonthlyAnalysisDocuments((currentDocuments) => {
      const documentToDelete = currentDocuments.find((currentDocument) => currentDocument.id === documentId);
      if (!documentToDelete || documentToDelete.registryNumber) return currentDocuments;

      const nextDocuments = currentDocuments.filter((currentDocument) => currentDocument.id !== documentId);
      monthlyAnalysisDocumentsRef.current = nextDocuments;

      const sectionKey = selectedSectionId || "monthly-analysis";
      const nextDocumentsBySection = {
        ...analysisDocumentsBySectionRef.current,
        [sectionKey]: nextDocuments,
      };
      const nextActiveIdsBySection = {
        ...analysisActiveIdsBySectionRef.current,
        [sectionKey]:
          activeMonthlyAnalysisDocumentId === documentId && nextDocuments.length > 0
            ? nextDocuments[nextDocuments.length - 1].id
            : activeMonthlyAnalysisDocumentId === documentId
              ? null
              : analysisActiveIdsBySectionRef.current[sectionKey] || null,
      };

      analysisDocumentsBySectionRef.current = nextDocumentsBySection;
      analysisActiveIdsBySectionRef.current = nextActiveIdsBySection;
      setAnalysisDocumentsBySection(nextDocumentsBySection);
      setAnalysisActiveIdsBySection(nextActiveIdsBySection);

      if (activeMonthlyAnalysisDocumentId === documentId) {
        const nextActiveDocument = nextDocuments[nextDocuments.length - 1] || null;
        setActiveMonthlyAnalysisDocumentId(nextActiveDocument ? nextActiveDocument.id : null);
        activeMonthlyAnalysisDocumentIdRef.current = nextActiveDocument ? nextActiveDocument.id : null;

        if (nextActiveDocument) {
          applyMonthlyAnalysisDocumentToState(nextActiveDocument);
        } else {
          setMonthlyAnalysisCreated(false);
          setMonthlyAnalysisTitle("");
          setMonthlyAnalysisBody("");
          setMonthlyAnalysisExtraPages([]);
          setMonthlyAnalysisAttachments([]);
          setMonthlyAnalysisCommanderTitle("");
          setMonthlyAnalysisCommanderRank("");
          setMonthlyAnalysisCommanderName("");
          setMonthlyAnalysisCommanderSignature("");
          setMonthlyAnalysisRegistryNumber(null);
          setIsMonthlyDocumentOpen(false);
        }
      }

      persistMonthlyAnalysisDraft({
        activeDocumentId:
          activeMonthlyAnalysisDocumentId === documentId && nextDocuments.length > 0
            ? nextDocuments[nextDocuments.length - 1].id
            : null,
        isMonthlyDocumentOpen: false,
      });
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          MONTHLY_ANALYSIS_DOCUMENTS_STORAGE_KEY,
          JSON.stringify(nextDocuments)
        );
        window.localStorage.setItem(
          ANALYSIS_DOCUMENTS_BY_SECTION_KEY,
          JSON.stringify(nextDocumentsBySection)
        );
        window.localStorage.setItem(
          ANALYSIS_ACTIVE_IDS_BY_SECTION_KEY,
          JSON.stringify(nextActiveIdsBySection)
        );
      }

      return nextDocuments;
    });
  };

  const handleSaveMonthlyAnalysis = () => {
    const newDocumentId = createMonthlyAnalysisDocumentId();
    const newDocument = {
      id: newDocumentId,
      addressee: "КР Мамлекетик чек ара кызматынын күжүрмөн даярдоо башкармалыгынын башчысына",
      attachments: [],
      body: "",
      commanderName: "",
      commanderRank: "",
      commanderSignature: "",
      commanderTitle: "",
      created: true,
      extraPages: [],
      isMonthlyDocumentOpen: false,
      registryNumber: null,
      sectionId: selectedSectionId || "monthly-analysis",
      title: draftMonthlyAnalysisTitle,
      updatedAt: Date.now(),
    };

    const nextDocuments = [...monthlyAnalysisDocumentsRef.current, newDocument];
    monthlyAnalysisDocumentsRef.current = nextDocuments;
    setMonthlyAnalysisDocuments(nextDocuments);

    const sectionKey = selectedSectionId || "monthly-analysis";
    const nextDocumentsBySection = {
      ...analysisDocumentsBySectionRef.current,
      [sectionKey]: nextDocuments,
    };
    const nextActiveIdsBySection = {
      ...analysisActiveIdsBySectionRef.current,
      [sectionKey]: newDocumentId,
    };
    analysisDocumentsBySectionRef.current = nextDocumentsBySection;
    analysisActiveIdsBySectionRef.current = nextActiveIdsBySection;
    setAnalysisDocumentsBySection(nextDocumentsBySection);
    setAnalysisActiveIdsBySection(nextActiveIdsBySection);

    setActiveMonthlyAnalysisDocumentId(newDocumentId);
    activeMonthlyAnalysisDocumentIdRef.current = newDocumentId;
    applyMonthlyAnalysisDocumentToState(newDocument);
    setMonthlyAnalysisCreated(true);
    setIsMonthlyDocumentOpen(true);
    setIsCreateDialogOpen(false);
    setSelectedSectionId(selectedSectionId || "monthly-analysis");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        MONTHLY_ANALYSIS_DOCUMENTS_STORAGE_KEY,
        JSON.stringify(nextDocuments.length ? nextDocuments : [...monthlyAnalysisDocumentsRef.current, newDocument])
      );
      window.localStorage.setItem(MONTHLY_ANALYSIS_ACTIVE_DOCUMENT_ID_KEY, newDocumentId);
      window.localStorage.setItem(
        ANALYSIS_DOCUMENTS_BY_SECTION_KEY,
        JSON.stringify(nextDocumentsBySection)
      );
      window.localStorage.setItem(
        ANALYSIS_ACTIVE_IDS_BY_SECTION_KEY,
        JSON.stringify(nextActiveIdsBySection)
      );
    }
    persistMonthlyAnalysisDraft({
      created: true,
      draftTitle: draftMonthlyAnalysisTitle,
      isCreateDialogOpen: false,
      isMonthlyDocumentOpen: true,
      activeDocumentId: newDocumentId,
      title: draftMonthlyAnalysisTitle,
    });
  };

  const handleSaveCurrentMonthlyAnalysisDocument = () => {
    if (!activeMonthlyAnalysisDocumentIdRef.current) return;

    updateActiveMonthlyAnalysisDocument({
      addressee: monthlyAnalysisAddressee,
      attachments: sanitizeMonthlyAnalysisAttachments(monthlyAnalysisAttachments),
      body: monthlyAnalysisBody,
      commanderName: monthlyAnalysisCommanderName,
      commanderRank: monthlyAnalysisCommanderRank,
      commanderSignature: monthlyAnalysisCommanderSignature,
      commanderTitle: monthlyAnalysisCommanderTitle,
      extraPages: monthlyAnalysisExtraPages,
      title: monthlyAnalysisTitle,
    });
    persistMonthlyAnalysisDraft({
      addressee: monthlyAnalysisAddressee,
      attachments: sanitizeMonthlyAnalysisAttachments(monthlyAnalysisAttachments),
      body: monthlyAnalysisBody,
      commanderName: monthlyAnalysisCommanderName,
      commanderRank: monthlyAnalysisCommanderRank,
      commanderSignature: monthlyAnalysisCommanderSignature,
      commanderTitle: monthlyAnalysisCommanderTitle,
      draftTitle: monthlyAnalysisTitle,
      extraPages: monthlyAnalysisExtraPages,
      title: monthlyAnalysisTitle,
    });
  };

  const handleSendMonthlyAnalysis = () => {
    if (isMonthlyAnalysisSent) return;

    const currentCounter = Number(window.localStorage.getItem(MONTHLY_ANALYSIS_REGISTRY_COUNTER_KEY) || "0");
    const nextCounter = currentCounter + 1;
    window.localStorage.setItem(MONTHLY_ANALYSIS_REGISTRY_COUNTER_KEY, String(nextCounter));
    setMonthlyAnalysisRegistryNumber(nextCounter);
    updateActiveMonthlyAnalysisDocument({ registryNumber: nextCounter });
    persistMonthlyAnalysisDraft({ registryNumber: nextCounter });
  };

  const handlePrintMonthlyAnalysis = () => {
    window.print();
  };

  const handleAddMonthlyAnalysisPage = () => {
    if (isMonthlyAnalysisSent) return;
    setMonthlyAnalysisExtraPages((currentPages) => {
      const nextPages = [...currentPages, ""];
      updateActiveMonthlyAnalysisDocument({ extraPages: nextPages });
      persistMonthlyAnalysisDraft({ extraPages: nextPages });
      return nextPages;
    });
  };

  const handleMonthlyAnalysisExtraPageChange = (pageIndex, value) => {
    setMonthlyAnalysisExtraPages((currentPages) => {
      const nextPages = currentPages.map((pageText, currentPageIndex) =>
        currentPageIndex === pageIndex ? value : pageText
      );
      updateActiveMonthlyAnalysisDocument({ extraPages: nextPages });
      persistMonthlyAnalysisDraft({ extraPages: nextPages });
      return nextPages;
    });
  };

  const handleDeleteMonthlyAnalysisPage = (pageIndex) => {
    if (isMonthlyAnalysisSent) return;
    setMonthlyAnalysisExtraPages((currentPages) => {
      const nextPages = currentPages.filter((_, currentPageIndex) => currentPageIndex !== pageIndex);
      updateActiveMonthlyAnalysisDocument({ extraPages: nextPages });
      persistMonthlyAnalysisDraft({ extraPages: nextPages });
      return nextPages;
    });
  };

  const handleMonthlyAnalysisAttachmentUpload = async (attachmentType, fileList) => {
    if (isMonthlyAnalysisSent) return;
    const files = Array.from(fileList || []).filter(Boolean);
    if (files.length === 0) return;
    const activeDocumentId = activeMonthlyAnalysisDocumentIdRef.current;
    if (!activeDocumentId) return;

    const nextAttachments = files.map((file) => {
      const objectUrl = URL.createObjectURL(file);
      monthlyAnalysisAttachmentUrlsRef.current.push(objectUrl);
      return {
        id: createMonthlyAnalysisAttachmentId(),
        dataUrl: attachmentType === "photo" ? objectUrl : null,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        objectUrl,
        size: file.size,
        type: attachmentType,
      };
    });

    if (activeMonthlyAnalysisDocumentIdRef.current !== activeDocumentId) return;

    setMonthlyAnalysisAttachments((currentAttachments) => {
      const mergedAttachments = [...currentAttachments, ...nextAttachments];
      const attachmentsForStorage = sanitizeMonthlyAnalysisAttachments(mergedAttachments);
      updateActiveMonthlyAnalysisDocument({ attachments: attachmentsForStorage });
      persistMonthlyAnalysisDraft({ attachments: attachmentsForStorage });
      return mergedAttachments;
    });
  };

  const handleMonthlyAnalysisAttachmentButtonClick = (attachmentType) => {
    if (attachmentType === "photo") {
      monthlyAnalysisPhotoInputRef.current?.click();
      return;
    }
    if (attachmentType === "video") {
      monthlyAnalysisVideoInputRef.current?.click();
      return;
    }
    monthlyAnalysisDocumentInputRef.current?.click();
  };

  const handleOpenMonthlyAnalysisPicker = () => {
    setSelectedMonthlyAnalysisSourceDocumentIds([]);
    setIsMonthlyAnalysisPickerOpen(true);
  };

  const handleInsertMonthlyAnalysisSourceDocument = () => {
    const selectedDocuments = monthlyAnalysisSourceDocuments.filter((document) =>
      selectedMonthlyAnalysisSourceDocumentIds.includes(document.id)
    );
    if (selectedDocuments.length === 0) return;

    const nextAttachments = selectedDocuments.flatMap((document) =>
      Array.isArray(document.attachments) ? document.attachments : []
    );
    const nextExtraPages = selectedDocuments.flatMap((document) =>
      Array.isArray(document.extraPages) ? document.extraPages : []
    );
    const nextBody = composeMonthlyAnalysisDocumentsText(selectedDocuments);
    const primaryDocument = selectedDocuments[0];

    setMonthlyAnalysisAddressee("");
    setMonthlyAnalysisBody(nextBody);
    setMonthlyAnalysisAttachments(nextAttachments);
    setMonthlyAnalysisExtraPages(nextExtraPages);
    setMonthlyAnalysisCommanderTitle(primaryDocument.commanderTitle || "");
    setMonthlyAnalysisCommanderRank(primaryDocument.commanderRank || "");
    setMonthlyAnalysisCommanderName(primaryDocument.commanderName || "");
    setMonthlyAnalysisCommanderSignature(primaryDocument.commanderSignature || "");
    updateActiveMonthlyAnalysisDocument({
      addressee: "",
      attachments: sanitizeMonthlyAnalysisAttachments(nextAttachments),
      body: nextBody,
      commanderName: primaryDocument.commanderName || "",
      commanderRank: primaryDocument.commanderRank || "",
      commanderSignature: primaryDocument.commanderSignature || "",
      commanderTitle: primaryDocument.commanderTitle || "",
      extraPages: nextExtraPages,
    });
    persistMonthlyAnalysisDraft({
      addressee: "",
      attachments: sanitizeMonthlyAnalysisAttachments(nextAttachments),
      body: nextBody,
      commanderName: primaryDocument.commanderName || "",
      commanderRank: primaryDocument.commanderRank || "",
      commanderSignature: primaryDocument.commanderSignature || "",
      commanderTitle: primaryDocument.commanderTitle || "",
      extraPages: nextExtraPages,
    });
    setIsMonthlyAnalysisPickerOpen(false);
  };

  const handleDeleteMonthlyAnalysisAttachment = (attachmentId) => {
    if (isMonthlyAnalysisSent) return;

    setMonthlyAnalysisAttachments((currentAttachments) => {
      const attachmentToDelete = currentAttachments.find((attachment) => attachment.id === attachmentId);
      if (attachmentToDelete?.objectUrl) {
        try {
          URL.revokeObjectURL(attachmentToDelete.objectUrl);
        } catch {
          // ignore cleanup failures
        }
      }

      const nextAttachments = currentAttachments.filter((attachment) => attachment.id !== attachmentId);
      const attachmentsForStorage = sanitizeMonthlyAnalysisAttachments(nextAttachments);
      updateActiveMonthlyAnalysisDocument({ attachments: attachmentsForStorage });
      persistMonthlyAnalysisDraft({ attachments: attachmentsForStorage });
      return nextAttachments;
    });
  };

  const getCommanderSignaturePoint = (event) => {
    const canvas = commanderSignatureCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleCommanderSignatureStart = (event) => {
    if (isMonthlyAnalysisSent) return;
    const canvas = commanderSignatureCanvasRef.current;
    const point = getCommanderSignaturePoint(event);
    if (!canvas || !point) return;

    event.preventDefault();
    const context = canvas.getContext("2d");
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111";
    context.beginPath();
    context.moveTo(point.x, point.y);
    isDrawingCommanderSignatureRef.current = true;
  };

  const handleCommanderSignatureMove = (event) => {
    if (!isDrawingCommanderSignatureRef.current || isMonthlyAnalysisSent) return;
    const canvas = commanderSignatureCanvasRef.current;
    const point = getCommanderSignaturePoint(event);
    if (!canvas || !point) return;

    event.preventDefault();
    const context = canvas.getContext("2d");
    context.lineTo(point.x, point.y);
    context.stroke();
    const nextSignature = canvas.toDataURL("image/png");
    setMonthlyAnalysisCommanderSignature(nextSignature);
    updateActiveMonthlyAnalysisDocument({ commanderSignature: nextSignature });
    persistMonthlyAnalysisDraft({ commanderSignature: nextSignature });
  };

  const handleCommanderSignatureEnd = () => {
    isDrawingCommanderSignatureRef.current = false;
    const canvas = commanderSignatureCanvasRef.current;
    if (!canvas || isMonthlyAnalysisSent) return;
    const nextSignature = canvas.toDataURL("image/png");
    setMonthlyAnalysisCommanderSignature(nextSignature);
    updateActiveMonthlyAnalysisDocument({ commanderSignature: nextSignature });
    persistMonthlyAnalysisDraft({ commanderSignature: nextSignature });
  };

  const handleCommanderSignatureClear = () => {
    if (isMonthlyAnalysisSent) return;
    const canvas = commanderSignatureCanvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setMonthlyAnalysisCommanderSignature("");
    updateActiveMonthlyAnalysisDocument({ commanderSignature: "" });
    persistMonthlyAnalysisDraft({ commanderSignature: "" });
  };

  const loadCommanderSignatureToCanvas = (dataUrl) => {
    const canvas = commanderSignatureCanvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (!dataUrl) return;

    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = dataUrl;
  };

  const openCommanderSignatureDialog = () => {
    if (isMonthlyAnalysisSent) return;
    setIsCommanderSignatureDialogOpen(true);
    window.requestAnimationFrame(() => loadCommanderSignatureToCanvas(monthlyAnalysisCommanderSignature));
  };

  const saveCommanderSignature = () => {
    const canvas = commanderSignatureCanvasRef.current;
    if (!canvas || isMonthlyAnalysisSent) return;
    const nextSignature = canvas.toDataURL("image/png");
    setMonthlyAnalysisCommanderSignature(nextSignature);
    updateActiveMonthlyAnalysisDocument({ commanderSignature: nextSignature });
    persistMonthlyAnalysisDraft({ commanderSignature: nextSignature });
    setIsCommanderSignatureDialogOpen(false);
  };

  const signatureBlock = (
    <div
      className="monthly-analysis-signature-block"
      style={{
        color: "#111",
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: "12pt",
        marginTop: "32px",
      }}
    >
      <input
        onChange={(event) => {
          const nextValue = event.target.value;
          setMonthlyAnalysisCommanderTitle(nextValue);
          updateActiveMonthlyAnalysisDocument({ commanderTitle: nextValue });
          persistMonthlyAnalysisDraft({ commanderTitle: nextValue });
        }}
        placeholder="2026 аскер бөлүгүнүн командири"
        readOnly={isMonthlyAnalysisSent}
        style={{
          backgroundColor: "transparent",
          border: "none",
          color: "#111",
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: "12pt",
          fontWeight: "bold",
          marginBottom: "16px",
          outline: "none",
          width: "100%",
        }}
        value={monthlyAnalysisCommanderTitle}
      />
      <div style={{ alignItems: "center", display: "grid", gridTemplateColumns: "145px 190px 1fr", gap: "18px" }}>
        <input
          onChange={(event) => {
            const nextValue = event.target.value;
            setMonthlyAnalysisCommanderRank(nextValue);
            updateActiveMonthlyAnalysisDocument({ commanderRank: nextValue });
            persistMonthlyAnalysisDraft({ commanderRank: nextValue });
          }}
          placeholder="полковник"
          readOnly={isMonthlyAnalysisSent}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: "#111",
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: "12pt",
            fontWeight: "bold",
            outline: "none",
          }}
          value={monthlyAnalysisCommanderRank}
          />
        <button
          onClick={openCommanderSignatureDialog}
          style={{
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            minHeight: "62px",
            position: "relative",
            backgroundColor: "transparent",
            border: "1px solid #999",
            cursor: isMonthlyAnalysisSent ? "default" : "pointer",
            justifyContent: "center",
            width: "190px",
          }}
          type="button"
        >
          {monthlyAnalysisCommanderSignature ? (
            <img
              alt="Кол тамга"
              src={monthlyAnalysisCommanderSignature}
              style={{ maxHeight: "50px", maxWidth: "180px", objectFit: "contain" }}
            />
          ) : null}
          {!monthlyAnalysisCommanderSignature ? (
            <span style={{ color: "#9a9a9a", fontSize: "10pt" }}>
              кол тамга
            </span>
          ) : null}
        </button>
        <input
          onChange={(event) => {
            const nextValue = event.target.value;
            setMonthlyAnalysisCommanderName(nextValue);
            updateActiveMonthlyAnalysisDocument({ commanderName: nextValue });
            persistMonthlyAnalysisDraft({ commanderName: nextValue });
          }}
          placeholder="ФИО"
          readOnly={isMonthlyAnalysisSent}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: "#111",
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: "12pt",
            fontWeight: "bold",
            outline: "none",
          }}
          value={monthlyAnalysisCommanderName}
        />
      </div>
    </div>
  );

  if (selectedSection && isMonthlyDocumentOpen) {
    return (
      <section className="module-panel monthly-analysis-print-root">
        <button
          className="module-back-button"
          onClick={() => {
            setIsMonthlyDocumentOpen(false);
            setIsMonthlyAnalysisPickerOpen(false);
          }}
          type="button"
        >
          Артка
        </button>
        <div className="module-actions">
          <button className="module-action-button" onClick={handleSaveCurrentMonthlyAnalysisDocument} type="button">
            Сактоо
          </button>
          {selectedSectionId === "period-analysis" || selectedSectionId === "year-analysis" ? (
            <button
              className="module-action-button"
              disabled={isMonthlyAnalysisSent}
              onClick={handleOpenMonthlyAnalysisPicker}
              type="button"
            >
              Выбрать
            </button>
          ) : null}
          <button
            className="module-action-button"
            disabled={isMonthlyAnalysisSent}
            onClick={handleSendMonthlyAnalysis}
            type="button"
          >
            Отправить
          </button>
          <button
            className="module-action-button"
            disabled={isMonthlyAnalysisSent}
            onClick={() => handleDeleteMonthlyAnalysisDocument(activeMonthlyAnalysisDocumentId)}
            type="button"
          >
            Удалить
          </button>
          <button
            className="module-action-button"
            disabled={isMonthlyAnalysisSent}
            onClick={handleAddMonthlyAnalysisPage}
            type="button"
          >
            + барак кошуу
          </button>
          <button className="module-action-button" onClick={handlePrintMonthlyAnalysis} type="button">
            Печать
          </button>
        </div>
        <div
          className="monthly-analysis-page monthly-analysis-page--first"
          style={{
            backgroundColor: "#fff",
            border: "1px solid #d0d0d0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            fontFamily: '"Times New Roman", Times, serif',
            margin: "0 auto",
            minHeight: "1123px",
            padding: "28px 42px",
            width: "794px",
          }}
        >
          <div
            style={{
              alignItems: "center",
              display: "grid",
              gap: "18px",
              gridTemplateColumns: "1fr 86px 1fr",
              marginBottom: "28px",
            }}
          >
            <div
              style={{
                fontSize: "10.5pt",
                fontWeight: "bold",
                lineHeight: 1.25,
                textAlign: "center",
                textTransform: "uppercase",
              }}
            >
              КЫРГЫЗ РЕСПУБЛИКАСЫНЫН
              <br />
              МАМЛЕКЕТТИК
              <br />
              ЧЕК АРА КЫЗМАТЫ
            </div>
            <img
              alt="Кыргыз Республикасынын герби"
              src={kyrgyzstanCoatOfArmsUrl}
              style={{
                display: "block",
                height: "86px",
                objectFit: "contain",
                width: "86px",
              }}
            />
            <div
              style={{
                fontSize: "10.5pt",
                fontWeight: "bold",
                lineHeight: 1.25,
                textAlign: "center",
                textTransform: "uppercase",
              }}
            >
              ГОСУДАРСТВЕННАЯ
              <br />
              ПОГРАНИЧНАЯ СЛУЖБА
              <br />
              КЫРГЫЗСКОЙ РЕСПУБЛИКИ
            </div>
          </div>
          <div
            style={{
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: "12pt",
              marginBottom: "18px",
              textAlign: "left",
            }}
          >
            {formattedDocumentDate} {formattedRegistryNumber}
          </div>
          <textarea
            onChange={(event) => {
              const nextValue = event.target.value;
              setMonthlyAnalysisAddressee(nextValue);
              updateActiveMonthlyAnalysisDocument({ addressee: nextValue });
              persistMonthlyAnalysisDraft({ addressee: nextValue });
            }}
            readOnly={isMonthlyAnalysisSent}
            rows={3}
            style={{
              backgroundColor: "transparent",
              border: "none",
              color: "#000",
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: "12pt",
              fontWeight: "bold",
              lineHeight: 1.3,
              marginBottom: "32px",
              marginLeft: "360px",
              marginTop: "42px",
              outline: "none",
              resize: isMonthlyAnalysisSent ? "none" : "vertical",
              textAlign: "left",
              width: "310px",
            }}
            value={monthlyAnalysisAddressee}
          />
          <textarea
            onChange={(event) => {
              const nextValue = event.target.value;
              setMonthlyAnalysisTitle(nextValue);
              updateActiveMonthlyAnalysisDocument({ title: nextValue });
              persistMonthlyAnalysisDraft({ title: nextValue });
            }}
            placeholder={monthlyAnalysisPlaceholder}
            readOnly={isMonthlyAnalysisSent}
            rows={3}
            style={{
              border: "none",
              color: "#333",
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: "14pt",
              fontWeight: "bold",
              outline: "none",
              resize: isMonthlyAnalysisSent ? "none" : "vertical",
              textAlign: "center",
              width: "100%",
            }}
            value={monthlyAnalysisTitle}
          />
          <textarea
            onChange={(event) => {
              const nextValue = event.target.value;
              setMonthlyAnalysisBody(nextValue);
              updateActiveMonthlyAnalysisDocument({ body: nextValue });
              persistMonthlyAnalysisDraft({ body: nextValue });
            }}
            placeholder="Документтин негизги текстин бул жерге жазыңыз..."
            readOnly={isMonthlyAnalysisSent}
            className="monthly-analysis-page__body"
            ref={monthlyAnalysisBodyTextareaRef}
            rows={24}
            style={{
              border: "none",
              color: "#111",
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: "12pt",
              lineHeight: 1.45,
              marginTop: "22px",
              minHeight: "610px",
              outline: "none",
              resize: isMonthlyAnalysisSent ? "none" : "vertical",
              textAlign: "left",
              width: "100%",
            }}
            value={monthlyAnalysisBody}
          />
          <div className="monthly-analysis-page__body-print" aria-hidden="true">
            {monthlyAnalysisBody}
          </div>
          <div className="monthly-analysis-attachments no-print">
            <div className="monthly-analysis-attachments__toolbar">
              <button
                className="monthly-analysis-attachments__button monthly-analysis-attachments__button--green"
                disabled={isMonthlyAnalysisSent}
                onClick={() => handleMonthlyAnalysisAttachmentButtonClick("photo")}
                type="button"
              >
                Фото жүктөө
              </button>
              <button
                className="monthly-analysis-attachments__button monthly-analysis-attachments__button--green"
                disabled={isMonthlyAnalysisSent}
                onClick={() => handleMonthlyAnalysisAttachmentButtonClick("video")}
                type="button"
              >
                Видео жүктөө
              </button>
              <button
                className="monthly-analysis-attachments__button monthly-analysis-attachments__button--green"
                disabled={isMonthlyAnalysisSent}
                onClick={() => handleMonthlyAnalysisAttachmentButtonClick("document")}
                type="button"
              >
                Иш документтерди жүктөө
              </button>
            </div>
            <input
              accept="image/*"
              multiple
              onChange={(event) => {
                handleMonthlyAnalysisAttachmentUpload("photo", event.target.files);
                event.target.value = "";
              }}
              ref={monthlyAnalysisPhotoInputRef}
              style={{ display: "none" }}
              type="file"
            />
            <input
              accept="video/*"
              multiple
              onChange={(event) => {
                handleMonthlyAnalysisAttachmentUpload("video", event.target.files);
                event.target.value = "";
              }}
              ref={monthlyAnalysisVideoInputRef}
              style={{ display: "none" }}
              type="file"
            />
            <input
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              multiple
              onChange={(event) => {
                handleMonthlyAnalysisAttachmentUpload("document", event.target.files);
                event.target.value = "";
              }}
              ref={monthlyAnalysisDocumentInputRef}
              style={{ display: "none" }}
              type="file"
            />
            {monthlyAnalysisAttachments.length > 0 ? (
              <div className="monthly-analysis-attachments__grid">
                {monthlyAnalysisAttachments.map((attachment) => (
                  <div className="monthly-analysis-attachment" key={attachment.id}>
                    <button
                      aria-label="Вложение удалить"
                      className="monthly-analysis-attachment__remove"
                      disabled={isMonthlyAnalysisSent}
                      onClick={() => handleDeleteMonthlyAnalysisAttachment(attachment.id)}
                      type="button"
                    >
                      ×
                    </button>
                    {attachment.type === "photo" ? (
                      <img alt={attachment.fileName} src={attachment.objectUrl || attachment.dataUrl} />
                    ) : attachment.type === "video" ? (
                      <video controls src={attachment.objectUrl || attachment.dataUrl} />
                    ) : (
                      <a
                        href={attachment.objectUrl || attachment.dataUrl}
                        download={attachment.fileName}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {attachment.fileName}
                      </a>
                    )}
                    <div className="monthly-analysis-attachment__meta">
                      <strong>{attachment.fileName}</strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          {monthlyAnalysisExtraPages.length === 0 ? signatureBlock : null}
        </div>
        {monthlyAnalysisExtraPages.map((pageText, pageIndex) => (
          <div
            className="monthly-analysis-page monthly-analysis-page--extra"
            key={pageIndex}
            style={{
              backgroundColor: "#fff",
              border: "1px solid #d0d0d0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              fontFamily: '"Times New Roman", Times, serif',
              margin: "24px auto 0",
              minHeight: "1123px",
              padding: "42px",
              width: "794px",
            }}
          >
            <textarea
            onChange={(event) => handleMonthlyAnalysisExtraPageChange(pageIndex, event.target.value)}
              placeholder="Кошумча барактын текстин бул жерге жазыңыз..."
              readOnly={isMonthlyAnalysisSent}
            className="monthly-analysis-page__extra-text"
            ref={(element) => {
              monthlyAnalysisExtraTextareaRefs.current[pageIndex] = element;
            }}
            rows={36}
              style={{
                border: "none",
                color: "#111",
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: "12pt",
                lineHeight: 1.45,
                minHeight: "1010px",
                outline: "none",
                resize: isMonthlyAnalysisSent ? "none" : "vertical",
                textAlign: "left",
                width: "100%",
              }}
              value={pageText}
            />
            <div className="monthly-analysis-page__extra-text-print" aria-hidden="true">
              {pageText}
            </div>
            {pageIndex === monthlyAnalysisExtraPages.length - 1 ? signatureBlock : null}
            {!isMonthlyAnalysisSent ? (
              <button
                onClick={() => handleDeleteMonthlyAnalysisPage(pageIndex)}
                style={{
                  backgroundColor: "#ff4444",
                  border: "1px solid #cc0000",
                  borderRadius: "4px",
                  color: "#fff",
                  cursor: "pointer",
                  display: "block",
                  fontFamily: '"Times New Roman", Times, serif',
                  fontSize: "11pt",
                  margin: "28px 0 0 auto",
                  padding: "6px 14px",
                }}
                type="button"
              >
                барак өчүрүү
              </button>
            ) : null}
          </div>
        ))}
        {isCommanderSignatureDialogOpen ? (
          <div
            className="lesson-period-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="commander-signature-title"
          >
            <div className="lesson-period-dialog__panel" style={{ maxWidth: "920px" }}>
              <h2 id="commander-signature-title">Подпись</h2>
              <canvas
                height={300}
                onPointerDown={handleCommanderSignatureStart}
                onPointerLeave={handleCommanderSignatureEnd}
                onPointerMove={handleCommanderSignatureMove}
                onPointerUp={handleCommanderSignatureEnd}
                ref={commanderSignatureCanvasRef}
                style={{
                  border: "1px solid #222",
                  backgroundColor: "#fff",
                  height: "300px",
                  touchAction: "none",
                  width: "860px",
                }}
                width={860}
              />
              <div className="lesson-period-dialog__actions">
                <button
                  onClick={() => {
                    handleCommanderSignatureClear();
                    setIsCommanderSignatureDialogOpen(false);
                  }}
                  type="button"
                >
                  Очистить
                </button>
                <button onClick={() => setIsCommanderSignatureDialogOpen(false)} type="button">
                  Жокко чыгаруу
                </button>
                <button onClick={saveCommanderSignature} type="button">
                  Сактоо
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {isMonthlyAnalysisPickerOpen ? (
          <div
            className="lesson-period-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="monthly-analysis-picker-title"
          >
            <div className="lesson-period-dialog__panel" style={{ maxWidth: "980px", width: "980px" }}>
              <h2 id="monthly-analysis-picker-title">{monthlyAnalysisPickerTitle}</h2>
              {monthlyAnalysisSourceDocuments.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gap: "10px",
                    marginBottom: "16px",
                    maxHeight: "460px",
                    overflow: "auto",
                  }}
                >
                  {monthlyAnalysisSourceDocuments.map((document) => {
                    const isSelected = selectedMonthlyAnalysisSourceDocumentIds.includes(document.id);
                    return (
                      <button
                        key={document.id}
                        type="button"
                        onClick={() => handleToggleMonthlyAnalysisSourceDocument(document.id)}
                        style={{
                          backgroundColor: isSelected ? "#dcebe3" : "#f7f8f4",
                          border: isSelected ? "1px solid #0f5b3a" : "1px solid #bdcbc4",
                          color: "#13221b",
                          display: "grid",
                          gap: "4px",
                          padding: "12px 14px",
                          textAlign: "left",
                        }}
                      >
                        <strong>{document.title || monthlyAnalysisSourcePlaceholder}</strong>
                        <span style={{ color: "#53645d", fontSize: "12px" }}>
                          {document.body ? `${document.body.slice(0, 120)}${document.body.length > 120 ? "..." : ""}` : "Текст жок"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: "#53645d", marginBottom: "16px" }}>{monthlyAnalysisPickerEmptyText}</div>
              )}
              <div className="lesson-period-dialog__actions">
                <button onClick={() => setIsMonthlyAnalysisPickerOpen(false)} type="button">
                  Жокко чыгаруу
                </button>
                <button
                  onClick={handleInsertMonthlyAnalysisSourceDocument}
                  type="button"
                  disabled={selectedMonthlyAnalysisSourceDocumentIds.length === 0}
                >
                  Талдоо жасоо
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  if (selectedSection) {
    return (
      <section className="module-panel">
        <button
          className="module-back-button"
          onClick={() => {
            setSelectedSectionId(null);
            setIsCreateDialogOpen(false);
            setIsMonthlyDocumentOpen(false);
            setIsMonthlyAnalysisPickerOpen(false);
            persistMonthlyAnalysisDraft({
              isCreateDialogOpen: false,
              isMonthlyDocumentOpen: false,
              selectedSectionId: null,
            });
          }}
          type="button"
        >
          Артка
        </button>
        <header className="module-header">
          <h1>{selectedSection.title}</h1>
        </header>
        {analyticsSections.some((section) => section.id === selectedSection.id) ? (
          <>
            <div className="module-actions">
              <button
                className="module-action-button"
                onClick={handleCreateMonthlyAnalysis}
                type="button"
              >
                Жаратуу
              </button>
            </div>
            <div className="module-document-list">
              {currentAnalysisSectionDocuments.map((document) => (
                <button
                  className="module-document-card"
                  key={document.id}
                  onClick={() => openMonthlyAnalysisDocument(document.id)}
                  style={{ width: "100%" }}
                  type="button"
                >
                  <span aria-hidden="true" className="module-document-icon" />
                  <strong>{document.title || currentAnalysisPlaceholder}</strong>
                  {!document.registryNumber ? (
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteMonthlyAnalysisDocument(document.id);
                      }}
                      role="button"
                      style={{
                        color: "#b42318",
                        cursor: "pointer",
                        fontSize: "12px",
                        marginLeft: "auto",
                        textDecoration: "underline",
                      }}
                      tabIndex={0}
                    >
                      Удалить
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            {isCreateDialogOpen ? (
              <div className="lesson-period-dialog" role="dialog" aria-modal="true" aria-labelledby="monthly-analysis-create-title">
                <form
                  className="lesson-period-dialog__panel"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleSaveMonthlyAnalysis();
                  }}
                >
                  <h2 id="monthly-analysis-create-title">Жаратуу</h2>
                  <textarea
                    className="lesson-period-dialog__textarea"
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setDraftMonthlyAnalysisTitle(nextValue);
                      persistMonthlyAnalysisDraft({ draftTitle: nextValue });
                    }}
                    placeholder={currentAnalysisPlaceholder}
                    rows={5}
                    value={draftMonthlyAnalysisTitle}
                  />
                  <div className="lesson-period-dialog__actions">
                    <button onClick={() => setIsCreateDialogOpen(false)} type="button">
                      Жокко чыгаруу
                    </button>
                    <button type="submit">
                      Сактоо
                    </button>
                  </div>
                </form>
              </div>
            ) : null}
          </>
        ) : (
          <div className="empty-state">Маалымат жок</div>
        )}
      </section>
    );
  }

  return (
    <section className="module-panel">
      <header className="module-header">
        <h1>Күжүрмөн даярдоонун талдоолору</h1>
      </header>
      <div className="module-document-list module-section-list">
        {analyticsSections.map((section) => (
          <button
            className="module-document-card module-section-card"
            key={section.id}
            onClick={() => handleSelectAnalyticsSection(section.id)}
            type="button"
          >
            <strong>{section.title}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
