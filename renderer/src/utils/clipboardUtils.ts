/**
 * 文档说明：剪贴板相关工具函数。
 *
 * 本模块封装了将图片数据写入系统剪贴板的通用方法，避免在多个组件中重复实现
 * fetch → Blob → ClipboardItem → navigator.clipboard.write 的流程。
 */

/**
 * 将 data URL 格式的图片写入系统剪贴板。
 *
 * @param {string} imageData - data URL 格式的图片数据（例如：data:image/png;base64,...）
 * @returns {Promise<void>} 写入完成后的 Promise
 *
 * @throws {Error} 当前环境不支持剪贴板写入或写入失败时抛出错误
 *
 * @example
 * await copyImageToClipboard("data:image/png;base64,....");
 */
export async function copyImageToClipboard(imageData: string): Promise<void> {
  if (!imageData) {
    throw new Error("图片数据为空，无法复制到剪贴板");
  }

  if (!navigator.clipboard || typeof navigator.clipboard.write !== "function") {
    throw new Error("当前环境不支持图片复制到剪贴板");
  }

  const response = await fetch(imageData);
  const blob = await response.blob();

  const mimeType = blob.type || "image/png";
  const clipboardItem = new ClipboardItem({
    [mimeType]: blob,
  });

  await navigator.clipboard.write([clipboardItem]);
}

