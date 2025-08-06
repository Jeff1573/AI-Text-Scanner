import { createHashRouter } from "react-router-dom";
import { Layout } from "../components/Layout";
import { HomePage } from "../pages/HomePage";
import { SettingsPage } from "../pages/SettingsPage";
import { ScreenshotViewer } from "../components";
import { ResultPage } from "../pages/ResultPage";

export const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
      {
        path: "screenshot",
        element: <ScreenshotViewer />,
      },
    ],
  },
  {
    path: "result",
    element: <ResultPage />,
  },
]);
