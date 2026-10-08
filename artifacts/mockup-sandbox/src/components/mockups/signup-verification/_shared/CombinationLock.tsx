export function CombinationLock() {
  return (
    <div
      className="self-center shrink-0 cursor-pointer select-none"
      title="Click to crack"
      onClick={(event) => {
        event.currentTarget.querySelectorAll(".tbv-dial").forEach((dial, index) => {
          const digit = Math.floor(Math.random() * 10);
          const targetY = -(20 + digit) * 18;
          dial.getAnimations().forEach((animation) => animation.cancel());
          dial.animate(
            [{ transform: "translateY(0)" }, { transform: `translateY(${targetY}px)` }],
            {
              duration: 1300 + index * 200,
              delay: index * 140,
              easing: "cubic-bezier(0.03,0.9,0.2,1.0)",
              fill: "forwards",
            },
          );
        });
      }}
    >
      <svg width="48" height="60" viewBox="0 0 48 60" fill="none">
        <defs>
          <linearGradient id="lkBrass2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#EDD050" />
            <stop offset="45%" stopColor="#C9A020" />
            <stop offset="100%" stopColor="#8B6010" />
          </linearGradient>
          <linearGradient id="lkSteel2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#999" />
            <stop offset="40%" stopColor="#eee" />
            <stop offset="100%" stopColor="#777" />
          </linearGradient>
          <linearGradient id="lkShadow2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,0,0,0.65)" />
            <stop offset="25%" stopColor="rgba(0,0,0,0.04)" />
            <stop offset="75%" stopColor="rgba(0,0,0,0.04)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.65)" />
          </linearGradient>
        </defs>
        <path
          d="M15 27 L15 16 Q15 5 24 5 Q33 5 33 16 L33 27"
          stroke="url(#lkSteel2)"
          strokeWidth="4.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M18 27 L18 17 Q18 10 24 10 Q30 10 30 17 L30 27"
          stroke="rgba(0,0,0,0.18)"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
        <rect x="3" y="25" width="42" height="33" rx="5" fill="url(#lkBrass2)" />
        <rect x="5" y="27" width="38" height="3" rx="1.5" fill="rgba(255,245,120,0.28)" />
        <rect x="5" y="52" width="38" height="4" rx="2" fill="rgba(0,0,0,0.16)" />
        <rect
          x="7"
          y="31"
          width="34"
          height="22"
          rx="2.5"
          fill="rgba(0,0,0,0.48)"
          stroke="rgba(0,0,0,0.4)"
          strokeWidth="0.8"
        />
        <rect x="8" y="33" width="10" height="18" rx="1.5" fill="#0d0d0d" />
        <rect x="19" y="33" width="10" height="18" rx="1.5" fill="#0d0d0d" />
        <rect x="30" y="33" width="10" height="18" rx="1.5" fill="#0d0d0d" />
        {[8, 19, 30].map((x) => (
          <foreignObject key={x} x={x} y="33" width="10" height="18" overflow="hidden">
            <div
              className="tbv-dial"
              style={{
                fontFamily: "'Courier New', monospace",
                fontWeight: 900,
                fontSize: 14,
                color: "#f0f0f0",
                textAlign: "center",
                lineHeight: "18px",
                userSelect: "none",
              }}
            >
              {"012345678901234567890123456789".split("").map((digit, index) => (
                <div key={index} style={{ height: 18 }}>
                  {digit}
                </div>
              ))}
            </div>
          </foreignObject>
        ))}
        <rect
          x="7"
          y="31"
          width="34"
          height="22"
          rx="2.5"
          fill="url(#lkShadow2)"
          pointerEvents="none"
        />
        <rect x="18.5" y="32" width="1" height="20" fill="rgba(0,0,0,0.55)" />
        <rect x="29.5" y="32" width="1" height="20" fill="rgba(0,0,0,0.55)" />
        <circle
          cx="8"
          cy="55"
          r="2.5"
          fill="rgba(0,0,0,0.22)"
          stroke="rgba(200,160,0,0.4)"
          strokeWidth="0.7"
        />
        <circle
          cx="40"
          cy="55"
          r="2.5"
          fill="rgba(0,0,0,0.22)"
          stroke="rgba(200,160,0,0.4)"
          strokeWidth="0.7"
        />
        <line x1="6.5" y1="55" x2="9.5" y2="55" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
        <line x1="8" y1="53.5" x2="8" y2="56.5" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
        <line x1="38.5" y1="55" x2="41.5" y2="55" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
        <line x1="40" y1="53.5" x2="40" y2="56.5" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
      </svg>
    </div>
  );
}
