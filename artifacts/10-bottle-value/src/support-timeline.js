// Replies are stored on their original message row, but may arrive much later.
// Sort bubbles by when each event happened, not by the row's creation time.
export function buildSupportTimeline(messages) {
  return messages.flatMap((msg) => [
    ...(msg.message === "[Admin initiated message]"
      ? []
      : [{ type: "sent", msg, time: msg.created_at }]),
    ...(msg.admin_reply
      ? [{ type: "received", msg, time: msg.replied_at || msg.created_at }]
      : []),
  ]).sort((a, b) => new Date(a.time) - new Date(b.time));
}