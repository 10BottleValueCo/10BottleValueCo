export default function UsFlag({ className = "" }) {
  return (
    <svg
      width="14"
      height="10"
      viewBox="0 0 19 10"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="19" height="10" fill="#fff" />
      <path d="M0 0h19v1H0zm0 2h19v1H0zm0 2h19v1H0zm0 2h19v1H0zm0 2h19v1H0z" fill="#B22234" />
      <rect width="8" height="5.5" fill="#3C3B6E" />
      <path d="M1.5 1.1h.5m1.5 0H4m1.5 0H6m-3.5 1.5H3m1.5 0H5m1.5 0H7m-5.5 1.5H2m1.5 0H4m1.5 0H6" stroke="#fff" strokeWidth=".55" strokeLinecap="round" />
    </svg>
  );
}