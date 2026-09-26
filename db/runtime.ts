// Vercel / Node.js runtime. Values remain private server environment variables.
export function enquiryEnvironment() {
  return {
    ENQUIRY_STORAGE: process.env.ENQUIRY_STORAGE || 'supabase',
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ENQUIRY_KEY: process.env.SUPABASE_ENQUIRY_KEY,
  };
}

export function enquiryDb(): D1Database {
  throw new Error('D1 storage is available only on the Sites runtime');
}
