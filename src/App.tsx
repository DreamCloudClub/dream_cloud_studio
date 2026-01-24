import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Dashboard } from "@/pages/Dashboard"
import { CreateProjectWizard } from "@/pages/CreateProjectWizard"
import { Workspace } from "@/pages/Workspace"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create/project" element={<CreateProjectWizard />} />
        <Route path="/project/:projectId" element={<Workspace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
