import { useCallback } from 'react';
import '../assets/styles/analysis-result.css';

interface AnalysisResultProps {
  result: string;
  error: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  } | null;
  onClose: () => void;
  onRetry?: () => void;
}

export const AnalysisResult = ({ 
  result, 
  error, 
  usage, 
  onClose, 
  onRetry
}: AnalysisResultProps) => {
  const handleCopy = useCallback(() => {
    if (result) {
      navigator.clipboard.writeText(result);
    }
  }, [result]);

  const containerClass = `analysis-result ${error ? 'error' : ''}`;

  if (error) {
    return (
      <div className={containerClass}>
        <div className="analysis-header">
          <h3>分析失败</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="analysis-content">
          <div className="error-message">
            <span className="error-icon">❌</span>
            <p>{error}</p>
          </div>
          {onRetry && (
            <button className="retry-btn" onClick={onRetry}>
              重试
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className={containerClass}>
      <div className="analysis-header">
        <h3>AI 分析结果</h3>
        <div className="header-actions">
          <button className="copy-btn" onClick={handleCopy} title="复制结果">
            📋
          </button>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
      </div>
      
      <div className="analysis-content">
        <div className="result-text">
          {result.split('\n').map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
        
        {usage && (
          <div className="usage-info">
            <span>Token使用: {usage.total_tokens}</span>
            <span>提示: {usage.prompt_tokens}</span>
            <span>回复: {usage.completion_tokens}</span>
          </div>
        )}
      </div>
    </div>
  );
}; 