import { useNavigate } from 'react-router-dom'
import type { StudioRouter } from '../types'

export class LocalRouter implements StudioRouter {
  private navigate: ReturnType<typeof useNavigate>

  constructor(navigate: ReturnType<typeof useNavigate>) {
    this.navigate = navigate
  }

  navigateToEnvironmentList() {
    this.navigate('/')
  }

  navigateToEnvironmentDetail() {
    // Local only has one environment, ignore ID
    this.navigate('/environment')
  }

  navigateToEnvironmentSettings() {
    this.navigate('/environment/settings')
  }

  getCurrentEnvironmentId() {
    return 'local'
  }
}

export const useRouter = (): StudioRouter => {
  const navigate = useNavigate()
  return new LocalRouter(navigate)
}