import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { StatusProvider } from "./context/StatusContext";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { ConfigPage } from "./pages/Config";
// import { SchedulePage } from "./pages/Schedule"; // hidden — schedule pipeline WIP, not deleted
import { Logs } from "./pages/Logs";
import { Profile } from "./pages/Profile";
import { UsersPage } from "./pages/Users";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route
              element={
                <StatusProvider>
                  <Layout />
                </StatusProvider>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="/config" element={<ConfigPage />} />
              {/* <Route path="/schedule" element={<SchedulePage />} /> */} {/* hidden — schedule pipeline WIP, not deleted */}
              <Route path="/logs" element={<Logs />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
