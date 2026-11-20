# Next.js migration

Use Next.js Pages Router on the Node.js runtime. Preserve all public URLs and query parameters. Existing React views, styles and static assets retain their behavior. A catch-all Next.js API route delegates to the existing Express application with Next body parsing disabled, preserving raw Stripe request bytes. Supabase migrations, backend contracts and test-mode credentials keep their existing names. A single Next.js process serves both the site and API.
