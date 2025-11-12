import { useEffect, useState } from 'react'
import { useStudio } from '../providers/StudioProvider'
import type { Environment } from '../types'

export const EnvironmentList = () => {
  const { router, service } = useStudio()
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    service.getEnvironments().then((envs) => {
      setEnvironments(envs)
      setLoading(false)
    })
  }, [service])

  if (loading) return <div>Loading...</div>

  return (
    <div className="environment-list">
      <h2>Environments</h2>
      {environments.map((env) => (
        <div
          key={env.id}
          className="environment-card"
          onClick={() => router.navigateToEnvironmentDetail(env.id)}
          style={{ cursor: 'pointer', padding: '1rem', border: '1px solid #ccc', margin: '0.5rem 0' }}
        >
          <h3>{env.name}</h3>
          <p>{env.url}</p>
        </div>
      ))}
    </div>
  )
}