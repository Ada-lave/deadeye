#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::{Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

#[cfg(windows)]
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

struct HudState {
    click_through: Mutex<bool>,
    creation: Mutex<()>,
    visibility: Mutex<()>,
    shortcut: Mutex<String>,
}

fn main_only(window: &WebviewWindow) -> Result<(), String> {
    if window.label() == "main" {
        Ok(())
    } else {
        Err("Command only available from main window".into())
    }
}

fn ensure_hud(app: &tauri::AppHandle) -> Result<WebviewWindow, String> {
    let state = app.state::<HudState>();
    let _creation = state.creation.lock().map_err(|e| e.to_string())?;
    if let Some(window) = app.get_webview_window("hud") {
        return Ok(window);
    }
    let builder = WebviewWindowBuilder::new(app, "hud", WebviewUrl::App("index.html?hud=1".into()))
        .title("Deadeye HUD")
        .inner_size(360.0, 210.0)
        .min_inner_size(300.0, 180.0)
        .decorations(false)
        .always_on_top(true)
        .focused(false)
        .visible(false)
        .resizable(true);
    #[cfg(windows)]
    let builder = builder.focusable(false).skip_taskbar(true);
    let window = builder.build().map_err(|e| e.to_string())?;
    let state = app.state::<HudState>();
    let click_through = *state.click_through.lock().map_err(|e| e.to_string())?;
    window
        .set_ignore_cursor_events(click_through)
        .map_err(|e| e.to_string())?;
    Ok(window)
}

#[tauri::command]
async fn show_hud(app: tauri::AppHandle, window: WebviewWindow) -> Result<(), String> {
    main_only(&window)?;
    let state = app.state::<HudState>();
    let _visibility = state.visibility.lock().map_err(|e| e.to_string())?;
    ensure_hud(&app)?.show().map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_click_through(
    app: tauri::AppHandle,
    window: WebviewWindow,
    enabled: bool,
) -> Result<(), String> {
    main_only(&window)?;
    #[cfg(not(windows))]
    if enabled {
        return Err("Пропуск кликов поддерживается только в Windows".into());
    }
    let state = app.state::<HudState>();
    let _creation = state.creation.lock().map_err(|e| e.to_string())?;
    if let Some(hud) = app.get_webview_window("hud") {
        hud.set_ignore_cursor_events(enabled)
            .map_err(|e| e.to_string())?;
    }
    *state.click_through.lock().map_err(|e| e.to_string())? = enabled;
    Ok(())
}

#[tauri::command]
fn hud_status(
    app: tauri::AppHandle,
    window: WebviewWindow,
) -> Result<(bool, bool, String), String> {
    main_only(&window)?;
    let state = app.state::<HudState>();
    let click = *state.click_through.lock().map_err(|e| e.to_string())?;
    let shortcut = state.shortcut.lock().map_err(|e| e.to_string())?.clone();
    Ok((cfg!(windows), click, shortcut))
}

#[tauri::command]
fn retry_shortcut(app: tauri::AppHandle, window: WebviewWindow) -> Result<String, String> {
    main_only(&window)?;
    Ok(register_shortcut(&app))
}

#[cfg(windows)]
fn register_shortcut(app: &tauri::AppHandle) -> String {
    let state = app.state::<HudState>();
    let mut status = state.shortcut.lock().unwrap_or_else(|e| e.into_inner());
    if app.global_shortcut().is_registered("Ctrl+Shift+F8") {
        return status.clone();
    }
    *status = match app
        .global_shortcut()
        .on_shortcut("Ctrl+Shift+F8", |app, _, event| {
            if event.state == ShortcutState::Pressed {
                let app = app.clone();
                std::thread::spawn(move || {
                    let result = (|| -> Result<(), String> {
                        let state = app.state::<HudState>();
                        let _visibility = state.visibility.lock().map_err(|e| e.to_string())?;
                        let hud = ensure_hud(&app)?;
                        if hud.is_visible().map_err(|e| e.to_string())? {
                            hud.hide().map_err(|e| e.to_string())
                        } else {
                            hud.show().map_err(|e| e.to_string())
                        }
                    })();
                    if let Err(e) = result {
                        eprintln!("HUD shortcut: {e}");
                    }
                });
            }
        }) {
        Ok(()) => "Ctrl+Shift+F8: зарегистрировано".into(),
        Err(e) => format!("Ctrl+Shift+F8 недоступна: {e}. Освободите сочетание и повторите."),
    };
    status.clone()
}

#[cfg(not(windows))]
fn register_shortcut(_app: &tauri::AppHandle) -> String {
    "Горячая клавиша доступна только в Windows".into()
}

fn main() {
    let builder = tauri::Builder::default();
    #[cfg(windows)]
    let builder = builder.plugin(tauri_plugin_global_shortcut::Builder::new().build());
    builder
        .manage(HudState {
            click_through: Mutex::new(false),
            creation: Mutex::new(()),
            visibility: Mutex::new(()),
            shortcut: Mutex::new(String::new()),
        })
        .setup(|app| {
            register_shortcut(app.handle());
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" && matches!(event, tauri::WindowEvent::Destroyed) {
                window.app_handle().exit(0);
            }
        })
        .invoke_handler(tauri::generate_handler![
            show_hud,
            set_click_through,
            hud_status,
            retry_shortcut
        ])
        .run(tauri::generate_context!())
        .expect("error running Deadeye");
}
