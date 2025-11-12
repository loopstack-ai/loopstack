import type { EnvironmentService, Environment } from '../types'

export class LocalEnvironmentService implements EnvironmentService {
  private getLocalEnvironment(): Environment {
    return {
      id: 'local',
      name: 'Local Environment',
      url: 'http://localhost:8000',
    }
  }

  async getEnvironments(): Promise<Environment[]> {
    return [this.getLocalEnvironment()]
  }

  async getEnvironment(): Promise<Environment> {
    return this.getLocalEnvironment()
  }

  async updateEnvironment(): Promise<void> {
    throw new Error('Cannot update the local environment')
  }

  async deleteEnvironment(): Promise<void> {
    throw new Error('Cannot delete the local environment')
  }

  async testConnection(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      return response.ok
    } catch {
      return false
    }
  }
}