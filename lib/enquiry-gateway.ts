import {enquirySchema} from './enquiries.ts';
import {saveSupabaseRpc} from '../db/supabase-rpc.ts';

type Config = {
  tokenHash: string;
  getDatabase: () => {SUPABASE_URL?: string; SUPABASE_SECRET_KEY?: string};
};

const json = (body: unknown, status = 200) => Response.json(body, {status, headers: {'Cache-Control': 'no-store'}});

export function createEnquiryGateway(config: Config, fetcher: typeof fetch = fetch) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return json({error: 'Method not allowed.'}, 405);
    const token = request.headers.get('X-AsterSync-Key') || '';
    if (!/^[a-f0-9]{64}$/.test(token) || !/^[a-f0-9]{64}$/.test(config.tokenHash)) return json({error: 'Unauthorized.'}, 401);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
    const hash = Array.from(digest, n => n.toString(16).padStart(2, '0')).join('');
    let mismatch = 0;
    for (let i = 0; i < 64; i++) mismatch |= hash.charCodeAt(i) ^ config.tokenHash.charCodeAt(i);
    if (mismatch !== 0) return json({error: 'Unauthorized.'}, 401);
    if (!request.headers.get('Content-Type')?.includes('application/json')) return json({error: 'JSON required.'}, 415);
    if (Number(request.headers.get('Content-Length') || 0) > 16000) return json({error: 'Payload too large.'}, 413);
    try {
      const reader = request.body?.getReader();
      if (!reader) return json({error: 'Invalid submission.'}, 400);
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 16000) {await reader.cancel(); return json({error: 'Payload too large.'}, 413);}
        chunks.push(value);
      }
      const data = new Uint8Array(bytes);
      let offset = 0;
      for (const chunk of chunks) {data.set(chunk, offset); offset += chunk.byteLength;}
      let body: unknown;
      try {body = JSON.parse(new TextDecoder().decode(data));} catch {return json({error: 'Invalid JSON.'}, 400);}
      const parsed = enquirySchema.safeParse(body);
      if (!parsed.success || parsed.data.website) return json({error: 'Invalid submission.'}, 400);
      return json(await saveSupabaseRpc(parsed.data, config.getDatabase(), fetcher));
    } catch {
      // Do not return database details, enquiry contents, or credentials.
      return json({error: 'Enquiry storage temporarily unavailable.'}, 503);
    }
  };
}
