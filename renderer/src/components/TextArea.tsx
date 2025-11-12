import { RefObject } from "react";
import { Input } from "antd";

const { TextArea: AntTextArea } = Input;

interface TextAreaProps {
  type: "original" | "translated";
  title: string;
  value: string;
  onChange?: (value: string) => void;
  onScroll: () => void;
  ref: RefObject<HTMLTextAreaElement | HTMLDivElement | null>;
  placeholder?: string;
  isTranslating?: boolean;
  onCopy?: () => void;
  isCopied?: boolean;
}

export const TextArea = ({
  type,
  title,
  value,
  onChange,
  onScroll,
  ref,
  placeholder,
  isTranslating,
  onCopy,
  isCopied,
}: TextAreaProps) => {
  return (
    <div className="text-area-container">
      <h3 className="area-title">{title}</h3>
      {type === "original" ? (
        <AntTextArea
          ref={ref as RefObject<HTMLTextAreaElement | null>}
          className="text-area original-text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onScroll={onScroll}
          placeholder={placeholder}
          allowClear
          autoSize={{ minRows: 3, maxRows: 10 }}
          autoFocus
          style={{
            resize: 'none',
            fontFamily: 'inherit'
          }}
        />
      ) : (
        <>
          <div
            ref={ref as RefObject<HTMLDivElement | null>}
            className="text-area translated-text"
            onScroll={onScroll}
          >
            {isTranslating ? (
              <span className="placeholder">正在翻译中...</span>
            ) : (
              value || (
                <span className="placeholder">翻译结果将显示在这里</span>
              )
            )}
          </div>
          {value && !isTranslating && onCopy && (
            <button onClick={onCopy} className="copy-button">
              {isCopied ? "✓ 已复制" : "复制"}
            </button>
          )}
        </>
      )}
    </div>
  );
};
