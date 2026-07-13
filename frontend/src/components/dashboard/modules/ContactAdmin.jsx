import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  createAdminChatMessage,
  getAdminChatMessages,
  getScopedUsers,
} from "../../../api/dashboard.js";

const FILE_ACCEPT =
  "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.zip,.rar";
const EMOJIS = ["😀", "😂", "😊", "😍", "👍", "👏", "🙏", "🎉", "❤️", "🔥", "✅", "👋"];

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

export default function ContactAdmin({ user, onRefresh }) {
  const isAdmin = user?.role === "admin";
  const isUser = !isAdmin;
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const selectedPartner = useMemo(
    () => users.find((item) => String(item.id) === String(selectedUserId)),
    [selectedUserId, users]
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
    () => Object.values(unreadCounts).reduce((sum, value) => sum + value, 0),
    [unreadCounts]
  );

  const visibleMessages = useMemo(() => {
    if (!isAdmin || !selectedUserId) {
      return messages;
    }

    return messages.filter(
      (message) =>
        String(message.sender?.id) === String(selectedUserId) ||
        String(message.recipient?.id) === String(selectedUserId)
    );
  }, [isAdmin, messages, selectedUserId]);

  const chatPartner = useMemo(() => {
    if (isAdmin) {
      return selectedPartner;
    }

    for (const message of messages) {
      if (
        message.sender?.role === "admin" &&
        String(message.sender.id) !== String(user?.id)
      ) {
        return message.sender;
      }
      if (
        message.recipient?.role === "admin" &&
        String(message.recipient.id) !== String(user?.id)
      ) {
        return message.recipient;
      }
    }

    return null;
  }, [isAdmin, messages, selectedPartner, user?.id]);

  const loadUsers = async () => {
    if (!isAdmin) {
      return;
    }

    try {
      const data = await getScopedUsers();
      const filtered = Array.isArray(data) ? data.filter((item) => item.role !== "admin") : [];
      setUsers(filtered);
      setSelectedUserId((current) => current || (filtered[0] ? String(filtered[0].id) : ""));
    } catch {
      setUsers([]);
    }
  };

  const loadMessages = async (partnerId = selectedUserId) => {
    setLoading(true);
    setError("");

    try {
      const params = isAdmin && partnerId ? { user_id: partnerId } : undefined;
      const data = await getAdminChatMessages(params);
      setMessages(Array.isArray(data) ? data : []);
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
    if (isAdmin && !selectedUserId && users.length > 0) {
      setSelectedUserId(String(users[0].id));
      return;
    }

    loadMessages(selectedUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, isAdmin]);

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
    setIsEmojiPickerOpen(false);
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

    if (isAdmin && !selectedUserId) {
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
      if (isAdmin) {
        formData.append("recipientId", selectedUserId);
      }

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

  const currentThreadName = chatPartner
    ? getDisplayName(chatPartner)
    : isAdmin
      ? "Колдонуучуну тандаңыз"
      : "Администратор";
  const partnerAvatar = getAvatarSource(chatPartner);

  return (
    <section className="module-panel admin-chat">
      <header className="module-header">
        <div>
          <p>{isAdmin ? "Переписка с пользователями" : "Связь с администратором"}</p>
          <h1>Администратор менен байланыш</h1>
          <span className="admin-chat__subtitle">
            {isAdmin
              ? "Выберите пользователя слева и пишите сообщение справа."
              : "Можно отправлять текст, фото, видео и документы."}
          </span>
        </div>
        {totalUnreadCount > 0 ? <div className="admin-chat__counter">Новых: {totalUnreadCount}</div> : null}
      </header>

      <div className={isUser ? "admin-chat__layout admin-chat__layout--user" : "admin-chat__layout"}>
        {isAdmin && (
          <aside className="admin-chat__sidebar">
            <strong>Пользователи</strong>
            <div className="admin-chat__user-list">
              {users.length === 0 ? (
                <span className="admin-chat__empty">Нет активных пользователей.</span>
              ) : (
                users.map((item) => (
                  <button
                    key={item.id}
                    className={String(selectedUserId) === String(item.id) ? "is-active" : ""}
                    onClick={() => setSelectedUserId(String(item.id))}
                    type="button"
                  >
                    <span className="admin-chat__user-title">
                      {getDisplayName(item)}
                      {unreadCounts[String(item.id)] ? (
                        <em className="admin-chat__badge">{unreadCounts[String(item.id)]}</em>
                      ) : null}
                    </span>
                    <small>{item.outpost_name || item.region || item.email}</small>
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
                  {isAdmin
                    ? selectedPartner
                      ? selectedPartner.email
                      : "Выберите человека слева"
                    : "Ваши сообщения сохраняются"}
                </span>
              </div>
            </div>
          </div>

          <div className="admin-chat__messages">
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

                return (
                  <article
                    className={isOwn ? "admin-chat__message admin-chat__message--own" : "admin-chat__message"}
                    key={message.id}
                  >
                    <div className="admin-chat__bubble">
                      <div className="admin-chat__meta">
                        <strong>{isOwn ? "Вы" : getDisplayName(message.sender)}</strong>
                        <span>{formatTime(message.createdAt)}</span>
                      </div>
                      {message.body ? <p>{message.body}</p> : null}
                      {attachmentUrl ? (
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
                  😊 Эмодзи
                </button>
                {isEmojiPickerOpen ? (
                  <div className="admin-chat__emoji-picker">
                    {EMOJIS.map((emoji) => (
                      <button key={emoji} onClick={() => addEmoji(emoji)} type="button">
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                className={isRecording ? "admin-chat__voice-button is-recording" : "admin-chat__voice-button"}
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                type="button"
              >
                {isRecording
                  ? `⏹ Токтотуу ${String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:${String(recordingSeconds % 60).padStart(2, "0")}`
                  : "🎤 Үн билдирүү"}
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
                  Выбрать файл
                </label>
                <input
                  accept={FILE_ACCEPT}
                  className="admin-chat__file-input"
                  id="admin-chat-file"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  type="file"
                />
                <span>{file ? file.name : "Фото, видео, документы"}</span>
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
                    Убрать
                  </button>
                ) : null}
              </div>

              <button className="admin-chat__send-button" disabled={sending} type="submit">
                {sending ? "Отправка..." : "Отправить"}
              </button>
            </div>

            {error ? <div className="admin-chat__error">{error}</div> : null}
          </form>
        </div>
      </div>
    </section>
  );
}
