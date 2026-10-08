import "./PeptigrityMark.css";

export default function PeptigrityMark({ className = "" }) {
  return (
    <span className={`tbv-peptigrity-mark ${className}`} aria-hidden="true">
      Pg
    </span>
  );
}
