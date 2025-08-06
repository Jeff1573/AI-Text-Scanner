import { useEffect, useState } from 'react';
import '../assets/styles/analysis-result.css';
import { TitleBar } from '../components';

export const ResultPage = () => {
  const [result, setResult] = useState('');

  useEffect(() => {
    // 监听主进程传递的识别结果
    window.electronAPI.onResultData((data: string) => {
      setResult(data);
    });
    return () => {
      window.electronAPI.removeResultDataListener();
    };
  }, []);

  return (
    <div className="analysis-result">
      <TitleBar />
      {/* <div className="analysis-header">
        <h3>AI 识别结果</h3>
      </div> */}
      <div className="analysis-content">
        <div className="result-text">
          {result
            ? result.split('\n').map((line, idx) => <p key={idx}>{line}</p>)
            : <span style={{ color: '#ccc' }}>暂无识别内容</span>}
        </div>
      </div>
    </div>
  );
};