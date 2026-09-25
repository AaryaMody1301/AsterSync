# AsterSync

The AsterSync website: a software, automation, and data studio based in Surat.

- Website: https://astersync.project-keys-0949.chatgpt.site (current Sites sharing settings apply)
- Source: https://github.com/AaryaMody1301/AsterSync
- Pages: Home, Services, Work & demos, About, Contact, and Privacy.
- Stack: React 19, TypeScript, Vinext/Vite, Tailwind CSS, and a Cloudflare Worker.

## Database status

**Supabase support is prepared but not activated.** A dedicated project still needs to be selected or created, the schema applied, and the private server key configured. The live form continues to use its existing D1 database until that cutover is verified. No Supabase database has been provisioned by this repository upload.

See [Supabase setup and cutover](docs/supabase-setup.md). There are no database credentials or enquiry records in this repository.

## Run locally

Use Node.js 22.13 or newer (Node.js 24 recommended) and the pinned pnpm version in `package.json`.

```sh
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
npm run dev
```

Open the URL printed by the dev server. Pages and demos work immediately; the enquiry form needs a configured database. `.dev.vars` is ignored by Git and holds local Worker environment bindings. Use a development Supabase project when testing with that provider. `npm run install:ci` is an additional installer for the managed Linux Sites environment; use the direct pnpm command for standalone clones.

## Verify and build

```sh
node node_modules/typescript/bin/tsc --noEmit
npm run test:supabase
npm run build
npm run test:production
```

The production audit checks rendered pages, navigation links, assets, metadata, 404 behavior, and contact submission behavior in an isolated local database. Supabase contract tests use mock network responses; they do not certify a live Supabase project or execute the SQL schema.

To run the compiled website locally with D1:

```sh
node --import ./scripts/sites-env.mjs node_modules/wrangler/bin/wrangler.js d1 execute DB --local --persist-to .wrangler/state --config dist/server/wrangler.json --file drizzle/0000_supreme_red_ghost.sql
npm start
```

Apply the initial migration once to a fresh local database. `npm start` prints the local address.

## Hosting

GitHub contains the source code. The running site remains hosted on Sites. This application has server-rendered routes and a server-side enquiry API, so GitHub Pages cannot run it as-is. No automatic deployment workflow from GitHub has been configured.

For Sites updates, build the project, push the exact source state to its Sites source repository, then save and deploy that version with its build archive. The Sites project association lives in `.openai/hosting.json`; it is an identifier, not a credential. Other hosting platforms must support this Cloudflare Worker build and its environment bindings. See [runtime details](docs/runtime.md).

## Contact flow

The browser posts to `/api/enquiries`. The server validates input, rejects the honeypot, enforces request-size limits, and returns a submission reference only after storage succeeds. The API has no public enquiry-list endpoint. Repeat submissions reuse a UUID to avoid duplicates. With Supabase enabled, an atomic database function enforces the five-enquiries-per-email-per-hour limit.

Enquiries are stored for owner review. Email notifications are not configured. The work demos use fictional data and do not store interactions.

## Main files

- `app/`: pages and the enquiry API.
- `components/`: navigation, forms, interactive demos, and UI components.
- `db/supabase.ts`: private server connection to the Supabase RPC.
- `supabase/schema.sql`: prepared PostgreSQL table, permissions, and submission function.
- `drizzle/`: existing D1 migration, retained for the current database.
- `scripts/audit-production.mjs`: compiled application audit.
- `tests/supabase.test.ts`: Supabase transport and failure-handling tests.

Keep private keys in your host's secret settings. Never prefix them with `NEXT_PUBLIC_` or `VITE_`, put them in browser code, or commit them. `.dev.vars*`, `.env*`, build output, local database state, and generated TypeScript caches are ignored.
