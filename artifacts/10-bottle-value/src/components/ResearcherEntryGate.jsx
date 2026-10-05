import { useEffect, useState } from "react";

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

  const canEnter =
    Boolean(researcherType) &&
    confirmations.every(({ name }) => checked[name] === true);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-6 sm:px-6">
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
              <label
                className="block text-sm font-medium text-white/90"
                htmlFor="researcher-type"
              >
                Researcher type
              </label>
              <div className="relative mt-2">
                <select
                  id="researcher-type"
                  data-testid="select-researcher-type"
                  value={researcherType}
                  onChange={(event) => setResearcherType(event.target.value)}
                  required
                  className="min-h-12 w-full appearance-none rounded-lg border border-white/20 bg-[#414141] px-3 pr-10 text-left text-sm text-white uppercase outline-none focus:border-white/60 focus:ring-2 focus:ring-white/20"
                  style={{ colorScheme: "dark" }}
                >
                  <option className="bg-[#343434] text-white" disabled value="">
                    Select your researcher type
                  </option>
                  {researcherTypes.map(({ value, label }) => (
                    <option className="bg-[#343434] text-white" key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base leading-none"
                >
                  ⌄
                </span>
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