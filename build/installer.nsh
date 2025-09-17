; AI Text Scanner NSIS 安装程序自定义脚本
; 这个文件包含了用于定制Windows安装程序的NSIS宏

; 自定义头部信息
!macro customHeader
  !system "echo 'AI Text Scanner Installer Custom Header' > ${BUILD_RESOURCES_DIR}/customHeader"
!macroend

; 预初始化宏 - 在安装程序初始化前执行
!macro preInit
  ; 检查管理员权限
  !system "echo 'Checking administrator privileges' > ${BUILD_RESOURCES_DIR}/preInit"
  
  ; 设置安装目录权限
  SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$PROGRAMFILES64\AI Text Scanner"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$PROGRAMFILES64\AI Text Scanner"
  SetRegView 32
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$PROGRAMFILES\AI Text Scanner"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$PROGRAMFILES\AI Text Scanner"
!macroend

; 自定义初始化宏
!macro customInit
  !system "echo 'Custom initialization for AI Text Scanner' > ${BUILD_RESOURCES_DIR}/customInit"
  
  ; ===== 安装模式检测 =====
  ; 此宏仅在安装过程中执行，不会在卸载过程中执行
  ; 检查是否已经安装了其他版本，如果已安装则静默覆盖安装
  ; 不再询问用户是否先卸载，直接进行覆盖安装以保留用户配置
  ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "DisplayName"
  StrCmp $R0 "" +2
    ; 检测到已安装版本，静默继续安装（覆盖安装）
    ; 这样可以保留用户配置和数据，避免用户误触
!macroend

; 自定义安装宏
!macro customInstall
  !system "echo 'Custom installation steps for AI Text Scanner' > ${BUILD_RESOURCES_DIR}/customInstall"
  
  ; 创建开始菜单快捷方式
  CreateDirectory "$SMPROGRAMS\AI Text Scanner"
  CreateShortCut "$SMPROGRAMS\AI Text Scanner\AI Text Scanner.lnk" "$INSTDIR\AI Text Scanner.exe"
  CreateShortCut "$SMPROGRAMS\AI Text Scanner\卸载 AI Text Scanner.lnk" "$INSTDIR\Uninstall AI Text Scanner.exe"
  
  ; 创建桌面快捷方式
  CreateShortCut "$DESKTOP\AI Text Scanner.lnk" "$INSTDIR\AI Text Scanner.exe"
  
  ; 注册文件关联
  WriteRegStr HKCR ".png" "" "AITextScanner.Image"
  WriteRegStr HKCR ".jpg" "" "AITextScanner.Image"
  WriteRegStr HKCR ".jpeg" "" "AITextScanner.Image"
  WriteRegStr HKCR ".gif" "" "AITextScanner.Image"
  WriteRegStr HKCR ".bmp" "" "AITextScanner.Image"
  WriteRegStr HKCR "AITextScanner.Image" "" "AI Text Scanner Image"
  WriteRegStr HKCR "AITextScanner.Image\shell\open\command" "" '"$INSTDIR\AI Text Scanner.exe" "%1"'
  
  ; 添加到系统PATH（可选）
  ; Push "$INSTDIR"
  ; Call AddToPath
!macroend

; 自定义安装模式宏
!macro customInstallMode
  ; 强制为所有用户安装
  ; set $isForceMachineInstall to enforce machine installation
  ; set $isForceCurrentInstall to enforce current user installation
  StrCmp $R0 "Admin" 0 +2
    StrCpy $isForceMachineInstall "1"
!macroend

; 自定义欢迎页面
!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "欢迎使用 AI Text Scanner 安装向导"
  !define MUI_WELCOMEPAGE_TEXT "这将在您的计算机上安装 AI Text Scanner。$\r$\n$\r$\nAI Text Scanner 是一款强大的 AI 文本识别和翻译工具，支持多种语言的 OCR 识别和智能翻译功能。$\r$\n$\r$\n建议您在开始安装前关闭所有其他应用程序。"
  !insertMacro MUI_PAGE_WELCOME
!macroend

; 自定义卸载欢迎页面  
!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "AI Text Scanner 卸载向导"
  !define MUI_WELCOMEPAGE_TEXT "这将从您的计算机中卸载 AI Text Scanner。$\r$\n$\r$\n在开始卸载前，请确保 AI Text Scanner 已完全关闭。$\r$\n$\r$\n点击下一步继续。"
  !insertmacro MUI_UNPAGE_WELCOME
!macroend

; 自定义卸载宏
!macro customUnInstall
  ; ===== 卸载模式检测 =====
  ; 此宏仅在卸载过程中执行，不会在安装过程中执行
  ; 删除开始菜单快捷方式
  Delete "$SMPROGRAMS\AI Text Scanner\AI Text Scanner.lnk"
  Delete "$SMPROGRAMS\AI Text Scanner\卸载 AI Text Scanner.lnk" 
  RMDir "$SMPROGRAMS\AI Text Scanner"
  
  ; 删除桌面快捷方式
  Delete "$DESKTOP\AI Text Scanner.lnk"
  
  ; 删除文件关联
  DeleteRegKey HKCR ".png\AITextScanner.Image"
  DeleteRegKey HKCR ".jpg\AITextScanner.Image" 
  DeleteRegKey HKCR ".jpeg\AITextScanner.Image"
  DeleteRegKey HKCR ".gif\AITextScanner.Image"
  DeleteRegKey HKCR ".bmp\AITextScanner.Image"
  DeleteRegKey HKCR "AITextScanner.Image"
  
  ; 清理注册表
  DeleteRegKey HKLM "Software\AI Text Scanner"
  DeleteRegKey HKCU "Software\AI Text Scanner"
  
  ; 删除用户数据（可选，询问用户）
  ; 只有在用户明确选择"是"时才删除用户配置和数据
  MessageBox MB_YESNO|MB_ICONQUESTION "是否删除用户配置和数据？$\r$\n$\r$\n选择"是"将删除所有用户设置、缓存和配置文件。$\r$\n选择"否"将保留用户数据，但应用程序将被卸载。" IDNO +3
    ; 用户选择删除数据
    RMDir /r "$APPDATA\AI Text Scanner"
    RMDir /r "$LOCALAPPDATA\AI Text Scanner"
    ; 用户选择保留数据，跳过删除步骤
!macroend

; 检查是否需要重启
!macro customCheckReboot
  ; 通常 Electron 应用不需要重启
  SetRebootFlag false
!macroend