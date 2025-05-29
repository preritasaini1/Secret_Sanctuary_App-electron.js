; Custom installer script for Secret Sanctuary
; This file contains custom NSIS installer instructions

; Add custom macro to handle notifications
!macro customInstall
  ; Register for notifications (Windows 10+)
  WriteRegStr HKCU "SOFTWARE\Classes\AppUserModelId\com.secret.sanctuary.app" "DisplayName" "Secret Sanctuary"
  WriteRegStr HKCU "SOFTWARE\Classes\AppUserModelId\com.secret.sanctuary.app" "IconUri" "$INSTDIR\resources\assets\icon.ico"
!macroend

!macro customUnInstall
  ; Clean up notification registration
  DeleteRegKey HKCU "SOFTWARE\Classes\AppUserModelId\com.secret.sanctuary.app"
!macroend

; Custom header info
!define PRODUCT_DESCRIPTION "A secure note-taking application"