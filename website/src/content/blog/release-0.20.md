---
title: "Less Boilerplate, More Power: What's New in Loopstack v0.20"
description: 'Announcing Loopstack v0.20 with property decorators, JEXL expressions, explicit context namespaces, a unified project template, and a visual workflow debugger.'
date: '2026-02-11'
author: 'Loopstack Team'
tags: ['Release', 'v0.20']
draft: true
img: '/images/blog/release-0-20.png'
---

We've been listening to your feedback, and the theme of this release is simple: get out of your way.

This update trims the ceremony around defining blocks, gives your templates a proper expression language, and makes context access explicit and predictable. Here's the rundown.

## Decorators That Make Sense

The old `@WithArguments` and `@WithState` class decorators always felt a bit disconnected — you'd define a schema at the class level, then use it on a property somewhere else. We've fixed that.

`@Input` and `@State` are now **property decorators**. You put them right on the property they describe. It's a small change that makes the code read more naturally. And while we were at it, we dropped `@Injectable()` entirely. Every block type — Workflows, Tools, Documents, Workspaces — just works without it now.

We also added three new decorators. `@Output()` lets you define a workflow's return value cleanly. `@DefineHelper()` lets you create custom Handlebars helpers that are immediately available in your YAML templates. And `@Runtime()` gives you direct access to runtime context like transition payloads.

## A Real Expression Language

This is the big one. The old `${ }` syntax was useful but limited — you could access properties and not much else.

We've replaced it with **JEXL expressions** (`${{ }}`), which give you comparisons, logic, arithmetic, ternaries, object and array literals, and string concatenation — all while preserving data types. A number stays a number. A boolean stays a boolean. No more coercing everything to strings and hoping for the best.

Handlebars is still there for inline string interpolation, and you can now extend it with your own helpers using `@DefineHelper()`. The built-in helpers we used to ship (`eq`, `gt`, `add`, `formatDate`, and friends) have been retired — JEXL covers those use cases natively, and custom helpers handle the rest.

## Clearer Context, Fewer Surprises

Templates used to let you access state properties directly — `{{ total }}` would just resolve against the workflow state. That was convenient until you had a naming collision or couldn't tell where a value was coming from.

Now everything lives under an explicit namespace: `state.`, `args.`, `runtime.`, `result.`. It's a bit more typing, but your templates become self-documenting. When you see `{{ state.total }}`, there's zero ambiguity about what you're reading.

## One Project, One Command

We've merged the frontend and backend into a single project template. Previously you had to spin up a separate Docker image to run the frontend — that's gone. Run `npx create-loopstack-app my-project` and you get everything wired up and ready to go. One repo, one dev server, no juggling containers just to get started.

## Abstract Classes Are Gone

This one's been a long time coming. Workflows, Tools, and other block types used to require extending abstract base classes. It added a layer of indirection that made the code harder to follow, especially for newcomers. That's been removed entirely — your blocks are just classes now. Combined with dropping `@Injectable()`, the amount of framework-imposed ceremony is dramatically lower.

## See Your Workflows

The frontend Studio now has a visual debugger that renders workflows as flowcharts. You can see the full shape of a workflow, trace transitions, and inspect state at each step. It's the kind of tool that turns a 20-minute debugging session into a 30-second one.

## Wrapping Up

This release is about reducing friction. Fewer decorators to remember, a more capable expression language, and explicit context that's easier to reason about. If you've been putting off a refactor, this is a good time — the migration is straightforward and the payoff is immediate.

_— Your Loopstack Team_

---

Ready to join the conversation? Check out our [GitHub](https://github.com/loopstack-ai/loopstack), connect with us on [Discord](https://discord.gg/svAHrkxKZg), and follow our journey on [LinkedIn](https://www.linkedin.com/company/loopstack-ai/).
