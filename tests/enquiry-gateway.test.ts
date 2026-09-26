import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash} from 'node:crypto';
import {createEnquiryGateway} from '../lib/enquiry-gateway.ts';

const token = 'a'.repeat(64);
const tokenHash = createHash('sha256').update(token).digest('hex');
const input = {id: 'c2dad2dc-1035-4a3d-9d30-8b0fd2128985', name: 'Synthetic gateway test', email: 'gateway@example.com', message: 'A synthetic enquiry for isolated gateway testing.'};
const request = (body: unknown, key = token) => new Request('https://example.supabase.co/functions/v1/enquiries', {
  method: 'POST', headers: {'Content-Type': 'application/json', 'X-AsterSync-Key': key}, body: JSON.stringify(body),
});

test('gateway rejects unauthorized callers before accessing database credentials', async () => {
  const handler = createEnquiryGateway({tokenHash, getDatabase: () => {throw new Error('Credentials must not be read');}});
  assert.equal((await handler(request(input, ''))).status, 401);
  assert.equal((await handler(request(input, 'b'.repeat(64)))).status, 401);
  assert.equal((await handler(new Request('https://example.supabase.co/functions/v1/enquiries'))).status, 405);
});

test('gateway validates input and blocks oversized requests', async () => {
  const handler = createEnquiryGateway({tokenHash, getDatabase: () => {throw new Error('Database must not be reached');}});
  assert.equal((await handler(request({...input, email: 'invalid'}))).status, 400);
  assert.equal((await handler(request({...input, website: 'spam'}))).status, 400);
  assert.equal((await handler(request({...input, message: 'x'.repeat(16001)}))).status, 413);
});

test('gateway supplies private database credentials only to the Supabase RPC', async () => {
  const handler = createEnquiryGateway({tokenHash, getDatabase: () => ({SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test_only'})}, async (url, init) => {
    assert.equal(String(url), 'https://example.supabase.co/rest/v1/rpc/submit_enquiry');
    assert.equal(new Headers(init?.headers).get('apikey'), 'sb_secret_test_only');
    assert.equal(new Headers(init?.headers).get('X-AsterSync-Key'), null);
    assert.equal(JSON.parse(String(init?.body)).payload.budget, 'not-set');
    return Response.json({id: input.id, status: 'created'});
  });
  const response = await handler(request(input));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), {id: input.id, status: 'created'});
});

test('gateway hides database error details and fails closed', async () => {
  const handler = createEnquiryGateway({tokenHash, getDatabase: () => ({SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test_only'})}, async () => new Response('Sensitive internal error', {status: 500}));
  const response = await handler(request(input));
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes('Sensitive'), false);
});
