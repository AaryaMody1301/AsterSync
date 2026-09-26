# Supabase operations

## Production configuration

- Project: AsterSync, reference `shsftfopegxkkatplyra`.
- Organization: Invest-Smart.
- Region: Mumbai (`ap-south-1`).
- Project creation quote: $0/month on 25 September 2026. Plan limits and future usage still apply.
- Initial migration: `create_aster_sync_enquiries`, source in `supabase/schema.sql`.
- Edge Function: `enquiries`.

The browser submits to the website's same-origin `/api/enquiries` route. The server validates the request, then calls the Supabase function using a private submission key. The function authenticates that key, validates the enquiry again, and uses its built-in `SUPABASE_SECRET_KEYS` environment to call the private database RPC. There is no endpoint for reading enquiries.

## Runtime variables on Sites

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | `https://shsftfopegxkkatplyra.supabase.co` |
| `SUPABASE_ENQUIRY_KEY` | Secret 32-byte random key encoded as 64 lowercase hexadecimal characters |
| `ENQUIRY_STORAGE` | `supabase` for production; `d1` for local isolated tests or an intentional rollback |

The submission key is stored as a secret in Sites. Only its SHA-256 digest is committed in `supabase/functions/enquiries/key-sha256.json`. The digest cannot be used as the key. Never put the plaintext key in GitHub, chat, or a browser variable. The full Supabase database secret is not stored in Sites or this repository.

## Function authentication

`verify_jwt=false` is intentional: the function implements custom server authentication using `X-AsterSync-Key`, a constant-length digest comparison, and rejection before database access. It does not accept anonymous requests or use a publishable API key as authentication. A missing or incorrect submission key returns 401. The function accepts only POST, limits request bodies to 16 KB, and validates the same schema as the website.

The Deno import map pins Zod to `3.25.76`. Deploy the entrypoint, import map, digest file, and shared imports together. The import map is `supabase/functions/enquiries/deno.json`; the entrypoint is `supabase/functions/enquiries/index.ts`.

To rotate the submission key, generate a new random 32-byte key, update its SHA-256 digest, deploy the function, replace the Sites secret, and redeploy the website promptly. Coordinate the change because requests using the old key will fail between these steps. Never retrieve or publish the Supabase database secret to rotate this limited key.

## Database protection

`public.enquiries` has row-level security enabled and no public client policies. All table privileges and RPC execution are revoked from `PUBLIC`, `anon`, and `authenticated`. Only `service_role` can call `public.submit_enquiry(jsonb)`. The RPC uses `SECURITY INVOKER`, validates storage constraints, serializes duplicate IDs, and atomically limits each email to five enquiries per hour.

The security advisor's informational “RLS Enabled No Policy” notice is expected: all client access is intentionally denied, and only the server role accesses the table. Do not add public read or write policies to silence that notice.

## Verification and old storage

Before activation, the original D1 database contained zero enquiries, so no records needed transferring. The D1 binding is retained, and the application never silently falls back to it during a Supabase outage. Visitors receive a retryable error and retain their form details.

Verification covers successful storage, retries without duplicates, conflicting references, concurrent rate limiting, invalid input, unauthorized function requests, and denied client database access. Transactional SQL tests roll back their changes; synthetic live-function records are removed after verification.

If rolling back after real Supabase submissions arrive, first reconcile those records into the destination database. Changing `ENQUIRY_STORAGE` does not copy data. Keep backups and enquiry exports private.

## Development

Use a separate Supabase development project and key. Apply the initial schema once, generate a separate submission key/digest, deploy the function there, and put that project's URL and key in the ignored `.dev.vars` file. The production key is never needed for ordinary page or component work.

Email notifications are not configured. Review real enquiries in the Supabase table editor using your authenticated project account.
