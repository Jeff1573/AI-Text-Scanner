import React, { useMemo, useCallback } from "react";
import DOMPurify from "dompurify";
import "../assets/styles/release-notes.css";

interface ReleaseNotesViewerProps {
  html?: string | null;
  className?: string;
}

/**
 * ReleaseNotesViewer
 * 仅用于展示来自 GitHub Releases 的 HTML 发布说明。
 * - 在渲染前使用 DOMPurify 进行严格白名单净化；
 * - 禁止脚本/事件/内联样式与图片等富媒体；
 * - 链接点击仅允许 http/https，并委托主进程打开外部浏览器；
 * - 若内容非 HTML 或为空，则回退为纯文本显示。
 */
export const ReleaseNotesViewer: React.FC<ReleaseNotesViewerProps> = ({
  html,
  className,
}) => {
  // 判定字符串是否“看起来像”HTML
  const isLikelyHtml = useMemo(() => {
    if (!html) return false;
    const raw = html.trim();
    if (!raw) return false;
    // 包含显式标签或常见实体编码（&lt;）视作可能的 HTML
    return /<\s*[a-z!][\w:-]*/i.test(raw) || /&lt;/.test(raw);
  }, [html]);

  // 可选的实体解码（当仅检测到实体时）
  const maybeDecode = useCallback((s: string): string => {
    if (!/&lt;|&gt;|&amp;|&quot;|&#39;/.test(s)) return s;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(s, "text/html");
      return doc.documentElement.textContent || s;
    } catch {
      return s;
    }
  }, []);

  const sanitized = useMemo(() => {
    if (!html) return "";

    const source = isLikelyHtml && !/<\s*[a-z!][\w:-]*/i.test(html)
      ? maybeDecode(html)
      : html;

    // 仅保留安全且必要的标签/属性；禁止图片与脚本等
    const ALLOWED_TAGS = [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "ul",
      "ol",
      "li",
      "a",
      "strong",
      "em",
      "code",
      "pre",
      "blockquote",
      "br",
      "hr",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "span",
    ];
    const ALLOWED_ATTR = ["href", "title", "target", "rel"];

    const clean = DOMPurify.sanitize(source, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      FORBID_TAGS: [
        "img",
        "script",
        "style",
        "iframe",
        "object",
        "embed",
        "audio",
        "video",
        "svg",
        "math",
        "form",
        "input",
        "button",
        "select",
        "textarea",
        "link",
        "meta",
        "base",
      ],
      // 仅允许 http/https 协议，拒绝相对链接、javascript: 等
      ALLOWED_URI_REGEXP: /^(?:https?:)/i,
      // 防御已知 XSS 载荷
      USE_PROFILES: { html: true },
    });

    return clean;
  }, [html, isLikelyHtml, maybeDecode]);

  const onClick = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // 事件委托：捕获 <a> 点击
      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href") || "";
      if (!/^https?:/i.test(href)) {
        // 非 http/https 链接直接拦截
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      try {
        if (window?.electronAPI?.openExternal) {
          await window.electronAPI.openExternal(href);
        } else {
          // 回退：尽量在新窗口中打开并隔离
          window.open(href, "_blank", "noopener,noreferrer");
        }
      } catch {
        // 静默失败，避免影响其它交互
      }
    },
    []
  );

  if (!html || !sanitized) {
    return (
      <div className={"release-notes " + (className || "")}>
        <div className="rn-empty">暂无更新说明</div>
      </div>
    );
  }

  // 若不是 HTML，则以纯文本显示
  if (!isLikelyHtml) {
    return (
      <div className={"release-notes " + (className || "")}
           onClick={onClick}
           style={{ whiteSpace: "pre-wrap" }}>
        {html}
      </div>
    );
  }

  return (
    <div
      className={"release-notes " + (className || "")}
      onClick={onClick}
      // 通过净化后的 HTML 进行受控渲染
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};

export default ReleaseNotesViewer;

