import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 自定义窗口拖拽 Hook
 *
 * 提供完整的窗口拖拽逻辑，包括：
 * - 拖拽状态管理
 * - 高性能事件处理（RAF 节流）
 * - 指针捕获机制
 * - 兜底保护（失焦/隐藏时自动清理）
 *
 * @param options 配置选项
 * @param options.onBeginDrag 开始拖拽时的回调（通常调用主进程 IPC）
 * @param options.onDragMove 拖拽移动时的回调（通常调用主进程 IPC）
 * @param options.onEndDrag 结束拖拽时的回调（通常调用主进程 IPC）
 * @param options.excludeSelector 排除拖拽的区域选择器（如工具栏、按钮等）
 * @param options.containerRef 容器元素的 ref（用于指针捕获）
 *
 * @returns 返回拖拽处理器和状态
 * @returns dragHandlers 包含事件处理器的对象，可以通过展开运算符绑定到元素
 * @returns isDragging 当前是否正在拖拽
 * @returns containerRef 容器元素的 ref（如果未提供则自动创建）
 *
 * @example
 * ```tsx
 * const { dragHandlers, isDragging, containerRef } = useWindowDrag({
 *   onBeginDrag: () => window.electronAPI.beginDrag(),
 *   onDragMove: () => window.electronAPI.dragWindow(),
 *   onEndDrag: () => window.electronAPI.endDrag(),
 *   excludeSelector: ".no-drag-zone",
 * });
 *
 * return (
 *   <div
 *     ref={containerRef}
 *     className={isDragging ? "dragging" : ""}
 *     {...dragHandlers}
 *   >
 *     Content
 *   </div>
 * );
 * ```
 */
export function useWindowDrag(options: {
  onBeginDrag: () => void;
  onDragMove: () => void;
  onEndDrag: () => void;
  excludeSelector?: string;
  containerRef?: React.RefObject<HTMLDivElement>;
}) {
  const {
    onBeginDrag,
    onDragMove,
    onEndDrag,
    excludeSelector,
    containerRef: externalRef,
  } = options;

  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false);

  // 容器引用（用于指针捕获）
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = externalRef || internalRef;

  // RAF 节流标志，防止过度调用主进程
  const rafPendingRef = useRef(false);

  /**
   * 开始拖拽
   *
   * 关键技术点：
   * 1. 只响应鼠标左键（button === 0）
   * 2. 排除特定区域（如工具栏、按钮）
   * 3. 使用指针捕获确保拖拽过程中事件不丢失
   * 4. 通知主进程记录起始状态
   */
  const beginDrag: React.PointerEventHandler = useCallback(
    (e) => {
      // 只响应鼠标左键
      if (e.button !== 0) return;

      // 排除特定区域（如工具栏、按钮等）
      if (excludeSelector && (e.target as HTMLElement)?.closest(excludeSelector)) {
        return;
      }

      // 捕获指针，确保后续的 move/up 事件都能被当前元素接收
      // 即使鼠标移出元素边界，也能继续接收事件
      containerRef.current?.setPointerCapture(e.pointerId);

      setIsDragging(true);

      // 通知主进程开始拖拽，主进程会记录起始鼠标位置和窗口位置
      onBeginDrag();
    },
    [excludeSelector, containerRef, onBeginDrag]
  );

  /**
   * RAF 心跳函数
   *
   * 在下一帧更新时调用主进程移动窗口
   * 使用 RAF 可以：
   * 1. 与浏览器渲染同步，避免视觉撕裂
   * 2. 自动节流到 60fps
   * 3. 在后台标签页时自动暂停
   */
  const tickDrag = useCallback(() => {
    rafPendingRef.current = false;

    // 通知主进程更新窗口位置
    onDragMove();
  }, [onDragMove]);

  /**
   * 拖拽移动中
   *
   * 使用 requestAnimationFrame 进行节流：
   * - 如果已有待处理的 RAF，则跳过本次调用
   * - 否则请求下一帧回调
   *
   * 这样可以避免在同一帧内多次调用主进程，显著提升性能
   */
  const onPointerMove: React.PointerEventHandler = useCallback(() => {
    if (!isDragging) return;

    // RAF 节流：如果已有待处理的帧回调，跳过
    if (rafPendingRef.current) return;

    rafPendingRef.current = true;
    requestAnimationFrame(tickDrag);
  }, [isDragging, tickDrag]);

  /**
   * 结束拖拽
   *
   * 关键操作：
   * 1. 释放指针捕获
   * 2. 清理拖拽状态
   * 3. 取消待处理的 RAF
   * 4. 通知主进程清理拖拽状态
   */
  const endDrag: React.PointerEventHandler = useCallback(
    (e) => {
      if (!isDragging) return;

      try {
        // 释放指针捕获
        containerRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        // 忽略释放捕获失败的错误（如指针已释放）
      }

      setIsDragging(false);
      rafPendingRef.current = false;

      // 通知主进程结束拖拽，清理状态
      onEndDrag();
    },
    [isDragging, containerRef, onEndDrag]
  );

  /**
   * 兜底保护机制
   *
   * 在以下情况自动结束拖拽：
   * 1. 窗口失焦（blur）
   * 2. 页面隐藏（visibilitychange）
   *
   * 这些情况可能导致 pointerup 事件丢失，必须主动清理状态
   */
  useEffect(() => {
    const handleBlur = () => {
      if (isDragging) {
        setIsDragging(false);
        rafPendingRef.current = false;
        onEndDrag();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isDragging) {
        setIsDragging(false);
        rafPendingRef.current = false;
        onEndDrag();
      }
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isDragging, onEndDrag]);

  // 返回拖拽处理器和状态
  return {
    /**
     * 拖拽事件处理器，可以通过展开运算符绑定到容器元素
     *
     * @example
     * <div {...dragHandlers}>Content</div>
     */
    dragHandlers: {
      onPointerDown: beginDrag,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag, // 处理取消事件（如手势冲突）
    },

    /**
     * 当前是否正在拖拽
     * 可用于控制光标样式、UI 状态等
     */
    isDragging,

    /**
     * 容器元素的 ref
     * 如果使用者提供了 ref，则返回提供的 ref
     * 否则返回内部创建的 ref
     */
    containerRef,
  };
}
