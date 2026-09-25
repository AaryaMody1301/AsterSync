import assert from 'node:assert/strict';
import {test} from 'node:test';
import {saveToSupabase} from '../db/supabase.ts';

const input = {id: '88762894-e18f-41f1-b7b1-1f10a75b8186', name: 'Test enquiry', email: 'Test@Example.com', company: '', service: 'data' as const, budget: 'not-set' as const, timeline: '', message: 'A synthetic enquiry used only in a local test.', website: ''};
const config = {SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test_only'};

test('RPC request uses server credentials, normalized email, and validates receipts', async () => {
  for (const status of ['created', 'duplicate', 'rate_limited', 'conflict']) {
    const result = await saveToSupabase(input, config, async (url, init) => {
      assert.equal(String(url), 'https://example.supabase.co/rest/v1/rpc/submit_enquiry');
      assert.equal(init?.method, 'POST');
      assert.equal(new Headers(init?.headers).get('apikey'), config.SUPABASE_SECRET_KEY);
      assert.equal(JSON.parse(String(init?.body)).payload.email, 'test@example.com');
      assert.equal(init?.cache, 'no-store');
      assert.ok(init?.signal);
      return Response.json({status, id: input.id});
    });
    assert.deepEqual(result, {status, id: input.id});
  }
});

test('unconfigured storage and unsafe URLs fail before making a request', async () => {
  const neverFetch = async () => {throw new Error('Network must not be reached');};
  await assert.rejects(saveToSupabase(input, {}, neverFetch), /configuration is incomplete/);
  await assert.rejects(saveToSupabase(input, {...config, SUPABASE_SECRET_KEY: 'sb_publishable_example'}, neverFetch), /configuration is incomplete/);
  await assert.rejects(saveToSupabase(input, {...config, SUPABASE_URL: 'http://example.supabase.co'}, neverFetch), /HTTPS origin/);
});

test('database failures and malformed receipts cannot be reported as success', async () => {
  await assert.rejects(saveToSupabase(input, config, async () => new Response('private database error', {status: 500})), /unavailable \(500\)/);
  await assert.rejects(saveToSupabase(input, config, async () => Response.json({status: 'created', id: 'wrong-id'})), /invalid submission receipt/);
  await assert.rejects(saveToSupabase(input, config, async () => Response.json({status: 'unknown', id: input.id})), /invalid submission receipt/);
  await assert.rejects(saveToSupabase(input, config, async () => {throw new Error('Network offline');}), /Network offline/);
});
