import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { PostEditor } from './components/PostEditor'
import { EventEditor } from './components/EventEditor'
import { TaskEditor } from './components/Tasks'
import { CommandPalette } from './components/CommandPalette'
import { Toaster } from './components/Toaster'
import { Today } from './pages/Today'
import { CalendarPage } from './pages/CalendarPage'
import { Pipeline } from './pages/Pipeline'
import { TasksPage } from './pages/TasksPage'
import { Clients } from './pages/Clients'
import { ClientWorkspace } from './pages/ClientWorkspace'
import { Settings } from './pages/Settings'
import { PrintPlan } from './pages/PrintPlan'
import { Providers } from './pages/Providers'
import { AuthGate } from './components/AuthGate'
import { Tutorial } from './components/Tutorial'
import { AvatarPicker } from './components/UserAvatar'

export default function App() {
  return (
    <BrowserRouter>
      <AuthGate>
      <Routes>
        <Route path="/clienti/:id/stampa" element={<PrintPlan />} />
        <Route element={<Layout />}>
          <Route index element={<Today />} />
          <Route path="calendario" element={<CalendarPage />} />
          <Route path="approvazioni" element={<Pipeline />} />
          <Route path="attivita" element={<TasksPage />} />
          <Route path="clienti" element={<Clients />} />
          <Route path="clienti/:id" element={<ClientWorkspace />} />
          <Route path="impostazioni" element={<Settings />} />
          <Route path="impostazioni/ai" element={<Providers />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <PostEditor />
      <EventEditor />
      <TaskEditor />
      <CommandPalette />
      <Tutorial />
      <AvatarPicker />
      </AuthGate>
      <Toaster />
    </BrowserRouter>
  )
}
