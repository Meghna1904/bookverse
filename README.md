# BookVerse

A shared reading journal for two readers. The UI and application logic run in the Vite frontend on Vercel. Supabase provides the Postgres database and file storage; there is no custom server or sign-in flow.

## Set up Supabase

1. Create a Supabase project.
2. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql). It creates the database tables, two starter reader profiles, public access policies, and the `bookverse-pdfs` storage bucket.
3. Copy the project URL and anon/publishable key from Supabase.
4. Put them in `.env.local` for local development (or copy `.env.example` to `.env.local`):

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
   ```

5. In Vercel, add the same two variables under **Project → Settings → Environment Variables**, then redeploy.

The SQL seed uses two profiles named **Whiskeyy** and **Matildaa**. You can change their names in the Profiles page after setup.

## Run locally

```bash
npm install
npm run dev
```

Build the production frontend with `npm run build`.

## Data access

This app intentionally has no authentication. The SQL policies allow anyone with the Supabase project URL and public key to read, insert, update, and delete the app's rows and files. The Vercel URL is also not private access control. Use it only for data you are comfortable sharing with anyone who gets the link. Do not put Supabase service-role keys in Vite environment variables.

To change the schema, update `supabase/schema.sql` and apply the changes in the Supabase SQL Editor.
