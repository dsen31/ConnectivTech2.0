This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Production access control

The sales workspace is owner-only. Before deploying the access-control migration:

1. Create the owner's email/password account in Supabase Authentication.
2. In Vercel, set `APP_OWNER_EMAILS` to that email address (comma-separate multiple owners) and set `SUPABASE_SERVICE_ROLE_KEY` to the project's service-role key. Do not expose either value with a `NEXT_PUBLIC_` prefix.
3. Run `supabase/migrations/007_owner_access_control.sql` in the Supabase SQL Editor. Replace `YOUR_OWNER_EMAIL` in the final commented statement and run that statement once to grant the account database access.
4. Deploy the application. The owner signs in at `/login`.

The tracking and unsubscribe endpoints remain public so existing emails keep working. They require `SUPABASE_SERVICE_ROLE_KEY` after Row Level Security is enabled.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
