# Deploy AsterSync to Vercel

The website supports Next.js on Vercel and the existing Vinext/Sites build. Both use the same pages and authenticated Supabase enquiry function. The database does not need to move.

## Hosting plan

Vercel's Hobby plan is restricted to personal, non-commercial use. AsterSync promotes paid services, so use an appropriate commercial plan for its business website. Check the current plan and price before starting any paid subscription.

## Import and configure

1. Import the `AaryaMody1301/AsterSync` repository into the intended Vercel team, selecting the branch containing `vercel.json`.
2. Use the Next.js framework and the repository root. The committed configuration runs `pnpm run build:vercel` and targets Mumbai (`bom1`).
3. Add `ENQUIRY_STORAGE=supabase` and `SUPABASE_URL=https://shsftfopegxkkatplyra.supabase.co` as server environment variables.
4. Add the existing `SUPABASE_ENQUIRY_KEY` through Vercel's secret environment settings. It must match the digest deployed with the Supabase function. Never commit or paste the key into chat. The full Supabase database secret is not needed.
5. Enable Vercel system environment variables, so the site's metadata, robots.txt, and sitemap use `VERCEL_PROJECT_PRODUCTION_URL`. A custom HTTPS origin can instead be set as `SITE_URL`.
6. Deploy and verify the public production URL, all pages, the enquiry form, and the saved Supabase row. Keep preview deployment protection enabled.

If the existing submission key cannot be transferred securely, add a separate authenticated key for the Vercel server and update the function's accepted digest configuration before activation. Do not invalidate the Sites key while the original site is still accepting enquiries.

## Local checks

```sh
pnpm install --frozen-lockfile
pnpm run test:supabase
pnpm run build:vercel
pnpm run start:vercel
```

For local credentials use `.env.local`, which is ignored by Git. Do not use production keys for ordinary UI development. Without a key, the form safely returns a retryable error instead of claiming that it saved an enquiry.

The existing `pnpm run build` and `pnpm run test:production` commands still verify the Cloudflare build. The default TypeScript configuration selects `db/runtime-cloudflare.ts`. The Vercel command selects `tsconfig.vercel.json`, which maps the same runtime import to `db/runtime.ts` and private Node.js environment variables. Never import Cloudflare runtime bindings into a Vercel route.

This configuration prepares deployment; it does not by itself create a Vercel project, subscribe to a plan, or set the private environment variables.
