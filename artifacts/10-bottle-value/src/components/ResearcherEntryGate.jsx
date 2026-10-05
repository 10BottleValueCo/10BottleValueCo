import { useEffect, useRef, useState } from "react";

const ACCEPTANCE_KEY = "tbv-researcher-entry-accepted-v1";

const confirmations = [
  {
    name: "age",
    text: "I confirm that I am at least 21 years old.",
  },
  {
    name: "research",
    text: "I am a qualified researcher and will use these products only for in-vitro laboratory research, not for human or veterinary use.",
  },
  {
    name: "terms",
    text: "I have read and agree to the Terms of Sale.",
    link: { href: "/terms-and-conditions", label: "Terms of Sale" },
  },
  {
    name: "privacy",
    text: "I have read and agree to the Privacy Policy.",
    link: { href: "/privacy-policy", label: "Privacy Policy" },
  },
];

const researcherTypes = [
  { value: "academic", label: "Academic or university researcher" },
  { value: "laboratory", label: "Laboratory scientist or technician" },
  { value: "biotech", label: "Biotechnology or pharmaceutical researcher" },
  { value: "medical", label: "Clinical or medical researcher" },
  { value: "other", label: "Other qualified researcher" },
];

export function hasResearcherEntryAcceptance() {
  try {
    return window.localStorage.getItem(ACCEPTANCE_KEY) === "accepted";
  } catch {
    return false;
  }
}

export default function ResearcherEntryGate({ onAccept }) {
  const [researcherType, setResearcherType] = useState("");
  const [checked, setChecked] = useState({});
  const [declined, setDeclined] = useState(false);
  const [isResearcherTypeOpen, setIsResearcherTypeOpen] = useState(false);
  const [activeResearcherTypeIndex, setActiveResearcherTypeIndex] = useState(0);
  const researcherTypeRef = useRef(null);
  const selectedResearcherTypeIndex = researcherTypes.findIndex(
    ({ value }) => value === researcherType
  );

  const canEnter =
    Boolean(researcherType) &&
    confirmations.every(({ name }) => checked[name] === true);

  useEffect(() => {
    if (!isResearcherTypeOpen) return undefined;

    const closeOnOutsidePointer = (event) => {
      if (!researcherTypeRef.current?.contains(event.target)) {
        setIsResearcherTypeOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [isResearcherTypeOpen]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const openResearcherTypeMenu = (direction = "down") => {
    const openedWithUpArrow = direction === "up" || direction === -1;
    const initialIndex =
      selectedResearcherTypeIndex >= 0
        ? selectedResearcherTypeIndex
        : openedWithUpArrow
        ? researcherTypes.length - 1
        : 0;
    setActiveResearcherTypeIndex(initialIndex);
    setIsResearcherTypeOpen(true);
  };

  const chooseResearcherType = (value) => {
    setResearcherType(value);
    setIsResearcherTypeOpen(false);
  };

  const handleResearcherTypeKeyDown = (event) => {
    const moveActiveOption = (direction) => {
      event.preventDefault();
      if (!isResearcherTypeOpen) {
        openResearcherTypeMenu(direction);
        return;
      }
      setActiveResearcherTypeIndex((currentIndex) =>
        (currentIndex + direction + researcherTypes.length) % researcherTypes.length
      );
    };

    if (event.key === "ArrowDown") {
      moveActiveOption(1);
    } else if (event.key === "ArrowUp") {
      moveActiveOption(-1);
    } else if (event.key === "Home" && isResearcherTypeOpen) {
      event.preventDefault();
      setActiveResearcherTypeIndex(0);
    } else if (event.key === "End" && isResearcherTypeOpen) {
      event.preventDefault();
      setActiveResearcherTypeIndex(researcherTypes.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isResearcherTypeOpen) {
        chooseResearcherType(researcherTypes[activeResearcherTypeIndex].value);
      } else {
        openResearcherTypeMenu();
      }
    } else if (event.key === "Escape" && isResearcherTypeOpen) {
      event.preventDefault();
      setIsResearcherTypeOpen(false);
    } else if (event.key === "Tab") {
      setIsResearcherTypeOpen(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canEnter) return;

    try {
      window.localStorage.setItem(ACCEPTANCE_KEY, "accepted");
    } catch {
      // Keep entry usable when browser storage is disabled; acceptance remains
      // active for this page session through the parent component state.
    }
    onAccept();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-black/65 px-4 py-6 backdrop-blur-[10px] sm:px-6">
      <section
        aria-labelledby="researcher-entry-title"
        aria-modal="true"
        className="my-auto w-full max-w-[620px] rounded-[22px] border border-white/20 bg-[#555]/95 px-5 py-6 text-white uppercase shadow-[0_28px_90px_rgba(0,0,0,0.55)] sm:px-9 sm:py-8"
        role="dialog"
      >
        <div className="mb-6 text-center">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55">
            10BottleValue.co
          </p>
          <h1
            className="text-2xl font-semibold tracking-tight sm:text-[30px]"
            id="researcher-entry-title"
          >
            {declined ? "Access restricted" : "Researcher verification"}
          </h1>
        </div>

        {declined ? (
          <div className="text-center">
            <p className="mx-auto max-w-[440px] text-sm leading-6 text-white/80">
              This site is restricted to qualified researchers and laboratories.
              You cannot enter unless you meet the stated requirements.
            </p>
            <button
              className="mt-7 rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold uppercase transition hover:bg-white/10"
              onClick={() => setDeclined(false)}
              type="button"
            >
              Return to verification
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="mb-6 text-center text-sm leading-6 text-white/80">
              Access is restricted to qualified researchers and laboratories.
              Products are for in-vitro laboratory research only and are not for
              human or veterinary use.
            </p>

            <div className="mb-6">
              <div
                className="block text-sm font-medium text-white/90"
                id="researcher-type-label"
              >
                Researcher type
              </div>
              <div className="relative mt-2" ref={researcherTypeRef}>
                <button
                  aria-activedescendant={
                    isResearcherTypeOpen
                      ? `researcher-type-option-${activeResearcherTypeIndex}`
                      : undefined
                  }
                  aria-controls="researcher-type-options"
                  aria-expanded={isResearcherTypeOpen}
                  aria-haspopup="listbox"
                  aria-labelledby="researcher-type-label"
                  aria-required="true"
                  aria-valuetext={
                    selectedResearcherTypeIndex >= 0
                      ? researcherTypes[selectedResearcherTypeIndex].label
                      : "Select your researcher type"
                  }
                  className="flex min-h-12 w-full items-center justify-between rounded-lg border border-white/20 bg-[#414141] px-3 text-left text-sm text-white uppercase outline-none transition focus:border-white/60 focus:ring-2 focus:ring-white/20"
                  id="researcher-type"
                  onClick={() => {
                    if (isResearcherTypeOpen) {
                      setIsResearcherTypeOpen(false);
                    } else {
                      openResearcherTypeMenu();
                    }
                  }}
                  onKeyDown={handleResearcherTypeKeyDown}
                  role="combobox"
                  type="button"
                >
                  <span>
                    {selectedResearcherTypeIndex >= 0
                      ? researcherTypes[selectedResearcherTypeIndex].label
                      : "Select your researcher type"}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`ml-3 text-base leading-none transition-transform ${
                      isResearcherTypeOpen ? "rotate-180" : ""
                    }`}
                  >
                    ⌄
                  </span>
                </button>
                {isResearcherTypeOpen && (
                  <div
                    className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-56 overflow-y-auto rounded-lg border border-white/15 bg-[#343434] py-1 shadow-[0_12px_28px_rgba(0,0,0,0.4)]"
                    id="researcher-type-options"
                    role="listbox"
                    aria-labelledby="researcher-type-label"
                  >
                    {researcherTypes.map(({ value, label }, index) => (
                      <div
                        aria-selected={researcherType === value}
                        className={`cursor-pointer px-3 py-3 text-sm uppercase transition ${
                          activeResearcherTypeIndex === index
                            ? "bg-white/15"
                            : "hover:bg-white/10"
                        }`}
                        id={`researcher-type-option-${index}`}
                        key={value}
                        onClick={() => chooseResearcherType(value)}
                        onMouseEnter={() => setActiveResearcherTypeIndex(index)}
                        role="option"
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <fieldset className="space-y-3.5">
              <legend className="sr-only">Required confirmations</legend>
              {confirmations.map(({ name, text, link }) => (
                <label
                  className="flex cursor-pointer items-start gap-3 text-[13px] leading-5 text-white/85"
                  key={name}
                >
                  <input
                    checked={checked[name] === true}
                    className="mt-[3px] h-4 w-4 shrink-0 cursor-pointer accent-green-500"
                    onChange={(event) =>
                      setChecked((previous) => ({
                        ...previous,
                        [name]: event.target.checked,
                      }))
                    }
                    required
                    type="checkbox"
                  />
                  <span>
                    {link ? (
                      <>
                        I have read and agree to the{" "}
                        <a
                          className="font-semibold text-white underline underline-offset-2 hover:text-white/75"
                          href={link.href}
                        >
                          {link.label}
                        </a>
                        .
                      </>
                    ) : (
                      text
                    )}
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                className="min-h-12 flex-1 rounded-lg bg-white px-5 py-3 text-sm font-bold uppercase text-[#292929] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-white/50"
                disabled={!canEnter}
                type="submit"
              >
                Enter site
              </button>
              <button
                className="min-h-12 rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold uppercase text-white/85 transition hover:bg-white/10 sm:flex-1"
                onClick={() => setDeclined(true)}
                type="button"
              >
                Leave — I do not qualify
              </button>
            </div>
            <p className="mt-4 text-center text-[11px] leading-5 text-white/50">
              All fields and confirmations are required to enter.
            </p>
          </form>
        )}
      </section>
    </div>
  );
}