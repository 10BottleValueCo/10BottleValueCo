import { useRef, useState } from 'react';
import { checkoutOwner, checkoutDetails, loadCheckoutDetails, saveCheckoutDetails, clearCheckoutDetails } from './checkout-details.js';

export function useCheckoutDetails(user) {
  const [, render] = useState(0);
  const record = useRef(null);
  const owner = checkoutOwner(user);
  const storageFor = account => { try { return account ? window.localStorage : window.sessionStorage; } catch { return null; } };
  if (record.current?.owner !== owner) {
    const previous = record.current;
    if (previous?.user && !user) {
      clearCheckoutDetails(storageFor(previous.user), previous.user);
      clearCheckoutDetails(storageFor(null), null);
    }
    const form = loadCheckoutDetails(storageFor(user), user);
    // Keep fields typed during this guest journey when registration/sign-in
    // completes, but never carry a previous customer's fields into this one.
    if (user && previous?.owner === 'guest') {
      for (const field of previous.edited) form[field] = previous.form[field];
      if (previous.edited.size) saveCheckoutDetails(storageFor(user), user, form);
    }
    record.current = { owner, user, form, edited: new Set() };
  }
  // Auth email remains authoritative even after a same-account email change.
  record.current.user = user;
  record.current.form.email = user?.email || '';
  function write(next, notify) {
    if (record.current.owner !== owner) return; // Drop stale buffered callbacks.
    const value = typeof next === 'function' ? next(record.current.form) : next;
    record.current.form = checkoutDetails(record.current.user, value);
    saveCheckoutDetails(storageFor(record.current.user), record.current.user, record.current.form);
    if (notify) render(version => version + 1);
  }
  return {
    form: record.current.form,
    setForm: next => write(next, true),
    remember: (field, value) => {
      if (record.current.owner !== owner) return;
      record.current.edited.add(field);
      write(current => ({ ...current, [field]: value }), false);
    },
  };
}
