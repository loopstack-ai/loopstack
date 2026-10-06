---
'@loopstack/loopstack-module': minor
'@loopstack/auth': patch
---

Auth cookies can be scoped to a domain, and logout clears them reliably.

- `LoopstackModule.forRoot({ auth: { jwt: { cookieDomain } } })` sets the `Domain` attribute of the access and refresh
  cookies, falling back to the `JWT_COOKIE_DOMAIN` env var. Unset keeps them host-only on the API host.
- Logout clears both cookies with the same `Domain`, `Secure` and `SameSite=None` attributes they were set with, so the
  browser drops them when the Studio is served from a different site than the API.
