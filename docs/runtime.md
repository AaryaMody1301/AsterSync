# Runtime details

AsterSync runs on Vinext with a Cloudflare Worker. `vite.config.ts` reads the D1 binding and Sites project association from `.openai/hosting.json`. Build output is generated in `dist/client` and `dist/server` and is not committed.

Standalone GitHub clones use the portable execution profile automatically. `npm run dev` starts Vinext on port 5173, and `npm run build` builds the Worker. The managed Sites workspace uses its ignored `.sites-runtime/execution-profile.json` to select a bounded Linux build and supervised preview.

For standalone installation, use the pinned pnpm version and `pnpm install --frozen-lockfile`. The optional `npm run install:ci` script is specific to the managed Linux environment and requires its shell tools. Keep the lockfile and package-manager pin together.

For compiled local testing, `npm start` runs Wrangler on loopback and stores local database state in `.wrangler/state`. Initialize a fresh local D1 database with the migration command in the main README. Do not replay that initial migration on an existing database.

Local application environment bindings belong in the ignored `.dev.vars` file. Production bindings belong in the hosting platform's runtime environment and secret settings. No private value should appear in a client bundle or source commit.

The `build/sites-vite-plugin.ts` and `app/chatgpt-auth.ts` files provide platform integration. Optional sign-in is dispatch-owned on Sites. The site's current access audience is configured by the platform and is not changed by publishing this GitHub repository.

GitHub stores a source snapshot; it is not currently an automatic deployment source. Publish subsequent changes through the Sites build, source, saved-version, and deployment workflow. Keep GitHub source updates in sync separately until a deployment integration is intentionally configured.
