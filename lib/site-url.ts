// Vercel exposes its stable production domain at build time. SITE_URL can
// override it after connecting a custom domain; Sites keeps its existing URL.
const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const siteUrl = new URL(process.env.SITE_URL ||
  (productionDomain ? `https://${productionDomain}` : 'https://astersync.project-keys-0949.chatgpt.site'));
