; AI Text Scanner NSIS 自定义脚本（精简版）
; 目标：仅使用 electron-builder 官方支持钩子，避免修改安装头/压缩参数。
; 说明：快捷方式/文件关联等由 electron-builder 配置负责，此处不重复创建。

; 自定义头部（不做改写，保留扩展点）
!macro customHeader
  ; 保留占位，避免使用 !system 或修改可执行头
!macroend

; 预初始化（不写注册表，仅保持默认行为）
!macro preInit
  ; 保持空实现，避免在初始化阶段写入注册表导致权限/架构冲突
!macroend

; 初始化阶段（仅保留占位）
!macro customInit
  ; 如需覆盖安装策略，请在此处添加逻辑；当前保持默认
!macroend

; 安装阶段（不重复创建快捷方式/文件关联，交由 electron-builder）
!macro customInstall
  ; 无额外动作
!macroend

; 安装模式（不强制机器级安装，遵循 electron-builder 配置）
!macro customInstallMode
  ; 无额外动作
!macroend

; 卸载阶段（不额外删除用户数据，交由默认卸载器处理）
!macro customUnInstall
  ; 无额外动作
!macroend

; 重启检查（明确不需要重启）
!macro customCheckReboot
  SetRebootFlag false
!macroend

