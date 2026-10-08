import {
  forwardRef,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const DEFAULT_COMMIT_DELAY_MS = 180;

function useBufferedDraft({
  value,
  onValueChange,
  onImmediateInput,
  normalizeValue,
  commitDelayMs,
  forwardedRef,
  onBlur,
  onFocus,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
}) {
  const externalValue = value == null ? "" : String(value);
  const initialDraft = normalizeValue
    ? normalizeValue(externalValue)
    : externalValue;
  const [draft, setDraft] = useState(initialDraft);
  const inputRef = useRef(null);
  const draftRef = useRef(initialDraft);
  const externalValueRef = useRef(externalValue);
  externalValueRef.current = externalValue;
  const lastCommittedRef = useRef(initialDraft);
  const lastExternalValueRef = useRef(externalValue);
  const focusedRef = useRef(false);
  const composingRef = useRef(false);
  const timerRef = useRef(null);
  const callbacksRef = useRef({});
  callbacksRef.current = {
    onValueChange,
    onImmediateInput,
    normalizeValue,
    onBlur,
    onFocus,
    onKeyDown,
    onCompositionStart,
    onCompositionEnd,
  };

  const setInputRef = useCallback(
    (node) => {
      inputRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const clearPendingCommit = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const setLocalDraft = useCallback((nextValue) => {
    draftRef.current = nextValue;
    setDraft(nextValue);
  }, []);

  const commit = useCallback((nextValue = draftRef.current, deferred = false, force = false) => {
    clearPendingCommit();
    if (nextValue === lastCommittedRef.current && !force) return;

    lastCommittedRef.current = nextValue;
    const updateParent = () => callbacksRef.current.onValueChange?.(nextValue);
    if (deferred) startTransition(updateParent);
    else updateParent();
  }, [clearPendingCommit]);

  const scheduleCommit = useCallback(() => {
    clearPendingCommit();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      commit(draftRef.current, true);
    }, commitDelayMs);
  }, [clearPendingCommit, commit, commitDelayMs]);

  const normalize = useCallback((nextValue) => {
    const normalizer = callbacksRef.current.normalizeValue;
    return normalizer ? normalizer(nextValue) : nextValue;
  }, []);

  const flushCurrentValue = useCallback(() => {
    const domValue = inputRef.current?.value;
    const nextValue = normalize(
      typeof domValue === "string" ? domValue : draftRef.current,
    );
    if (nextValue !== draftRef.current) setLocalDraft(nextValue);
    commit(nextValue, false, nextValue !== externalValueRef.current);
  }, [commit, normalize, setLocalDraft]);

  const handleChange = useCallback((event) => {
    const nextValue = normalize(event.currentTarget.value);
    setLocalDraft(nextValue);
    callbacksRef.current.onImmediateInput?.(nextValue, event);
    if (!composingRef.current && !event.nativeEvent?.isComposing) {
      scheduleCommit();
    }
  }, [normalize, scheduleCommit, setLocalDraft]);

  const handleCompositionStart = useCallback((event) => {
    composingRef.current = true;
    callbacksRef.current.onCompositionStart?.(event);
  }, []);

  const handleCompositionEnd = useCallback((event) => {
    composingRef.current = false;
    const nextValue = normalize(event.currentTarget.value);
    setLocalDraft(nextValue);
    callbacksRef.current.onImmediateInput?.(nextValue, event);
    callbacksRef.current.onCompositionEnd?.(event);
    scheduleCommit();
  }, [normalize, scheduleCommit, setLocalDraft]);

  const handleFocus = useCallback((event) => {
    focusedRef.current = true;
    callbacksRef.current.onFocus?.(event);
  }, []);

  const handleBlur = useCallback((event) => {
    focusedRef.current = false;
    flushCurrentValue();
    callbacksRef.current.onBlur?.(event);
  }, [flushCurrentValue]);

  const handleKeyDown = useCallback((event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent?.isComposing &&
      !composingRef.current
    ) {
      flushCurrentValue();
    }
    callbacksRef.current.onKeyDown?.(event);
  }, [flushCurrentValue]);

  useEffect(() => {
    if (externalValue === lastExternalValueRef.current) return;
    lastExternalValueRef.current = externalValue;

    // Parent-driven resets (including a successfully sent message) must still
    // clear the local draft while the field remains focused.
    if (focusedRef.current && externalValue !== "") return;

    clearPendingCommit();
    const nextValue = normalize(externalValue);
    draftRef.current = nextValue;
    lastCommittedRef.current = nextValue;
    setDraft(nextValue);
  }, [clearPendingCommit, externalValue, normalize]);

  useEffect(() => clearPendingCommit, [clearPendingCommit]);

  return {
    draft,
    setInputRef,
    handleChange,
    handleCompositionStart,
    handleCompositionEnd,
    handleFocus,
    handleBlur,
    handleKeyDown,
  };
}

export const BufferedInput = forwardRef(function BufferedInput(
  {
    value,
    onValueChange,
    onImmediateInput,
    normalizeValue,
    commitDelayMs = DEFAULT_COMMIT_DELAY_MS,
    onBlur,
    onFocus,
    onKeyDown,
    onCompositionStart,
    onCompositionEnd,
    ...inputProps
  },
  ref,
) {
  const buffered = useBufferedDraft({
    value,
    onValueChange,
    onImmediateInput,
    normalizeValue,
    commitDelayMs,
    forwardedRef: ref,
    onBlur,
    onFocus,
    onKeyDown,
    onCompositionStart,
    onCompositionEnd,
  });

  return (
    <input
      {...inputProps}
      ref={buffered.setInputRef}
      value={buffered.draft}
      onChange={buffered.handleChange}
      onCompositionStart={buffered.handleCompositionStart}
      onCompositionEnd={buffered.handleCompositionEnd}
      onFocus={buffered.handleFocus}
      onBlur={buffered.handleBlur}
      onKeyDown={buffered.handleKeyDown}
    />
  );
});

export const BufferedTextarea = forwardRef(function BufferedTextarea(
  {
    value,
    onValueChange,
    onImmediateInput,
    normalizeValue,
    commitDelayMs = DEFAULT_COMMIT_DELAY_MS,
    onBlur,
    onFocus,
    onKeyDown,
    onCompositionStart,
    onCompositionEnd,
    ...textareaProps
  },
  ref,
) {
  const buffered = useBufferedDraft({
    value,
    onValueChange,
    onImmediateInput,
    normalizeValue,
    commitDelayMs,
    forwardedRef: ref,
    onBlur,
    onFocus,
    onKeyDown,
    onCompositionStart,
    onCompositionEnd,
  });

  return (
    <textarea
      {...textareaProps}
      ref={buffered.setInputRef}
      value={buffered.draft}
      onChange={buffered.handleChange}
      onCompositionStart={buffered.handleCompositionStart}
      onCompositionEnd={buffered.handleCompositionEnd}
      onFocus={buffered.handleFocus}
      onBlur={buffered.handleBlur}
      onKeyDown={buffered.handleKeyDown}
    />
  );
});
