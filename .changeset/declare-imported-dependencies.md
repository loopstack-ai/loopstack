---
'@loopstack/api': patch
'@loopstack/auth': patch
'@loopstack/loopstack-module': patch
'@loopstack/oauth-module': patch
'@loopstack/remote-client': patch
---

Packages declare the packages their type-only imports use too, because those imports end up in the published `.d.ts`
files.

- `@loopstack/api`: optional peer dependency `express`, whose `Request` type the SSE controller uses.
- `@loopstack/auth`: optional peer dependency `express`, whose `Request` and `Response` types the auth controller and
  strategies use.
- `@loopstack/loopstack-module`: the `cors` option takes its type from `@loopstack/api`.
- `@loopstack/oauth-module`: optional peer dependency `express`, whose `Response` type the OAuth callback controller
  uses.
- `@loopstack/remote-client`: depends on `@loopstack/contracts`, whose types its environment config uses.
