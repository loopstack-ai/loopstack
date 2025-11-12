export interface Environment {
  id: string
  name: string
  url: string
}

export interface EnvironmentConfig {
  name: string
  url: string
}

export interface EnvironmentService {
  getEnvironments(): Promise<Environment[]>
  getEnvironment(id: string): Promise<Environment>
  updateEnvironment(id: string, config: EnvironmentConfig): Promise<void>
  deleteEnvironment(id: string): Promise<void>
  testConnection(url: string): Promise<boolean>
}

export interface StudioRouter {
  navigateToEnvironmentList(): void
  navigateToEnvironmentDetail(envId: string): void
  navigateToEnvironmentSettings(envId: string): void
  getCurrentEnvironmentId(): string | null
}