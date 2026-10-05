import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowUp,
  ImagePlus,
  LoaderCircle,
  MessageSquareText,
  Paperclip,
  RefreshCw,
  ShieldCheck,
  Smile,
} from "lucide-react";
import supportAvatarImage from "@assets/photo_2026-05-08_18-24-58_1791221846737.jpg";
import { getAccountAvatar } from "../account-avatars.js";
import "./AccountMessages.css";

const MESSAGE_EMOJIS = [
  "😊", "😂", "❤️", "👍", "🙏", "😍", "🔥", "✅",
  "💯", "😅", "🤔", "👏", "🎉", "😢", "😎", "💪",
  "🤝", "👋", "⭐", "🚀", "😉", "🥳", "😤", "😬",
  "😆", "🫡", "🙌", "💥", "⚡", "🎯", "🫶", "😇",
  "🥰", "😋", "🤩", "😏", "😔", "😞", "😓", "🤗",
  "🫠", "😑", "🤭", "🙃", "😌", "🥹", "😀", "😃",
];

const MESSAGE_FILE_ACCEPT = ".pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf,.odt,.ods";
const EMOJI_ONLY_MESSAGE = /^(?:[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\uFE0F\u200D\u20E3]|\s)+$/u;

function isEmojiOnlyMessage(content) {
  return typeof content === "string" && content.trim().length > 0 && EMOJI_ONLY_MESSAGE.test(content.trim());
}

function formatMessageTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function formatMessageDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function getMessageContent(entry) {
  const message = entry?.msg;
  if (entry?.type === "received") return message?.admin_reply ?? message?.content ?? "";
  return message?.message ?? message?.content ?? "";
}

function MessageAvatar({ isReceived, avatarId }) {
  const accountAvatar = isReceived ? null : getAccountAvatar(avatarId);
  const image = isReceived ? supportAvatarImage : accountAvatar?.src;
  if (!image) return null;

  return (
    <span className={`account-message-avatar ${isReceived ? "is-support" : "is-user"}`} aria-hidden="true">
      <img src={image} alt="" />
    </span>
  );
}

export default function AccountMessages({
  timeline = [],
  accountEmail = "",
  avatarId = "",
  loading = false,
  error = "",
  adminIsTyping = false,
  draft = "",
  sending = false,
  attachmentUploading = false,
  scrollRef,
  onDraftChange = () => {},
  onSend = () => {},
  onSendAttachment = () => {},
  onRetry = () => {},
  renderMessageContent,
  messageDomId,
  highlightedMsgKey,
}) {
  const entries = useMemo(() => (Array.isArray(timeline) ? timeline : []), [timeline]);
  const draftInputRef = useRef(null);
  const mediaInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const composerBusy = sending || attachmentUploading;

  useEffect(() => {
    if (!emojiPickerOpen) return undefined;

    function closePickerOnOutsidePointer(event) {
      if (
        !emojiPickerRef.current?.contains(event.target) &&
        !emojiButtonRef.current?.contains(event.target)
      ) {
        setEmojiPickerOpen(false);
      }
    }

    document.addEventListener("pointerdown", closePickerOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closePickerOnOutsidePointer);
  }, [emojiPickerOpen]);

  function handleSubmit(event) {
    event.preventDefault();
    if (!draft.trim() || composerBusy) return;
    onSend();
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent?.isComposing) {
      event.preventDefault();
      if (draft.trim() && !composerBusy) onSend();
    }
  }

  function handleAttachmentSelection(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (file && !composerBusy) void onSendAttachment(file);
  }

  function insertEmoji(emoji) {
    const input = draftInputRef.current;
    const start = input?.selectionStart ?? draft.length;
    const end = input?.selectionEnd ?? draft.length;
    const nextDraft = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;

    if (nextDraft.length <= 1000) onDraftChange(nextDraft);
    setEmojiPickerOpen(false);

    if (input) {
      window.requestAnimationFrame(() => {
        input.focus();
        const cursor = nextDraft.length <= 1000 ? start + emoji.length : start;
        input.setSelectionRange(cursor, cursor);
      });
    }
  }

  function handleEmojiPickerKeyDown(event) {
    if (event.key === "Escape") {
      setEmojiPickerOpen(false);
      emojiButtonRef.current?.focus();
    }
  }

  let currentDate = "";

  return (
    <section
      className={`account-messages${emojiPickerOpen ? " account-messages--emoji-open" : ""}`}
      aria-labelledby="account-messages-title"
      data-testid="panel-account-messages"
    >
      <header className="account-messages__header">
        <div className="account-messages__heading">
          <span className="account-messages__icon" aria-hidden="true"><MessageSquareText size={21} /></span>
          <div>
            <p className="account-messages__eyebrow">Researcher support</p>
            <h2 id="account-messages-title" data-testid="text-messages-title">Messages</h2>
          </div>
        </div>
        <div className="account-messages__assurance" data-testid="status-private-support">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>Private account conversation</span>
        </div>
      </header>

      <div className="account-messages__thread" ref={scrollRef} role="log" aria-live="polite" aria-relevant="additions text" data-testid="conversation-thread">
        {loading && entries.length === 0 && !error ? (
          <div className="account-messages__loading" aria-label="Loading messages" data-testid="status-messages-loading">
            <div className="account-message-skeleton account-message-skeleton--received" />
            <div className="account-message-skeleton account-message-skeleton--sent" />
            <div className="account-message-skeleton account-message-skeleton--received" />
            <span>Loading your conversation…</span>
          </div>
        ) : error && entries.length === 0 ? (
          <div className="account-messages__state account-messages__state--error" role="alert" data-testid="status-messages-error">
            <span className="account-messages__state-icon"><AlertCircle size={20} /></span>
            <h3>Your messages aren’t available right now</h3>
            <p>{typeof error === "string" ? error : "We couldn’t load your conversation. Please try again."}</p>
            <button className="account-messages__retry" type="button" onClick={onRetry} data-testid="button-retry-messages">
              <RefreshCw size={15} /> Try again
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="account-messages__state" data-testid="status-messages-empty">
            <span className="account-messages__empty-mark" aria-hidden="true">
              <MessageSquareText size={23} />
              <i />
            </span>
            <p className="account-messages__empty-kicker">A direct line to our team</p>
            <h3>Start a conversation</h3>
            <p>Ask about an order, delivery, or a product. Our support team will reply here.</p>
          </div>
        ) : (
          <div className="account-messages__list" data-testid="list-conversation-messages">
            {error && (
              <div className="account-messages__inline-error" role="alert" data-testid="status-messages-refresh-error">
                <span>{error}</span>
                <button type="button" onClick={onRetry} data-testid="button-retry-messages-inline">Try again</button>
              </div>
            )}
            {entries.map((entry, index) => {
              const isReceived = entry.type === "received";
              const msg = entry.msg || {};
              const content = getMessageContent(entry);
              const emojiOnly = isEmojiOnlyMessage(content);
              const dateLabel = formatMessageDate(entry.time);
              const showDate = dateLabel && dateLabel !== currentDate;
              currentDate = dateLabel || currentDate;
              const uniqueId = msg.id ?? `${entry.type}-${entry.time ?? index}-${index}`;
              const messageSide = isReceived ? "reply" : "msg";
              const targetId = typeof messageDomId === "function" ? messageDomId(msg.id, messageSide) : undefined;
              return (
                <div className="account-messages__event" key={`${entry.type}-${uniqueId}-${index}`} data-testid={`message-event-${uniqueId}`}>
                  {showDate && <div className="account-messages__date" data-testid={`text-message-date-${index}`}><span>{dateLabel}</span></div>}
                  <article
                    id={targetId}
                    className={`account-message${isReceived ? " is-received" : " is-sent"}${targetId && highlightedMsgKey === targetId ? " is-highlighted" : ""}`}
                    data-testid={`message-bubble-${uniqueId}`}
                  >
                    <MessageAvatar isReceived={isReceived} avatarId={avatarId} />
                    <div className="account-message__body">
                      <div className="account-message__meta">
                        {isReceived && <strong>10BottleSupport</strong>}
                        <time dateTime={entry.time || undefined} data-testid={`text-message-time-${uniqueId}`}>
                          {formatMessageTime(entry.time)}
                        </time>
                      </div>
                      <div
                        className={`account-message__content${emojiOnly ? " account-message__content--emoji-only" : ""}`}
                        data-testid={`text-message-content-${uniqueId}`}
                      >
                        {typeof renderMessageContent === "function" ? renderMessageContent(content) : content}
                      </div>
                    </div>
                  </article>
                </div>
              );
            })}
            {adminIsTyping && (
              <div className="account-messages__typing" role="status" data-testid="status-support-typing">
                <span className="account-messages__typing-dots" aria-hidden="true"><i /><i /><i /></span>
                <span>Support is typing</span>
              </div>
            )}
          </div>
        )}
      </div>

      {adminIsTyping && entries.length === 0 && (
        <div className="account-messages__typing account-messages__typing--outside" role="status" data-testid="status-support-typing">
          <span className="account-messages__typing-dots" aria-hidden="true"><i /><i /><i /></span>
          <span>Support is typing</span>
        </div>
      )}

      <form className="account-messages__composer" onSubmit={handleSubmit} data-testid="form-message-composer">
        <input
          ref={mediaInputRef}
          className="account-messages__file-input"
          type="file"
          accept="image/*,video/*"
          onChange={handleAttachmentSelection}
          disabled={composerBusy}
          data-testid="input-message-media"
        />
        <input
          ref={fileInputRef}
          className="account-messages__file-input"
          type="file"
          accept={MESSAGE_FILE_ACCEPT}
          onChange={handleAttachmentSelection}
          disabled={composerBusy}
          data-testid="input-message-file"
        />
        <div className="account-messages__compose-row">
          <div className="account-messages__compose-main">
            <textarea
              ref={draftInputRef}
              id="account-message-draft"
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="How can we help?"
              rows={2}
              maxLength={1000}
              aria-label={`Message support${accountEmail ? ` as ${accountEmail}` : ""}`}
              data-testid="input-message-draft"
            />
            {emojiPickerOpen && (
              <div
                ref={emojiPickerRef}
                className="account-messages__emoji-picker"
                id="account-message-emoji-picker"
                role="dialog"
                aria-label="Choose an emoji"
                onKeyDown={handleEmojiPickerKeyDown}
                data-testid="message-emoji-picker"
              >
                {MESSAGE_EMOJIS.map((emoji, index) => (
                  <button
                    key={`${emoji}-${index}`}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    aria-label={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <div className="account-messages__compose-tools">
              <div className="account-messages__tool-group">
                <button
                  type="button"
                  className="account-messages__tool-button"
                  onClick={() => mediaInputRef.current?.click()}
                  disabled={composerBusy}
                  aria-label="Add a photo or video"
                  title="Add a photo or video"
                  data-testid="button-message-media"
                >
                  <ImagePlus size={17} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="account-messages__tool-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={composerBusy}
                  aria-label="Attach a file"
                  title="Attach a file"
                  data-testid="button-message-file"
                >
                  <Paperclip size={17} aria-hidden="true" />
                </button>
                <button
                  ref={emojiButtonRef}
                  type="button"
                  className="account-messages__tool-button"
                  onClick={() => setEmojiPickerOpen((open) => !open)}
                  aria-label={emojiPickerOpen ? "Close emoji picker" : "Open emoji picker"}
                  aria-haspopup="dialog"
                  aria-expanded={emojiPickerOpen}
                  aria-controls="account-message-emoji-picker"
                  title="Emoji"
                  data-testid="button-message-emoji"
                >
                  <Smile size={17} aria-hidden="true" />
                </button>
                {attachmentUploading && (
                  <span
                    className="account-messages__upload-status"
                    role="status"
                    aria-label="Uploading attachment"
                    data-testid="status-message-uploading"
                  >
                    <LoaderCircle size={16} aria-hidden="true" />
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="submit"
            className="account-messages__send"
            disabled={!draft.trim() || composerBusy}
            aria-label={sending ? "Sending message" : "Send message"}
            data-testid="button-send-message"
          >
            {sending ? <span className="account-messages__send-pulse" aria-hidden="true"><i /><i /><i /></span> : <ArrowUp size={19} strokeWidth={2.2} />}
          </button>
        </div>
      </form>
    </section>
  );
}
