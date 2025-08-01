import { useState, useEffect } from "react";
import { MainApp } from "./components/MainApp";
import { ScreenshotViewer } from "./components/ScreenshotViewer";

// 路由组件
function App() {
  const [currentRoute, setCurrentRoute] = useState("main");

  useEffect(() => {
    // 根据URL hash确定当前路由
    const hash = window.location.hash.slice(1);
    if (hash === "/screenshot") {
      setCurrentRoute("screenshot");
    } else {
      setCurrentRoute("main");
    }
  }, []);

  if (currentRoute === "screenshot") {
    return <ScreenshotViewer />;
  }

  return <MainApp />;
}

export default App;
