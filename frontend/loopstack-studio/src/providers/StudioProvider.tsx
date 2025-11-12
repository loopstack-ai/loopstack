import { createContext, useContext } from 'react'
import type { StudioRouter, EnvironmentService } from '../types'
import type { ReactNode } from 'react'

interface StudioContext {
  router: StudioRouter
  service: EnvironmentService
}

const StudioContext = createContext<StudioContext | null>(null)

export const StudioProvider = ({
                                 children,
                                 router,
                                 service
                               }: {
  children: ReactNode
  router: StudioRouter
  service: EnvironmentService
}) => {
  return (
    <StudioContext.Provider value={{ router, service }}>
      {children}
    </StudioContext.Provider>
  )
}

export const useStudio = () => {
  const context = useContext(StudioContext)
  if (!context) {
    throw new Error('useStudio must be used within StudioProvider')
  }
  return context
}