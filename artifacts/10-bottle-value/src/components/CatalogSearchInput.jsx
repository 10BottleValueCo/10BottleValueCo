import { useEffect, useState } from "react";

const SEARCH_COMMIT_DELAY_MS = 160;

export default function CatalogSearchInput({
  value,
  onSearch,
  placeholder,
  clearLabel,
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (draft === value) return undefined;

    // Keep the text currently being typed local. A delayed parent update from
    // an earlier debounce must not overwrite a newer keystroke.
    const timeout = window.setTimeout(() => onSearch(draft), SEARCH_COMMIT_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [draft, onSearch, value]);

  return (
    <div className="relative flex items-center gap-2 rounded-full border border-white/20 bg-black/15 px-3 py-2 lg:px-4 lg:py-3">
      <span aria-hidden="true" className="text-sm text-white/60 lg:text-base">
        ⌕
      </span>
      <input
        aria-label={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent pr-5 text-xs text-white outline-none placeholder:text-white lg:text-sm"
      />
      {draft && (
        <button
          type="button"
          onClick={() => setDraft("")}
          aria-label={clearLabel}
          className="absolute right-3 z-50 text-xl text-white/60 transition hover:text-white lg:right-4"
        >
          ×
        </button>
      )}
    </div>
  );
}
