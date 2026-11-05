# Analytics and legal review

## Changed files

| Files                                                            | Change                                                                  |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `nuxt.config.ts`, `.env.example`                                 | Public GTM ID and opt-in analytics flag.                                |
| `app/plugins/gtm.client.ts`                                      | One asynchronous browser-only GTM loader.                               |
| `app/app.vue`, `app/pages/index.vue`                             | Shared footer, document language, and height adjustment for the footer. |
| `app/components/LegalPage.vue`                                   | Shared responsive legal-page presentation.                              |
| `app/pages/privacy-policy.vue`, `app/pages/terms-of-service.vue` | Public legal text, titles, descriptions, and canonical URLs.            |
| `tests/routes.test.mjs`, `package.json`                          | Isolated rendering/loader contracts and lightweight test command.       |
| `README.md`, `docs/analytics-and-legal.md`                       | Configuration, review details, verification, and release risks.         |

## Implementation

The app remains a Nuxt 4 public coming-soon site with Auth0 login/signup and
verified-session account synchronization on the home page. No other product,
purchase flow, or account management interface is implemented. The legal copy
describes that current service and the optional claims actually mapped by
`server/utils/auth0-user.ts` to `prisma/schema.prisma`.

`app/plugins/gtm.client.ts` is the only application analytics entry point. It
initializes the standard `dataLayer` startup event and asynchronously inserts one
Web GTM script, guarded by a stable script ID. Nuxt runs it once per browser app,
outside SSR; navigation does not rerun it. It does not wait for GTM, fetch remote
resources on the server, or register route hooks. A blocked script cannot block
rendering or authentication.

Runtime settings (already supported by the existing Compose `env_file`):

```dotenv
NUXT_PUBLIC_GTM_ID=GTM-5ZH9SBK5
NUXT_PUBLIC_ANALYTICS_ENABLED=true
```

Analytics defaults to disabled. Set the flag explicitly in the production
environment; leave it false for development/previews. Only the exact value `true`
enables loading; an empty or malformed container ID prevents loading. Both values
are public identifiers/settings. No authentication credentials, profile fields,
or user identifiers are added to analytics configuration or the data layer.

GA4 `G-1TKBVECQFW` and Cookiebot domain group
`ab6d9b9a-7826-4225-97d8-6e7995806765` stay configured in GTM only. The existing
Cookiebot Consent Initialization tag owns defaults and updates; GA4 initialization
and initial/history page-view triggers remain in the container. The loader is
marked `data-cookieconsent="ignore"` so the container can initialize consent.
There is no independent GA4/Cookiebot script, app consent override, second cookie
control, route tracker, server-side GTM, or noscript tracking iframe. A noscript
iframe would not run the JavaScript CMP consent sequence.

The repository defines no Content Security Policy header or meta policy. No
security headers or caching rules were removed or loosened. If Cloudflare or a
reverse proxy supplies a CSP, verify its production response and browser console.
Any necessary allowlist changes belong to the actual policy owner and should be
limited to the observed GTM, Cookiebot, and GA4 endpoints. Do not add wildcards or
`unsafe-inline`/`unsafe-eval` as a shortcut.

Public `/privacy-policy` and `/terms-of-service` are SSR pages with descriptions,
canonical URLs, English document language, semantic headings, and visible keyboard
focus. They do not opt into the named `auth0-sync` middleware. The shared root
footer links both pages. Colors, system typography, and spacing follow the existing
home page; its full-height layout now accounts for the footer.

Auth0's SDK/flow, existing user synchronization, schema/migrations, Neon, APIs,
Cloudflare cache headers and production Docker/deployment behavior are unchanged.
Public rendering and loader contracts now live in the general rendering suite.
It uses the installed Vue compiler/SSR renderer and a minimal DOM double, with no
browser or remote script loading. See [testing.md](testing.md) for current scope
and the intentionally removed integration coverage.

## Owner confirmation before production/legal branding approval

The public pages contain prose about the implemented service, with no invented
company identity, address, contact, retention deadline, or security assurance.
They are review drafts in this checkout, not confirmation of legal compliance or
Google OAuth branding approval. Resolve these items before approving publication:

- Supply the verified operator/controller legal identity and a working public
  privacy/support contact and request procedure. Neither is established in the
  repository; the public text intentionally does not invent them. Add confirmed
  details to the pages before legal approval.
- Confirm applicable jurisdictions, intended audience/age rules, processing legal
  bases, statutory disclosures, rights/complaint procedures, and any international
  transfer terms. Do not infer these from the `.in` domain or choose a governing
  law, court, age limit, warranty waiver, or liability cap without authorization.
- Confirm account/provider retention, backups, deletion handling, and response
  procedures. The code implements neither automatic account deletion nor a
  self-service deletion UI; signing out does not delete the database record. No
  fixed retention period is asserted.
- Confirm actual provider arrangements/processing locations, Google data sharing,
  retention settings, consent regions, and whether any GTM-managed tags go beyond
  the supplied GA4/Cookiebot setup. No account-profile analytics mapping is added
  here, but externally managed GTM tags must also be reviewed for DOM scraping,
  user IDs, sensitive URLs/query strings, and other personal data.
- Approve Advanced Consent Mode v2's possible cookieless processing against the
  applicable requirements and the policy text. Denying analytics storage is not
  described as blocking all network requests or guaranteeing anonymity.
- Confirm Google OAuth branding/verification requirements for the actual app,
  operator identity, authorized domains, and public homepage/privacy/terms URLs.
  Repository checks cannot establish Google approval or ownership verification.

The consent wording follows Google's
[Consent Mode overview](https://developers.google.com/tag-platform/security/concepts/consent-mode)
and [Cookiebot setup guidance](https://support.google.com/tagmanager/answer/14546767?hl=en).
These sources describe vendor behavior, not proof of this production container's
settings or collection.

## Verification and release checklist

Run `npm run check:all` and `npm run test:all`. The replacement general-purpose
suite checks actual Vue component SSR output/metadata and isolated loader opt-in,
identifier validation, single insertion, asynchronous loading, and startup data.
It does not launch Chrome, prove hydration or SPA behavior, simulate a real blocked
browser script, inspect real GTM tags, or establish consent handling. Build-secret
scanning remains in the single production build. No database or external service
is required. See [the testing guide](testing.md) for execution results and limits.

Before the owner-approved production release, confirm the legal details above
and supply production runtime settings. After an approved deployment, check in a
real browser on `https://www.skyinnk.in`:

1. Inspect response CSP and browser console, and verify both legal URLs work
   directly while signed out, including on mobile.
2. Use Tag Assistant to verify a single `GTM-5ZH9SBK5` load and Cookiebot Consent
   Initialization before GA4 initialization. Verify the correct domain group and
   measurement ID. The existing container was not inspected or modified here.
3. With fresh browser storage, test no decision, rejection, acceptance, a saved
   choice, and revocation through Cookiebot's existing privacy control. Check all
   four v2 states (`analytics_storage`, `ad_storage`, `ad_user_data`,
   `ad_personalization`) and actual cookies/network behavior. Check cookieless
   behavior when denied rather than expecting zero Google requests.
4. Verify exactly one GA4 `page_view` per initial page and SPA navigation, using
   Tag Assistant/network/GA4 DebugView as appropriate. Check GA4 initialization
   does not also send a duplicate automatic page view or history event alongside
   the existing GTM page-view tag. Any correction belongs in GTM, not a Nuxt route
   hook. Inspect payloads for credentials, profile data, and sensitive URLs.
5. Block GTM in the browser and confirm public navigation and real Auth0
   login/logout still work.

Local fixtures cannot verify live Cookiebot consent handling, actual GA4
collection, upstream CSP, or production OAuth branding acceptance. No push,
merge, deployment, or external container change is part of this implementation.
