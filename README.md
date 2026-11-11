# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

### Auth0 setup

Authentication follows the [official Auth0 Nuxt Quickstart](https://auth0.com/docs/quickstart/webapp/nuxt)
using `@auth0/auth0-nuxt` and Auth0 Universal Login. The installed Nuxt 4 version
meets the Quickstart's Nuxt 4.2+ requirement.

1. In the Auth0 Dashboard, create a **Regular Web Application** and select the
   **Universal Login** experience under **Branding > Universal Login > Advanced
   Options**.
2. Add the five `NUXT_AUTH0_*` variables from `.env.example` to your local `.env`,
   preserving the existing database settings. Copy **Domain**, **Client ID**, and
   **Client Secret** from the application's Settings tab. Use the Domain value
   without an `https://` prefix.
3. Generate a session secret with `openssl rand -hex 64` and set
   `NUXT_AUTH0_SESSION_SECRET`. Keep this value stable across restarts and replicas.
4. Set `NUXT_AUTH0_APP_BASE_URL` to the application's public origin and configure
   these Dashboard settings:

| Auth0 setting         | Local development                     | Production                             |
| --------------------- | ------------------------------------- | -------------------------------------- |
| Allowed Callback URLs | `http://localhost:3000/auth/callback` | `https://www.skyinnk.in/auth/callback` |
| Allowed Logout URLs   | `http://localhost:3000`               | `https://www.skyinnk.in`               |
| Allowed Web Origins   | `http://localhost:3000`               | `https://www.skyinnk.in`               |

For production, set `NUXT_AUTH0_APP_BASE_URL=https://www.skyinnk.in` and supply the
same five variables securely at runtime. The existing Compose `env_file` already
loads `.env`; no Docker or deployment workflow changes are required. The built
Node server does not load `.env` itself outside Compose, so export the variables
before starting it directly. If you use a different public origin or local port,
update the base URL and all matching Dashboard URLs.

The homepage stays public. **Log In / Sign Up** opens Universal Login, where users
can sign in or choose sign up. Enable a database connection for this application
and allow signups on that connection if new users should be able to register.
The SDK handles `/auth/login`, `/auth/callback`, and `/auth/logout`, including
session cookies; `useUser()` supplies the authenticated name, email, and picture.
There are no custom credential forms or callback handlers.

All Auth0 configuration lives in private `runtimeConfig.auth0`, outside
`runtimeConfig.public`. Keep real secrets in ignored `.env` files or your runtime
secret store; `.env.example` contains placeholders only.

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Auth0 user synchronization

The public Home Page synchronizes verified Auth0 session claims to Prisma through
`POST /api/v1/auth/sync`. See [the synchronization guide](docs/auth0-user-sync.md) for
the database model/migration, claim clearing policy, middleware lifecycle,
origin-only cache controls, automated verification, and production prerequisites.
Cloudflare Dashboard rules are configured separately.

## Validation

Use Node 24.22 or newer in the Node 24 line and the installed dependencies:
`npm run check:all` validates/generates Prisma, checks Nuxt types, builds once,
and scans output for build-secret exposure. `npm run test:all` independently runs
the complete lightweight suite. Neither command needs Docker, PostgreSQL,
database credentials, a browser, or external application services. See
[the testing guide](docs/testing.md) for scope and verification limits.

## Analytics and legal pages

See [the analytics and legal review guide](docs/analytics-and-legal.md) for GTM
runtime configuration, local verification, owner confirmation items, and the
production browser checks required before approving release.

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
