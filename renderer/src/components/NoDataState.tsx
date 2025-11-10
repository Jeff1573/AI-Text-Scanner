import "../assets/styles/screenshot-viewer.css";

export const NoDataState = () => {
  // 保留全屏深色覆盖容器，避免白屏；不显示任何文案或图标
  return <div className="screenshot-viewer loading" />;
};
