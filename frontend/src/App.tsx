import { createHashRouter, RouterProvider } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/pages/Dashboard";
import { NotesPage } from "@/pages/Notes";
import { PlannerPage } from "@/pages/Planner";
import { PomodoroPage } from "@/pages/Pomodoro";
import { SettingsPage } from "@/pages/Settings";
import { TasksPage } from "@/pages/Tasks";

// Hash routing works identically in the browser and inside a WebView2/Tauri
// shell that loads from a file:// or custom protocol origin.
const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "pomodoro", element: <PomodoroPage /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "planner", element: <PlannerPage /> },
      { path: "notes", element: <NotesPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
