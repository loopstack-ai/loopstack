---
"@loopstack/auth": patch
---

Declare `passport` as a direct dependency of `@loopstack/auth`.

`@loopstack/auth` configures Passport strategies internally but previously only
depended on `passport-jwt`/`passport-custom`/`@nestjs/passport`, leaving
`passport` itself to arrive via peer auto-install. Hosts that install with
`--legacy-peer-deps` (which skips peer auto-install) ended up without `passport`
at runtime. Pinning it as a real dependency guarantees it is always present.
