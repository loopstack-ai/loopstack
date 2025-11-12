import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { StudioProvider } from './providers/StudioProvider'
import { useRouter } from './routing/LocalRouter'
import { LocalEnvironmentService } from './services/LocalEnvironmentService'
import { EnvironmentList } from './components/EnvironmentList'

function AppContent() {
  const router = useRouter()
  const service = new LocalEnvironmentService()

  return (
    <StudioProvider router={router} service={service}>
      <div style={{ padding: '2rem' }}>
        <header>
          <h1>Loopstack Studio</h1>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<EnvironmentList />} />
            <Route path="/environment" element={<div>Environment Detail (Local)</div>} />
            <Route path="/environment/settings" element={<div>Environment Settings (Local)</div>} />
          </Routes>
        </main>
      </div>
    </StudioProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}