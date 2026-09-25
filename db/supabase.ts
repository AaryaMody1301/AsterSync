import type {Enquiry} from '../lib/enquiries';

export type SubmissionResult = {status: 'created' | 'duplicate' | 'rate_limited' | 'conflict'; id: string};
type SupabaseConfig = {SUPABASE_URL?: string; SUPABASE_SECRET_KEY?: string};

// Server only. The browser always submits to our same-origin API.
export async function saveToSupabase(enquiry: Enquiry, config: SupabaseConfig, fetcher: typeof fetch = fetch): Promise<SubmissionResult> {
  if (!config.SUPABASE_URL || !config.SUPABASE_SECRET_KEY?.startsWith('sb_secret_')) {
    throw new Error('Supabase server configuration is incomplete');
  }
  const url = new URL(config.SUPABASE_URL);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/') {
    throw new Error('Supabase project URL must be an HTTPS origin');
  }
  const response = await fetcher(new URL('/rest/v1/rpc/submit_enquiry', url), {
    method: 'POST',
    headers: {'Content-Type': 'application/json', apikey: config.SUPABASE_SECRET_KEY},
    body: JSON.stringify({payload: {...enquiry, email: enquiry.email.toLowerCase()}}),
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Supabase submission unavailable (${response.status})`);
  const result: unknown = await response.json();
  if (!result || typeof result !== 'object' || !('id' in result) || result.id !== enquiry.id ||
      !('status' in result) || !['created', 'duplicate', 'rate_limited', 'conflict'].includes(String(result.status))) {
    throw new Error('Supabase returned an invalid submission receipt');
  }
  return result as SubmissionResult;
}
