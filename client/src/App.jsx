import { Navigate, Route, Routes } from 'react-router-dom'
import { FighterStatusRoute, GuestRoute, ProtectedRoute } from './routes/RouteGuards.jsx'
import ArenaPage from './pages/ArenaPage.jsx'
import AuthPage from './pages/AuthPage.jsx'
import BattleHistoryPage from './pages/BattleHistoryPage.jsx'
import BattleResultPage from './pages/BattleResultPage.jsx'
import CreateFighterPage from './pages/CreateFighterPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import EquipmentCollectionPage from './pages/EquipmentCollectionPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import PublicProfilePage from './pages/PublicProfilePage.jsx'
import StudentsPage from './pages/StudentsPage.jsx'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route element={<GuestRoute />}>
        <Route path="/register" element={<AuthPage key="register" mode="register" />} />
        <Route path="/login" element={<AuthPage key="login" mode="login" />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<FighterStatusRoute key="has-fighter" />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/arena" element={<ArenaPage />} />
          <Route path="/history" element={<BattleHistoryPage />} />
          <Route path="/collection" element={<EquipmentCollectionPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/battles/:id" element={<BattleResultPage />} />
        </Route>
        <Route element={<FighterStatusRoute key="needs-creation" needsCreation />}>
          <Route path="/create-fighter" element={<CreateFighterPage />} />
        </Route>
      </Route>
      <Route path="/profile/:username" element={<PublicProfilePage />} />
      <Route path="/leaderboards" element={<LeaderboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
