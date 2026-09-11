import { z } from 'zod';
import { BaseWorkflow, type RunContext, Transition, Workflow } from '@loopstack/common';

const StarterSchema = z.object({
  message: z.string().default('hello from the example scaffold'),
});
type StarterArgs = z.infer<typeof StarterSchema>;

/**
 * Placeholder starter workflow for a new registry example — dependency-free so the freshly-copied package
 * builds and boots in the package-tester without any secrets. Replace its body (and add provider deps to
 * the package) with the real example you are demonstrating.
 */
@Workflow({
  title: 'Example - Starter',
  description: 'Placeholder workflow for a new registry example. Replace with the real example logic.',
  schema: StarterSchema,
})
export class StarterWorkflow extends BaseWorkflow<StarterArgs> {
  @Transition({ to: 'end' })
  start(_state: Record<string, unknown>, ctx: RunContext<StarterArgs>) {
    this.setResult({ echoed: ctx.args.message });
  }
}
