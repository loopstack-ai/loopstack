// Public API exports
export * from './types'
export * from './components/EnvironmentList'
export * from './providers/StudioProvider'

// Override points documentation
export { OVERRIDE_POINTS } from './overrides'

// Default implementations (can be overridden via bundler aliases)
export { useRouter } from './routing/LocalRouter'
export { LocalEnvironmentService } from './services/LocalEnvironmentService'

// Default app for standalone use
export { default as App } from './App'