import { createHashRouter } from "react-router-dom";
import { Layout } from "../components/Layout";
import { HomePage } from "../pages/HomePage";
import { SettingsPage } from "../pages/SettingsPage";
import { ScreenshotViewer } from "../components";
import { ResultPage } from "../pages/ResultPage";
import { ImageAnalysisPage } from "../pages/ImageAnalysisPage";
import { ScreenshotPreviewPage } from "../pages/ScreenshotPreviewPage";

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
    ],
  },
  {
    path: "screenshot",
    element: <ScreenshotViewer />,
  },
  {
    path: "screenshot-preview",
    element: <ScreenshotPreviewPage />,
  },
  {
    path: "result",
    element: <ResultPage />,
  },
  {
    path: "image-analysis",
    element: <ImageAnalysisPage />,
  },
]);
