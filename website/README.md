# loopstack.ai

The documentation, the blog and the marketing pages, built with [Astro](https://astro.build) and
[Starlight](https://starlight.astro.build).

## The docs are read in place

Starlight's `docs` collection globs the monorepo directly: `docs/**` plus each registry package's
`README.md`. There is no copy of the documentation in this folder and no sync step. Editing a file
under `docs/` updates the site, and the dev server picks it up without a restart.

Entry ids are mapped so every URL is stable: `docs/learn/introduction.md` serves at
`/docs/learn/introduction`, and `registry/features/git-module/README.md` at
`/docs/registry/features/git-module`.

## Commands

| Command           | What it does                                                              |
| ----------------- | ------------------------------------------------------------------------- |
| `npm run dev`     | Dev server on http://localhost:4321                                       |
| `npm run build`   | Full build: regenerates llms.txt, builds, then verifies every anchor link |
| `npm run preview` | Serves the built site                                                     |
| `npm run llms`    | Regenerates `public/llms.txt` and friends on their own                    |

`npm run build` runs three steps. `prebuild` generates `public/llms.txt`, `public/llms-full.txt` and
the per-document files under `public/llms/` from `../docs`; those are gitignored because they are
build output. The build itself validates every internal link. `postbuild` then checks that every
`#fragment` points at a heading that exists.

## Writing a blog post

Add a Markdown file to `src/content/blog/` with `title`, `description`, `date`, `author` and `tags`.
`img` points at an image in `public/images/blog/`. Set `draft: true` to keep a post out of the
production build while still seeing it on the dev server.

## Deployment

Amplify builds this folder from the repo root's `amplify.yml`. Response headers live in
`customHttp.yml`.

### Repointing the existing Amplify app

The custom domain is attached to the app that currently builds the old `loopstack-ai/website` repo,
and an Amplify domain can only belong to one app. Repointing that app is therefore preferable to
creating a new one, which would mean detaching the domain and waiting on certificate revalidation.

Two properties have to change, and only one of them is editable in the console.

**1. The platform.** The old app is a Next.js SSR app, so its platform is `WEB_COMPUTE`. This site is
pure static output, which needs `WEB`. Getting this wrong is the most likely cause of a broken deploy.

**2. The repository.** The console does not offer this; the API does.

```bash
APP_ID=<the existing app id>

aws amplify update-app \
  --app-id "$APP_ID" \
  --platform WEB \
  --repository https://github.com/loopstack-ai/loopstack \
  --access-token <a GitHub token with access to the loopstack repo>
```

Confirm it took before going further:

```bash
aws amplify get-app --app-id "$APP_ID" --query 'app.{platform:platform,repo:repository}'
```

### The rest of the move

1. **Get the site onto the deployed branch.** The app builds `main`. Commit this work and merge it
   into `main`, so the branch Amplify builds actually contains `website/`.
2. **Tell Amplify where the app root is.** Set `AMPLIFY_MONOREPO_APP_ROOT` to `website` in the branch's
   environment variables. The `applications:`/`appRoot:` build spec alone is not enough.
3. **Remove the old environment variables**, all of which belonged to the Next.js site and are now
   unused: `RESEND_API_KEY`, `NOTION_DB`, `NOTION_SECRET`, `CACHE_INVALIDATION_SECRET` and
   `NEXT_PUBLIC_HUB_URL`.
4. **Add the redirects** under Rewrites and redirects, so old links survive:

   | Source          | Target           | Type |
   | --------------- | ---------------- | ---- |
   | `/blog/id/<*>`  | `/blog/<*>`      | 301  |
   | `/registry`     | `/docs/registry` | 301  |
   | `/registry/<*>` | `/docs/registry` | 301  |

5. **Build the branch** and check the Amplify-generated URL before anyone reaches the domain.

### Check before you trust the domain

- **Trailing slashes.** The site is built with `trailingSlash: 'never'`, so `/docs/learn/introduction`
  must serve directly rather than redirecting to `/docs/learn/introduction/`. Confirm on the Amplify
  URL; if it redirects, the canonical tags and the URLs in `llms.txt` stop matching what is served.
- **`customHttp.yml` is picked up.** `curl -I` the deployed site and look for the `Link` header
  advertising `llms.txt`. For a monorepo app this file is expected at the app root, which is where it
  is, but it is worth confirming rather than assuming.
- **A page, the docs, the blog and `llms.txt`** all load, and `/blog/id/<some-post>` redirects.

### Fallback

If the repository cannot be changed on the existing app, create a new one from `loopstack-ai/loopstack`,
build and verify it on its Amplify URL, and only then move the domain: remove it from the old app and
add it to the new one. Expect a gap while the certificate revalidates, so do it in a quiet window and
keep the old app until the new one serves the domain correctly.
