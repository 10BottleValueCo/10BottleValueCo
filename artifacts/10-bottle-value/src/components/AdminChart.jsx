import {
  Area,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function ProfitTooltip({ active, payload, fmtDay, fmtMoney }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;

  return (
    <div
      style={{
        background: "#161b22",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        padding: "10px 14px",
        minWidth: 170,
      }}
    >
      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginBottom: 4 }}>
        {fmtDay(point.date)}
      </div>
      <div style={{ color: "#16c784", fontWeight: 700, fontSize: 15 }}>
        {fmtMoney(point.profit)} profit
      </div>
      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 }}>
        {fmtMoney(point.revenue)} revenue · {point.orders} orders
      </div>
    </div>
  );
}

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const revenue = payload.find((item) => item.dataKey === "revenue");
  const orders = payload.find((item) => item.dataKey === "orders");

  return (
    <div
      style={{
        background: "#0d1117",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 14,
        padding: "12px 16px",
        minWidth: 160,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.4)",
          marginBottom: 8,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      {revenue && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 14, marginBottom: 4 }}>
          <span style={{ color: "#16c784" }}>Revenue</span>
          <span style={{ fontWeight: 700, color: "#fff" }}>
            ${revenue.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
      {orders && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 13 }}>
          <span style={{ color: "rgba(255,255,255,0.4)" }}>Orders</span>
          <span style={{ color: "#fff" }}>{orders.value}</span>
        </div>
      )}
    </div>
  );
}

function AovTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const aov = payload.find((item) => item.dataKey === "aov");
  const orders = payload.find((item) => item.dataKey === "orders");

  return (
    <div
      style={{
        background: "#0d1117",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 14,
        padding: "12px 16px",
        minWidth: 160,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.4)",
          marginBottom: 8,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      {aov && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 14, marginBottom: 4 }}>
          <span style={{ color: "#f59e0b" }}>AOV</span>
          <span style={{ fontWeight: 700, color: "#fff" }}>
            ${aov.value.toLocaleString("en-US")}
          </span>
        </div>
      )}
      {orders && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 13 }}>
          <span style={{ color: "rgba(255,255,255,0.4)" }}>Orders</span>
          <span style={{ color: "#fff" }}>{orders.value}</span>
        </div>
      )}
    </div>
  );
}

export default function AdminChart({ kind, data, tickInterval, fmtDay, fmtMoney }) {
  const isProfit = kind === "profit";
  const isAov = kind === "aov";
  const visibleData = isAov ? data.filter((point) => point.orders > 0) : data;
  const dataKey = isProfit ? "profit" : isAov ? "aov" : "revenue";
  const color = isAov ? "#f59e0b" : "#16c784";
  const gradientId = isProfit ? "gProfit" : isAov ? "gAov" : "gRev";
  const tooltip = isProfit
    ? <ProfitTooltip fmtDay={fmtDay} fmtMoney={fmtMoney} />
    : isAov
    ? <AovTooltip />
    : <RevenueTooltip />;
  const xInterval = isAov
    ? Math.max(0, Math.floor(visibleData.length / 10) - 1)
    : tickInterval;

  return (
    <ResponsiveContainer width="100%" height={isProfit ? 240 : isAov ? 240 : 300}>
      <ComposedChart
        data={visibleData}
        margin={{ top: 10, right: 0, left: 0, bottom: 4 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={isAov ? 0.35 : 0.45} />
            <stop offset={isProfit ? "60%" : "55%"} stopColor={color} stopOpacity={isAov ? 0.07 : isProfit ? 0.08 : 0.1} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey={isProfit ? "date" : "label"}
          tickFormatter={isProfit ? fmtDay : undefined}
          interval={xInterval}
          tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          dy={8}
        />
        <YAxis
          orientation="right"
          tickFormatter={(value) => {
            if (isProfit || kind === "revenue") {
              return value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`;
            }
            return `$${value}`;
          }}
          tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
          tickCount={isAov ? 4 : 5}
        />
        <Tooltip
          content={tooltip}
          cursor={{
            stroke: "rgba(255,255,255,0.12)",
            strokeWidth: 1,
            strokeDasharray: "3 3",
          }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, fill: color, stroke: "#0d1117", strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
