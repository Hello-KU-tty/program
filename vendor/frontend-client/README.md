# Vibe Helper frontend client

Extension-host only. Windows products use the managed host from the matching frontend handoff kit; see `docs/FRONTEND_WINDOWS_QUICKSTART.md`. The low-level `connectLocalCore` API is for host integrations that already own the private descriptor and native worker lifecycle. Never send credentials to a Webview.
