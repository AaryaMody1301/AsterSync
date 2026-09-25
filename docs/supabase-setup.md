# Supabase setup and cutover

Status: integration code is ready for configuration; no remote schema or project has been created for AsterSync yet.

## Choose the project

Choose the Supabase organization and a dedicated AsterSync project. Confirm the displayed project cost before creation. Do not reuse or restore an unrelated project without the owner's direction. Mumbai (`ap-south-1`) is a reasonable region for a Surat-based business, subject to availability.

## Apply the prepared schema

Apply `supabase/schema.sql` once to the selected project using a named Supabase migration. When using the CLI, first run `supabase migration new create_aster_sync_enquiries`, copy the reviewed SQL into the generated file, and apply through the normal linked-project workflow. The management integration can instead apply the same SQL as a named migration.

The schema creates:

- `public.enquiries`, with UUID references, input constraints, and an email/time index.
- Row-level security, with all table privileges revoked from `PUBLIC`, `anon`, and `authenticated`.
- `public.submit_enquiry(payload jsonb)`, an invoker function executable only by `service_role`.
- Transactional duplicate handling and an atomic five-submissions-per-email-per-hour limit.

The database is accessed only by the website server. Public and signed-in browser clients cannot read the table or call its submission function. The server key bypasses RLS and must remain private. An email-based limit and honeypot reduce repeat spam; they are not a comprehensive bot-protection system.

## Configure server secrets

In the hosting platform's runtime environment settings, set:

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | The selected project's HTTPS origin, e.g. `https://PROJECT_REF.supabase.co` |
| `SUPABASE_SECRET_KEY` | A new-format `sb_secret_...` key, stored as a private server secret |
| `ENQUIRY_STORAGE` | Keep `d1` until migration and verification finish; then set `supabase` |

Create or copy the secret through Supabase's API key settings and enter it through the host's secure secret settings. Do not paste it into chat, GitHub, a client-side variable, or a committed file. For local development only, use the ignored `.dev.vars` file. The transport uses native `fetch` and the Supabase REST API, so no browser SDK or new runtime dependency is needed.

## Move existing enquiries safely

1. Inspect the existing D1 record count and take a private backup. Never commit enquiry data.
2. Arrange a brief write pause for the final transfer so submissions cannot be missed between export and switching providers.
3. Import records with their existing UUIDs and fields. Convert D1 `created_at` milliseconds to PostgreSQL timestamps using `to_timestamp(created_at / 1000.0)`.
4. Compare record counts and IDs, then verify sample fields privately.
5. Set `ENQUIRY_STORAGE=supabase`, deploy, and resume submissions.
6. Keep the old D1 database during the validation window. Do not delete it as part of the initial switch.

If the old database is empty, no record transfer is needed. If reverting after new Supabase submissions, reconcile those records before switching back; changing the provider alone does not copy data. The application returns a retryable error on a Supabase outage instead of silently writing new records to D1.

## Verify before considering the cutover complete

Use an explicitly labelled synthetic enquiry, then verify it in the selected Supabase project:

- First submission returns 201 and creates exactly one row.
- Retrying the same payload/reference returns 200 without another row.
- Invalid input and the honeypot fail before storage.
- Six distinct submissions from one test email allow the first five and reject the sixth with 429, including concurrent submissions.
- Reusing a reference for different details returns 409.
- `anon` and `authenticated` cannot select enquiries or execute the function.
- Supabase security advisors report no exposed enquiry table/function.
- Simulated database failure returns 503 and preserves the visitor's input for retry.

Remove only clearly identified synthetic records after verification. Update the website's privacy notice to identify Supabase once it is actually processing enquiries. Production activation is not complete until these checks pass against the selected project.
