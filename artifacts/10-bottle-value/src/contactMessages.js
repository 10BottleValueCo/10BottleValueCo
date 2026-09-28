const PAGE_SIZE = 500;

export function hasContactEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export function buildContactTimeline(messages) {
  const timeline = [];
  for (const message of messages) {
    if (message.message !== "[Admin initiated message]") {
      timeline.push({ type: "sent", timestamp: message.created_at, message });
    }
    if (message.admin_reply) {
      timeline.push({
        type: "reply",
        timestamp: message.replied_at || message.created_at,
        message,
      });
    }
  }
  return timeline.sort((a, b) =>
    (Date.parse(a.timestamp) || 0) - (Date.parse(b.timestamp) || 0) ||
    String(a.message.id).localeCompare(String(b.message.id)) ||
    (a.type === "sent" ? -1 : 1)
  );
}

export async function fetchContactMessages(supabase, email) {
  const messages = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = supabase.from("contact_messages").select("*");
    if (email) query = query.eq("email", email);
    const { data, error } = await query
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    messages.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return messages;
  }
}