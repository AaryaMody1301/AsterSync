declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ENQUIRY_STORAGE?: 'd1' | 'supabase';
    SUPABASE_URL?: string;
    SUPABASE_SECRET_KEY?: string;
  }
}
