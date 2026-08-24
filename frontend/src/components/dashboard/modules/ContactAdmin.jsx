import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  createAdminChatMessage,
  createOutpostBroadcastMessage,
  deleteAdminChatConversation,
  deleteAdminChatMessage,
  getAdminChatMessages,
  getChatPartners,
} from "../../../api/dashboard.js";

const FILE_ACCEPT =
  "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.zip,.rar";
const OUTPOST_BROADCAST_ID = "all-outposts";
const EMOJI_GROUPS = [
  {
    id: "faces",
    icon: "😀",
    label: "Смайлики",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😋", "😛", "🤪", "🤗", "🤭", "🫢", "🤔", "🫡", "🤐", "😐", "😑", "😶", "🫥", "😏", "😒", "🙄", "😬", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🥴", "🤢", "🤧", "🥵", "🥶", "😎", "🤓", "🧐", "😕", "😟", "🙁", "😮‍💨", "😢", "😭", "😤", "😡", "🤬", "😱", "😨", "😰", "🤯", "🥳", "🤩"],
  },
  {
    id: "gestures",
    icon: "👍",
    label: "Жесты",
    emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏", "✍️", "💪", "🦾", "🫵", "👀", "👁️", "👄"],
  },
  {
    id: "hearts",
    icon: "❤️",
    label: "Символы",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "❣️", "💋", "💯", "💢", "💥", "💫", "💦", "💨", "🕊️", "✅", "❌", "❗", "❓", "⚠️", "♻️", "✨", "⭐", "🌟", "🔥", "🎉", "🎊"],
  },
  {
    id: "nature",
    icon: "🌿",
    label: "Природа",
    emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🦅", "🦉", "🐺", "🐗", "🐴", "🦋", "🐝", "🐞", "🐢", "🐍", "🦎", "🐙", "🐬", "🐳", "🌸", "🌹", "🌺", "🌻", "🌼", "🌷", "🌱", "🌿", "🍀", "🌲", "🌳", "🌞", "🌙", "🌈", "☀️", "☁️", "❄️"],
  },
  {
    id: "food",
    icon: "🍎",
    label: "Еда",
    emojis: ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍒", "🍑", "🥭", "🍍", "🥝", "🍅", "🥑", "🥦", "🥕", "🌽", "🥐", "🍞", "🧀", "🥚", "🍳", "🥞", "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🍜", "🍝", "🍣", "🍚", "🍰", "🎂", "🍫", "🍿", "☕", "🍵", "🧃", "🥤"],
  },
  {
    id: "activity",
    icon: "⚽",
    label: "Дела",
    emojis: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🥏", "🎱", "🏓", "🏸", "🥅", "⛳", "🏹", "🎣", "🥊", "🥋", "🎽", "🛹", "🛷", "⛸️", "🎿", "🏆", "🥇", "🥈", "🥉", "🎖️", "🎯", "🎮", "🎲", "🎸", "🎹", "🥁", "🎤", "🎧", "🎬", "🎨", "📚", "✏️", "💼"],
  },
  {
    id: "travel",
    icon: "🚗",
    label: "Транспорт",
    emojis: ["🚗", "🚕", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚜", "🏍️", "🚲", "🛴", "🚨", "🚥", "🚧", "⚓", "⛵", "🚤", "🚢", "✈️", "🚁", "🚀", "🛰️", "🏠", "🏢", "🏥", "🏫", "🏰", "🗼", "🗽", "⛰️", "🏕️", "🏖️", "🌍", "🗺️", "🧭"],
  },
];

const getAttachmentKind = (file) => {
  if (!file) {
    return "";
  }

  const name = file.name.toLowerCase();
  if (file.type.startsWith("image/") || name.match(/\.(png|jpe?g|gif|webp|bmp|svg)$/)) {
    return "image";
  }
  if (file.type.startsWith("audio/") || name.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/)) {
    return "audio";
  }
  if (file.type.startsWith("video/") || name.match(/\.(mp4|mov|avi|mkv|webm|m4v)$/)) {
    return "video";
  }
  return "file";
};

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ky-KG", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getDisplayName = (item) => item?.full_name || item?.email || `Колдонуучу #${item?.id || ""}`;

const getInitials = (item) =>
  getDisplayName(item)
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "А";

const getAvatarSource = (item) => item?.photo_face || item?.avatar || "";

const Icon = ({ children, size = 18 }) => (
  <svg
    aria-hidden="true"
    fill="none"
    height={size}
    viewBox="0 0 24 24"
    width={size}
  >
    {children}
  </svg>
);

const ChatIcon = () => (
  <Icon size={20}>
    <path d="M7 18.5 3.5 21l1-4A8 8 0 1 1 7 18.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    <path d="M8 10h8M8 14h5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
  </Icon>
);

const UsersIcon = () => (
  <Icon>
    <path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 11a3 3 0 0 0 0-6M18 14.5a4 4 0 0 1 3 3.9V20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
  </Icon>
);

const SmileIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8.5 14.5c1 1.2 2.1 1.8 3.5 1.8s2.5-.6 3.5-1.8M9 9.5h.01M15 9.5h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
  </Icon>
);

const MicIcon = () => (
  <Icon>
    <rect height="11" rx="3" stroke="currentColor" strokeWidth="1.8" width="7" x="8.5" y="2.5" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
  </Icon>
);

const StopIcon = () => (
  <Icon>
    <rect fill="currentColor" height="11" rx="2" width="11" x="6.5" y="6.5" />
  </Icon>
);

const PaperclipIcon = () => (
  <Icon>
    <path d="m9 12.5 5.8-5.8a3 3 0 1 1 4.2 4.2l-7.7 7.7a5 5 0 0 1-7.1-7.1l7.4-7.4M7 14.5l7.2-7.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
  </Icon>
);

const SendIcon = () => (
  <Icon>
    <path d="m21 3-8.2 18-2.1-7.7L3 10.8 21 3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    <path d="m10.7 13.3 4.4-4.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
  </Icon>
);

const CloseIcon = () => (
  <Icon size={16}>
    <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
  </Icon>
);

const TrashIcon = () => (
  <Icon size={16}>
    <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
  </Icon>
);

export default function ContactAdmin({ initialPartnerId, user, onRefresh }) {
  const isAdmin = user?.role === "admin";
  const isRegional = user?.role === "regional";
  const isOutpost = user?.role === "outpost";
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(
    initialPartnerId ? String(initialPartnerId) : ""
  );
  const [selectedAdminGroup, setSelectedAdminGroup] = useState("regional");
  const [selectedRegionalGroup, setSelectedRegionalGroup] = useState("admin");
  const [body, setBody] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [activeEmojiGroup, setActiveEmojiGroup] = useState(EMOJI_GROUPS[0].id);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [deleteMenuMessageId, setDeleteMenuMessageId] = useState(null);

  const isOutpostBroadcast = (isAdmin || isOutpost) && selectedUserId === OUTPOST_BROADCAST_ID;
  const selectedPartner = useMemo(
    () => isOutpostBroadcast
      ? { id: OUTPOST_BROADCAST_ID, full_name: "Жалпы топ", role: "outpost-group" }
      : users.find((item) => String(item.id) === String(selectedUserId)),
    [isOutpostBroadcast, selectedUserId, users]
  );
  const displayedUsers = useMemo(
    () => {
      if (isAdmin) {
        return users.filter((item) => item.role === selectedAdminGroup);
      }
      if (isRegional) {
        return users.filter((item) => item.role === selectedRegionalGroup);
      }
      return users;
    },
    [isAdmin, isRegional, selectedAdminGroup, selectedRegionalGroup, users]
  );

  const unreadCounts = useMemo(() => {
    const counts = {};

    messages.forEach((message) => {
      if (message.isRead) {
        return;
      }
      if (String(message.recipient?.id) !== String(user?.id)) {
        return;
      }

      const partnerId = String(message.sender?.id);
      counts[partnerId] = (counts[partnerId] || 0) + 1;
    });

    return counts;
  }, [messages, user?.id]);

  const totalUnreadCount = useMemo(
    () => users.reduce(
      (sum, item) => sum + Number(item.unreadChatCount || unreadCounts[String(item.id)] || 0),
      0
    ),
    [unreadCounts, users]
  );
  const partnerGroupUnreadCounts = useMemo(
    () => users.reduce(
      (counts, item) => {
        const count = Number(item.unreadChatCount || unreadCounts[String(item.id)] || 0);
        if (item.role === "admin" || item.role === "regional" || item.role === "outpost") {
          counts[item.role] += count;
        }
        return counts;
      },
      { admin: 0, regional: 0, outpost: 0 }
    ),
    [unreadCounts, users]
  );

  const visibleMessages = useMemo(() => {
    if (isOutpostBroadcast) {
      return messages;
    }
    if (!selectedUserId) {
      return messages;
    }

    return messages.filter(
      (message) =>
        String(message.sender?.id) === String(selectedUserId) ||
        String(message.recipient?.id) === String(selectedUserId)
    );
  }, [isOutpostBroadcast, messages, selectedUserId]);

  const chatPartner = useMemo(() => {
    return selectedPartner;
  }, [selectedPartner]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [selectedUserId, visibleMessages.length]);

  const loadUsers = async () => {
    try {
      const data = await getChatPartners();
      let filtered = Array.isArray(data) ? data : [];
      if (isOutpost) {
        const admin = filtered.find((item) => item.role === "admin");
        const regional = filtered.find((item) => item.role === "regional");
        filtered = [regional, admin].filter(Boolean);
      }
      const initialPartner = initialPartnerId
        ? filtered.find((item) => String(item.id) === String(initialPartnerId))
        : null;
      if (isAdmin && initialPartner) {
        setSelectedAdminGroup(initialPartner.role);
      }
      setUsers(filtered);
      setSelectedUserId((current) => {
        if (current === OUTPOST_BROADCAST_ID && (isAdmin || isOutpost)) {
          return current;
        }
        if (initialPartner) {
          return String(initialPartner.id);
        }
        if (current && filtered.some((item) => String(item.id) === String(current))) {
          return current;
        }
        const firstPartner = isAdmin
          ? filtered.find((item) => item.role === selectedAdminGroup)
          : isRegional
            ? filtered.find((item) => item.role === selectedRegionalGroup)
          : filtered[0];
        return firstPartner ? String(firstPartner.id) : "";
      });
    } catch {
      setUsers([]);
    }
  };

  const loadMessages = async (partnerId = selectedUserId, silent = false) => {
    if (!silent) setLoading(true);
    setError("");

    if (partnerId === OUTPOST_BROADCAST_ID) {
      try {
        if (isAdmin || isOutpost) {
          const data = await getAdminChatMessages({ scope: "outpost_broadcast" });
          const items = Array.isArray(data) ? data : [];
          if (isAdmin) {
            const seenBroadcasts = new Set();
            setMessages(items.filter((item) => {
              const broadcastKey = item.broadcastId || [
                item.body,
                item.attachment_name,
                String(item.createdAt || "").slice(0, 19),
              ].join("|");
              if (seenBroadcasts.has(broadcastKey)) return false;
              seenBroadcasts.add(broadcastKey);
              return true;
            }));
          } else {
            setMessages(items);
            window.dispatchEvent(new Event("chat-messages-read"));
          }
          onRefresh?.();
        } else {
          setMessages([]);
        }
      } catch (requestError) {
        setError(requestError?.response?.data?.detail || "Билдирмелерди жүктөө мүмкүн болгон жок.");
      } finally {
        if (!silent) setLoading(false);
      }
      return;
    }

    try {
      const params = partnerId ? { user_id: partnerId } : undefined;
      const data = await getAdminChatMessages(params);
      setMessages(Array.isArray(data) ? data : []);
      if (partnerId) {
        setUsers((items) => items.map((item) =>
          String(item.id) === String(partnerId)
            ? { ...item, unreadChatCount: 0 }
            : item
        ));
        window.dispatchEvent(new Event("chat-messages-read"));
      }
      onRefresh?.();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "Билдирмелерди жүктөө мүмкүн болгон жок.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      setSelectedUserId(String(users[0].id));
      return;
    }

    loadMessages(selectedUserId);
    if (!selectedUserId) return undefined;
    const intervalId = window.setInterval(
      () => loadMessages(selectedUserId, true),
      5000
    );
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  useEffect(() => {
    if (!isRecording) return undefined;
    const timer = window.setInterval(
      () => setRecordingSeconds((seconds) => seconds + 1),
      1000
    );
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(
    () => () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    },
    []
  );

  const addEmoji = (emoji) => {
    const input = messageInputRef.current;
    const start = input?.selectionStart ?? body.length;
    const end = input?.selectionEnd ?? body.length;
    const nextBody = `${body.slice(0, start)}${emoji}${body.slice(end)}`;
    setBody(nextBody);
    window.requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("Бул браузер үн жаздырууну колдобойт.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = "audio/webm;codecs=opus";
      const options = MediaRecorder.isTypeSupported(preferredType)
        ? { mimeType: preferredType }
        : undefined;
      const recorder = new MediaRecorder(stream, options);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size > 0) {
          setFile(new File([blob], `voice-${Date.now()}.webm`, { type: mimeType }));
        }
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        setIsRecording(false);
      };

      setError("");
      setRecordingSeconds(0);
      setIsRecording(true);
      recorder.start();
    } catch {
      setError("Микрофонго уруксат берилген жок.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleFileChange = (event) => {
    setFile(event.target.files?.[0] || null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = body.trim();

    if (!trimmed && !file) {
      setError("Текст жазыңыз же тиркеме кошуңуз.");
      return;
    }

    if (isRecording) {
      setError("Үн жаздырууну токтотуңуз.");
      return;
    }

    if (!selectedUserId) {
      setError("Колдонуучуну тандаңыз.");
      return;
    }

    setSending(true);
    setError("");
    setNotice("");

    try {
      const formData = new FormData();
      if (trimmed) {
        formData.append("body", trimmed);
      }
      if (file) {
        formData.append("attachment", file);
        formData.append("attachment_kind", getAttachmentKind(file));
        formData.append("attachment_name", file.name);
      }
      if (isOutpostBroadcast) {
        const result = await createOutpostBroadcastMessage(formData);
        setNotice(`Билдирүү ${result.recipientCount} заставага жөнөтүлдү.`);
      } else {
        formData.append("recipientId", selectedUserId);
        await createAdminChatMessage(formData);
      }
      setBody("");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadMessages();
      await loadUsers();
      onRefresh?.();
    } catch (requestError) {
      const responseError = requestError?.response?.data;
      const firstError =
        responseError?.body?.[0] ||
        responseError?.recipientId?.[0] ||
        responseError?.detail ||
        "Билдирүүнү жөнөтүү мүмкүн болгон жок.";
      setError(firstError);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (message, mode) => {
    if (
      mode === "everyone" &&
      !window.confirm("Бул билдирүүнү баарынан өчүрөсүзбү?")
    ) {
      return;
    }

    try {
      setError("");
      await deleteAdminChatMessage(message.id, mode);
      setDeleteMenuMessageId(null);
      await loadMessages();
      onRefresh?.();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail || "Билдирүүнү өчүрүү мүмкүн болгон жок."
      );
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedPartner) return;
    if (!window.confirm(`«${getDisplayName(selectedPartner)}» менен болгон чат эки тараптан тең өчүрүлсүнбү?`)) {
      return;
    }
    try {
      setError("");
      await deleteAdminChatConversation(selectedPartner.id);
      setMessages([]);
      await loadUsers();
      onRefresh?.();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "Чатты өчүрүү мүмкүн болгон жок.");
    }
  };

  const currentThreadName = chatPartner
    ? getDisplayName(chatPartner)
    : "Колдонуучуну тандаңыз";
  const partnerAvatar = getAvatarSource(chatPartner);

  return (
    <section className="module-panel admin-chat">
      <header className="module-header">
        <div className="admin-chat__page-heading">
          <span className="admin-chat__page-icon"><ChatIcon /></span>
          <div>
          <p>{isAdmin ? "Колдонуучулар менен кат алышуу" : "Байланыш"}</p>
          <h1>{isOutpost ? "Аскер бөлүгү менен байланыш" : "Колдонуучулар менен байланыш"}</h1>
          <span className="admin-chat__subtitle">
            {isAdmin
              ? "Сол жактан колдонуучуну тандап, оң жакка билдирүү жазыңыз."
              : "Адресатты тандап, текст, фото, видео жана документ жөнөтсөңүз болот."}
          </span>
          </div>
        </div>
        {totalUnreadCount > 0 ? <div className="admin-chat__counter">Новых: {totalUnreadCount}</div> : null}
      </header>

      <div className="admin-chat__layout">
        {(
          <aside className="admin-chat__sidebar">
            <strong className="admin-chat__sidebar-title">
              <UsersIcon /> {isOutpost ? "Кимге жазуу" : "Колдонуучулар"}
            </strong>
            {isAdmin ? (
              <div className="admin-chat__recipient-sections">
                <button
                  className={selectedAdminGroup === "regional" ? "is-active" : ""}
                  onClick={() => {
                    setSelectedAdminGroup("regional");
                    const firstRegional = users.find((item) => item.role === "regional");
                    setSelectedUserId(firstRegional ? String(firstRegional.id) : "");
                  }}
                  type="button"
                >
                  Аскер бөлүгү
                  {partnerGroupUnreadCounts.regional > 0 ? (
                    <em>{partnerGroupUnreadCounts.regional}</em>
                  ) : null}
                </button>
                <button
                  className={selectedAdminGroup === "outpost" ? "is-active" : ""}
                  onClick={() => {
                    setSelectedAdminGroup("outpost");
                    setSelectedUserId(OUTPOST_BROADCAST_ID);
                  }}
                  type="button"
                >
                  Заставалар
                  {partnerGroupUnreadCounts.outpost > 0 ? (
                    <em>{partnerGroupUnreadCounts.outpost}</em>
                  ) : null}
                </button>
              </div>
            ) : null}
            {isRegional ? (
              <div className="admin-chat__recipient-sections">
                <button
                  className={selectedRegionalGroup === "admin" ? "is-active" : ""}
                  onClick={() => {
                    setSelectedRegionalGroup("admin");
                    const firstAdmin = users.find((item) => item.role === "admin");
                    setSelectedUserId(firstAdmin ? String(firstAdmin.id) : "");
                  }}
                  type="button"
                >
                  Администратор
                  {partnerGroupUnreadCounts.admin > 0 ? (
                    <em>{partnerGroupUnreadCounts.admin}</em>
                  ) : null}
                </button>
                <button
                  className={selectedRegionalGroup === "outpost" ? "is-active" : ""}
                  onClick={() => {
                    setSelectedRegionalGroup("outpost");
                    const firstOutpost = users.find((item) => item.role === "outpost");
                    setSelectedUserId(firstOutpost ? String(firstOutpost.id) : "");
                  }}
                  type="button"
                >
                  Заставалар
                  {partnerGroupUnreadCounts.outpost > 0 ? (
                    <em>{partnerGroupUnreadCounts.outpost}</em>
                  ) : null}
                </button>
              </div>
            ) : null}
            <div className="admin-chat__user-list">
              {isOutpost || (isAdmin && selectedAdminGroup === "outpost") ? (
                <button
                  className={isOutpostBroadcast ? "is-active" : ""}
                  onClick={() => setSelectedUserId(OUTPOST_BROADCAST_ID)}
                  type="button"
                >
                  <span className="admin-chat__user-avatar">БЗ</span>
                  <span className="admin-chat__user-info">
                    <span className="admin-chat__user-title">Жалпы топ</span>
                    <small>Бардык заставалар</small>
                  </span>
                </button>
              ) : null}
              {displayedUsers.length === 0 ? (
                <span className="admin-chat__empty">Нет активных пользователей.</span>
              ) : (
                displayedUsers.map((item) => (
                  <button
                    key={item.id}
                    className={String(selectedUserId) === String(item.id) ? "is-active" : ""}
                    onClick={() => setSelectedUserId(String(item.id))}
                    type="button"
                  >
                    <span className="admin-chat__user-avatar">
                      {getAvatarSource(item) ? (
                        <img alt="" src={getAvatarSource(item)} />
                      ) : (
                        getInitials(item)
                      )}
                    </span>
                    <span className="admin-chat__user-info">
                      <span className="admin-chat__user-title">
                        {isOutpost
                          ? item.role === "admin"
                            ? "Администратор"
                            : "Аскер бөлүгү"
                          : getDisplayName(item)}
                        {(unreadCounts[String(item.id)] || item.unreadChatCount) ? (
                          <em className="admin-chat__badge">
                            {unreadCounts[String(item.id)] || item.unreadChatCount}
                          </em>
                        ) : null}
                      </span>
                      <small>
                        {isOutpost
                          ? getDisplayName(item)
                          : item.outpost_name || item.region || item.email}
                      </small>
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>
        )}

        <div className="admin-chat__thread">
          <div className="admin-chat__thread-head">
            <div className="admin-chat__partner">
              <div className="admin-chat__partner-avatar">
                {partnerAvatar ? (
                  <img alt={currentThreadName} src={partnerAvatar} />
                ) : (
                  <span>{getInitials(chatPartner)}</span>
                )}
              </div>
              <div>
                <strong>{currentThreadName}</strong>
                <span>
                  {selectedPartner
                    ? selectedPartner.email || selectedPartner.region
                    : "Сол жактан адамды тандаңыз"}
                </span>
              </div>
            </div>
            {isAdmin && selectedPartner && !isOutpostBroadcast ? (
              <button className="danger" onClick={handleDeleteConversation} type="button">
                Чатты өчүрүү
              </button>
            ) : null}
          </div>

          <div className="admin-chat__messages" ref={messagesContainerRef}>
            {isOutpostBroadcast ? (
              <div className="admin-chat__empty">
                <strong>Бардык заставалар</strong>
                <span>
                  {isAdmin
                    ? "Бул жерден жөнөтүлгөн билдирүү бардык активдүү заставаларга жетет."
                    : "Бул топко билдирүүнү администратор гана жөнөтөт."}
                </span>
                {isAdmin && notice ? <span className="dashboard-notice">{notice}</span> : null}
              </div>
            ) : null}
            {loading ? (
              <div className="admin-chat__empty">Билдирмелер жүктөлүүдө...</div>
            ) : visibleMessages.length === 0 ? (
              <div className="admin-chat__empty">Билдирүүлөр азырынча жок.</div>
            ) : (
              visibleMessages.map((message) => {
                const isOwn = String(message.sender?.id) === String(user?.id);
                const attachmentUrl = message.attachment;
                const attachmentName = message.attachment_name || attachmentUrl?.split("/").pop();
                const kind = message.attachment_kind || getAttachmentKind({ name: attachmentName || "", type: "" });
                const senderAvatar = getAvatarSource(message.sender);
                const isAdminMessage = message.sender?.role === "admin";
                const isDeletedForEveryone = message.isDeletedForEveryone;
                const messageClassName = [
                  "admin-chat__message",
                  isOwn ? "admin-chat__message--own" : "",
                  isAdminMessage
                    ? "admin-chat__message--admin"
                    : "admin-chat__message--user",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <article
                    className={messageClassName}
                    key={message.id}
                  >
                    <div className="admin-chat__message-avatar">
                      {senderAvatar ? (
                        <img alt="" src={senderAvatar} />
                      ) : (
                        <span>{getInitials(message.sender)}</span>
                      )}
                    </div>
                    <div className="admin-chat__bubble">
                      <div className="admin-chat__meta">
                        <div className="admin-chat__message-author">
                          <strong>{isOwn ? "Сиз" : getDisplayName(message.sender)}</strong>
                          <em>
                            {isAdminMessage ? "Администратор" : "Колдонуучу"}
                          </em>
                        </div>
                        {message.isBroadcast && !isAdmin ? (
                          <span>{formatTime(message.createdAt)}</span>
                        ) : (
                        <div className="admin-chat__message-menu-wrap">
                          <span>{formatTime(message.createdAt)}</span>
                          <button
                            aria-label="Билдирүүнү өчүрүү"
                            className="admin-chat__message-menu-button"
                            onClick={() =>
                              setDeleteMenuMessageId((currentId) =>
                                currentId === message.id ? null : message.id
                              )
                            }
                            title="Өчүрүү"
                            type="button"
                          >
                            <TrashIcon />
                          </button>
                          {deleteMenuMessageId === message.id ? (
                            <div className="admin-chat__message-menu">
                              <button
                                onClick={() => handleDeleteMessage(message, "self")}
                                type="button"
                              >
                                Өзүмдөн өчүрүү
                              </button>
                              {isOwn && !isDeletedForEveryone ? (
                                <button
                                  onClick={() => handleDeleteMessage(message, "everyone")}
                                  type="button"
                                >
                                  Баарынан өчүрүү
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        )}
                      </div>
                      {isDeletedForEveryone ? (
                        <p className="admin-chat__deleted-message">
                          Данное сообщение было удалено
                        </p>
                      ) : message.body ? (
                        <p>{message.body}</p>
                      ) : null}
                      {!isDeletedForEveryone && attachmentUrl ? (
                        kind === "image" ? (
                          <img alt={attachmentName} className="admin-chat__media" src={attachmentUrl} />
                        ) : kind === "video" ? (
                          <video className="admin-chat__media" controls src={attachmentUrl} />
                        ) : kind === "audio" ? (
                          <audio className="admin-chat__audio" controls src={attachmentUrl} />
                        ) : (
                          <a className="admin-chat__file" href={attachmentUrl} rel="noreferrer" target="_blank">
                            {attachmentName || "Вложение"}
                          </a>
                        )
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {isOutpostBroadcast && isOutpost ? (
            <div className="admin-chat__composer admin-chat__composer--readonly">
              Жалпы топко билдирүүнү администратор гана жөнөтө алат.
            </div>
          ) : (
          <form className="admin-chat__composer" onSubmit={handleSubmit}>
            <div className="admin-chat__composer-tools">
              <div className="admin-chat__emoji-wrap">
                <button
                  aria-expanded={isEmojiPickerOpen}
                  onClick={() => setIsEmojiPickerOpen((isOpen) => !isOpen)}
                  type="button"
                >
                  <SmileIcon />
                  <span>Быйтыкчалар</span>
                </button>
                {isEmojiPickerOpen ? (
                  <div className="admin-chat__emoji-picker">
                    <div className="admin-chat__emoji-tabs">
                      {EMOJI_GROUPS.map((group) => (
                        <button
                          aria-label={group.label}
                          className={activeEmojiGroup === group.id ? "is-active" : ""}
                          key={group.id}
                          onClick={() => setActiveEmojiGroup(group.id)}
                          title={group.label}
                          type="button"
                        >
                          {group.icon}
                        </button>
                      ))}
                    </div>
                    <strong>
                      {EMOJI_GROUPS.find((group) => group.id === activeEmojiGroup)?.label}
                    </strong>
                    <div className="admin-chat__emoji-grid">
                      {EMOJI_GROUPS.find((group) => group.id === activeEmojiGroup)?.emojis.map(
                        (emoji) => (
                          <button key={emoji} onClick={() => addEmoji(emoji)} type="button">
                            {emoji}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              <button
                className={isRecording ? "admin-chat__voice-button is-recording" : "admin-chat__voice-button"}
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                type="button"
              >
                {isRecording
                  ? <><StopIcon /><span>Токтотуу {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}</span></>
                  : <><MicIcon /><span>Үн билдирүү</span></>}
              </button>
            </div>
            <textarea
              placeholder="Билдирүүлөрдү жазыңыз"
              ref={messageInputRef}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
            />

            <div className="admin-chat__composer-row">
              <div className="admin-chat__file-block">
                <label className="admin-chat__file-button" htmlFor="admin-chat-file">
                  <PaperclipIcon />
                  <span>Файл тандоо</span>
                </label>
                <input
                  accept={FILE_ACCEPT}
                  className="admin-chat__file-input"
                  id="admin-chat-file"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  type="file"
                />
                <span className="admin-chat__file-name">
                  {file ? file.name : "Сүрөт, видео жана документтер"}
                </span>
                {file ? (
                  <button
                    className="admin-chat__remove-file"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    type="button"
                  >
                    <CloseIcon />
                    <span>Алып салуу</span>
                  </button>
                ) : null}
              </div>

              <button className="admin-chat__send-button" disabled={sending} type="submit">
                <SendIcon />
                <span>{sending ? "Жөнөтүлүүдө..." : "Жөнөтүү"}</span>
              </button>
            </div>

            {error ? <div className="admin-chat__error">{error}</div> : null}
          </form>
          )}
        </div>
      </div>
    </section>
  );
}
