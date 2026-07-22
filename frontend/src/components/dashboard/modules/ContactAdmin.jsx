import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  createAdminChatMessage,
  deleteAdminChatMessage,
  getAdminChatMessages,
  getChatPartners,
} from "../../../api/dashboard.js";

const FILE_ACCEPT =
  "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.zip,.rar";
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

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getDisplayName = (item) => item?.full_name || item?.email || `Пользователь #${item?.id || ""}`;

const getInitials = (item) =>
  getDisplayName(item)
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "А";

const getAvatarSource = (item) => item?.avatar || item?.photo_face || "";

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

export default function ContactAdmin({ user, onRefresh }) {
  const isAdmin = user?.role === "admin";
  const isOutpost = user?.role === "outpost";
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedAdminGroup, setSelectedAdminGroup] = useState("regional");
  const [body, setBody] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [activeEmojiGroup, setActiveEmojiGroup] = useState(EMOJI_GROUPS[0].id);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [deleteMenuMessageId, setDeleteMenuMessageId] = useState(null);

  const selectedPartner = useMemo(
    () => users.find((item) => String(item.id) === String(selectedUserId)),
    [selectedUserId, users]
  );
  const displayedUsers = useMemo(
    () => isAdmin
      ? users.filter((item) => item.role === selectedAdminGroup)
      : users,
    [isAdmin, selectedAdminGroup, users]
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
  const adminGroupUnreadCounts = useMemo(
    () => users.reduce(
      (counts, item) => {
        const count = Number(item.unreadChatCount || unreadCounts[String(item.id)] || 0);
        if (item.role === "regional" || item.role === "outpost") {
          counts[item.role] += count;
        }
        return counts;
      },
      { regional: 0, outpost: 0 }
    ),
    [unreadCounts, users]
  );

  const visibleMessages = useMemo(() => {
    if (!selectedUserId) {
      return messages;
    }

    return messages.filter(
      (message) =>
        String(message.sender?.id) === String(selectedUserId) ||
        String(message.recipient?.id) === String(selectedUserId)
    );
  }, [messages, selectedUserId]);

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
        filtered = [admin, regional].filter(Boolean);
      }
      setUsers(filtered);
      setSelectedUserId((current) => {
        if (current && filtered.some((item) => String(item.id) === String(current))) {
          return current;
        }
        const firstPartner = isAdmin
          ? filtered.find((item) => item.role === selectedAdminGroup)
          : filtered[0];
        return firstPartner ? String(firstPartner.id) : "";
      });
    } catch {
      setUsers([]);
    }
  };

  const loadMessages = async (partnerId = selectedUserId) => {
    setLoading(true);
    setError("");

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
      setError(requestError?.response?.data?.detail || "Не удалось загрузить сообщения.");
    } finally {
      setLoading(false);
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
      setError("Введите текст или добавьте вложение.");
      return;
    }

    if (isRecording) {
      setError("Үн жаздырууну токтотуңуз.");
      return;
    }

    if (!selectedUserId) {
      setError("Выберите пользователя.");
      return;
    }

    setSending(true);
    setError("");

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
      formData.append("recipientId", selectedUserId);

      await createAdminChatMessage(formData);
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
        "Не удалось отправить сообщение.";
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
          <p>{isAdmin ? "Переписка с пользователями" : "Байланыш"}</p>
          <h1>Администратор менен байланыш</h1>
          <span className="admin-chat__subtitle">
            {isAdmin
              ? "Выберите пользователя слева и пишите сообщение справа."
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
              <UsersIcon /> {isOutpost ? "Кимге жазуу" : "Пользователи"}
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
                  {adminGroupUnreadCounts.regional > 0 ? (
                    <em>{adminGroupUnreadCounts.regional}</em>
                  ) : null}
                </button>
                <button
                  className={selectedAdminGroup === "outpost" ? "is-active" : ""}
                  onClick={() => {
                    setSelectedAdminGroup("outpost");
                    const firstOutpost = users.find((item) => item.role === "outpost");
                    setSelectedUserId(firstOutpost ? String(firstOutpost.id) : "");
                  }}
                  type="button"
                >
                  Застава
                  {adminGroupUnreadCounts.outpost > 0 ? (
                    <em>{adminGroupUnreadCounts.outpost}</em>
                  ) : null}
                </button>
              </div>
            ) : null}
            <div className="admin-chat__user-list">
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
                    : "Выберите человека слева"}
                </span>
              </div>
            </div>
          </div>

          <div className="admin-chat__messages" ref={messagesContainerRef}>
            {loading ? (
              <div className="admin-chat__empty">Загрузка сообщений...</div>
            ) : visibleMessages.length === 0 ? (
              <div className="admin-chat__empty">Сообщений пока нет.</div>
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

          <form className="admin-chat__composer" onSubmit={handleSubmit}>
            <div className="admin-chat__composer-tools">
              <div className="admin-chat__emoji-wrap">
                <button
                  aria-expanded={isEmojiPickerOpen}
                  onClick={() => setIsEmojiPickerOpen((isOpen) => !isOpen)}
                  type="button"
                >
                  <SmileIcon />
                  <span>Эмодзи</span>
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
              placeholder="Напишите сообщение..."
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
        </div>
      </div>
    </section>
  );
}
