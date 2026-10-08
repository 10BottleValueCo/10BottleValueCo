import { useState } from "react";
import "./_group.css";
import AccountDashboard from "./_AccountDashboard";

type AccountSection = "overview" | "orders" | "messages" | "shipping" | "security";

const sectionContent: Record<Exclude<AccountSection, "overview">, { title: string; body: string }> = {
  orders: { title: "Your orders", body: "Order history and tracking details appear here." },
  messages: { title: "Messages", body: "Customer support conversations appear here." },
  shipping: { title: "Shipping details", body: "Manage the address used for checkout." },
  security: { title: "Security", body: "Manage your account password and security." },
};

function AccountPreview({ variantClass = "" }: { variantClass?: string }) {
  const [activeSection, setActiveSection] = useState<AccountSection>("overview");
  const tx = (...values: string[]) => values[0];
  const detail = activeSection === "overview" ? null : sectionContent[activeSection];

  return (
    <div className={variantClass}>
      <AccountDashboard
        user={{ firstName: "Alex", lastName: "Researcher", email: "researcher@example.com" }}
        orders={[]}
        storeCredit={0}
        hasUnreadReply={false}
        activeSection={activeSection}
        tx={tx}
        formatPrice={(amount: number) => "$" + amount.toFixed(2)}
        onNavigate={(section: AccountSection) => setActiveSection(section)}
        onOpenMessages={() => setActiveSection("messages")}
        onEditProfile={() => setActiveSection("shipping")}
        onShopNow={() => {}}
        onSignOut={() => {}}
      >
        {detail && (
          <section className="lab-panel" style={{ minHeight: 240, padding: 24 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>{detail.title}</h2>
            <p style={{ color: "rgba(236, 240, 244, 0.7)", lineHeight: 1.55 }}>{detail.body}</p>
          </section>
        )}
      </AccountDashboard>
    </div>
  );
}

export function Current() {
  return <AccountPreview />;
}
