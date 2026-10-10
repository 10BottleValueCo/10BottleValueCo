import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizePaylioResponse } from '../api/_paylio-diagnostics.js';

test('Paylio JSON and proxy failures expose only fixed diagnostic categories', () => {
  const samples = [
    [JSON.stringify({error:'Invalid payout wallet address private-wallet'}),'json','wallet_validation'],
    [JSON.stringify({error:'Invalid API key plio_live_private'}),'json','authentication'],
    [JSON.stringify({error:'Too many requests for buyer@example.test'}),'json','rate_limit'],
    [JSON.stringify({error:'Provider is unavailable for buyer@example.test'}),'json','provider_selection'],
    ['<!doctype html><html><h1>502 Bad Gateway</h1><p>private details</p></html>','html','upstream_failure'],
    ['Unknown issue: buyer@example.test plio_live_private','text','unknown'],
    [JSON.stringify({checkout_url:'https://paylio.org/pay/private',ipn_token:'private-token'}),'json','unknown'],
    ['null','json','unknown'],
    ['', 'empty', 'unknown'],
    ['x'.repeat(50001),'oversized','unknown'],
  ];
  for (const [raw, bodyFormat, errorCategory] of samples) {
    const result = summarizePaylioResponse(raw);
    assert.deepEqual(result, {bodyFormat, bodyBytes:Buffer.byteLength(raw), errorCategory});
    assert.doesNotMatch(JSON.stringify(result), /private|buyer@|paylio\.org/);
  }
});
