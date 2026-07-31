//! Android FFI surface for ADHDer.
//!
//! Kotlin loads `libadhder_android.so` and calls [`adhder_invoke`] with a JSON
//! envelope. Business logic stays in feature crates; this crate only maps
//! commands ↔ use cases.

mod api;
mod runtime;

#[cfg(target_os = "android")]
mod jni_bridge;

pub use api::{invoke_json, AdhderResponse};
pub use runtime::AdhderRuntime;

use std::ffi::{CStr, CString};
use std::os::raw::c_char;

/// Initialize the shared runtime with a SQLite file path.
///
/// # Safety
/// `db_path` must be a valid NUL-terminated UTF-8 C string.
#[no_mangle]
pub unsafe extern "C" fn adhder_init(db_path: *const c_char) -> *mut c_char {
    let path = if db_path.is_null() {
        return response_ptr(AdhderResponse::err("validation", "db_path is null"));
    } else {
        match CStr::from_ptr(db_path).to_str() {
            Ok(s) => s.to_string(),
            Err(_) => {
                return response_ptr(AdhderResponse::err("validation", "db_path is not utf-8"))
            }
        }
    };

    match AdhderRuntime::init(path) {
        Ok(()) => response_ptr(AdhderResponse::ok(serde_json::json!({"initialized": true}))),
        Err(e) => response_ptr(AdhderResponse::from_error(&e)),
    }
}

/// Invoke a named command with a JSON payload. Returns a heap JSON string.
///
/// # Safety
/// Pointers must be valid NUL-terminated UTF-8 C strings (payload may be empty JSON object).
#[no_mangle]
pub unsafe extern "C" fn adhder_invoke(
    command: *const c_char,
    payload_json: *const c_char,
) -> *mut c_char {
    let command = match cstr(command) {
        Ok(s) => s,
        Err(resp) => return response_ptr(resp),
    };
    let payload = if payload_json.is_null() {
        "{}".to_string()
    } else {
        match cstr(payload_json) {
            Ok(s) => s,
            Err(resp) => return response_ptr(resp),
        }
    };

    let resp = match invoke_json(&command, &payload) {
        Ok(v) => v,
        Err(e) => AdhderResponse::from_error(&e),
    };
    response_ptr(resp)
}

/// Free a string previously returned by this library.
///
/// # Safety
/// `ptr` must be a pointer previously returned by `adhder_*` or null.
#[no_mangle]
pub unsafe extern "C" fn adhder_string_free(ptr: *mut c_char) {
    if ptr.is_null() {
        return;
    }
    drop(CString::from_raw(ptr));
}

unsafe fn cstr(ptr: *const c_char) -> Result<String, AdhderResponse> {
    if ptr.is_null() {
        return Err(AdhderResponse::err("validation", "null string pointer"));
    }
    CStr::from_ptr(ptr)
        .to_str()
        .map(|s| s.to_string())
        .map_err(|_| AdhderResponse::err("validation", "string is not utf-8"))
}

fn response_ptr(resp: AdhderResponse) -> *mut c_char {
    let json = serde_json::to_string(&resp).unwrap_or_else(|_| {
        r#"{"ok":false,"error":{"code":"internal","message":"serialize failed"}}"#.into()
    });
    CString::new(json)
        .unwrap_or_else(|_| CString::new("{}").expect("static"))
        .into_raw()
}
