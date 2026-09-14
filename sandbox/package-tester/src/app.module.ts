import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';

/**
 * package-tester — a minimal, throwaway harness for manually testing a registry example package in Studio.
 *
 * It ships bare (just LoopstackModule). The Registry Examples engineer wires the example module(s) under
 * test into the imports below — and adds their packages (and any provider modules they need, e.g. Claude /
 * LLM / HITL) to this app's package.json — then boots this app + Studio so the example's workflows can be
 * driven from the frontend.
 *
 * These edits are LOCAL, throwaway test wiring and MUST NOT be committed — a pre-commit hook in the checkout
 * blocks any commit that stages files under sandbox/package-tester.
 */
@Module({
  imports: [
    LoopstackModule.forRoot(),
    // EXAMPLE UNDER TEST — the engineer adds the example module import(s) here (and the dep in package.json),
    // e.g. `FooExamplesModule` from `@loopstack/foo-examples`. Remove before finishing (never committed).
  ],
})
export class AppModule {}
