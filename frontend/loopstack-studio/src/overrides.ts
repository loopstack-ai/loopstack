/**
 * Override Points for Loopstack Studio
 *
 * These modules can be replaced with custom implementations using bundler aliases.
 * All implementations must adhere to the interfaces defined in src/types/index.ts
 *
 * @example Vite Configuration
 * ```typescript
 * // vite.config.ts
 * import { defineConfig } from 'vite'
 * import path from 'path'
 *
 * export default defineConfig({
 *   resolve: {
 *     alias: {
 *       '@loopstack/loopstack-studio/routing/LocalRouter':
 *         path.resolve(__dirname, 'src/overrides/CloudRouter'),
 *       '@loopstack/loopstack-studio/services/LocalEnvironmentService':
 *         path.resolve(__dirname, 'src/overrides/CloudEnvironmentService'),
 *     }
 *   }
 * })
 * ```
 *
 * @example Webpack Configuration
 * ```javascript
 * // webpack.config.js
 * module.exports = {
 *   resolve: {
 *     alias: {
 *       '@loopstack/loopstack-studio/routing/LocalRouter':
 *         path.resolve(__dirname, 'src/overrides/CloudRouter'),
 *     }
 *   }
 * }
 * ```
 */
export const OVERRIDE_POINTS = {
  /**
   * Router implementation
   * Must implement: StudioRouter interface
   * Default: LocalRouter (single environment, simple paths)
   */
  router: '@loopstack/loopstack-studio/routing/LocalRouter',

  /**
   * Environment service implementation
   * Must implement: EnvironmentService interface
   * Default: LocalEnvironmentService (localStorage-based, single environment)
   */
  environmentService: '@loopstack/loopstack-studio/services/LocalEnvironmentService'
} as const;

export type OverridePoint = (typeof OVERRIDE_POINTS)[keyof typeof OVERRIDE_POINTS];
