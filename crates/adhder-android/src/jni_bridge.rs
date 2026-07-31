//! JNI entry points for `com.adhderandroid.bridge.AdhderNative`.

use jni::objects::{JClass, JString};
use jni::sys::jstring;
use jni::JNIEnv;

use crate::api::{invoke_json, AdhderResponse};
use crate::runtime::AdhderRuntime;

#[no_mangle]
pub extern "system" fn Java_com_adhderandroid_bridge_AdhderNative_initDb(
    mut env: JNIEnv,
    _class: JClass,
    db_path: JString,
) -> jstring {
    let path: String = env
        .get_string(&db_path)
        .map(|s| s.into())
        .unwrap_or_default();
    let resp = match AdhderRuntime::init(path) {
        Ok(()) => AdhderResponse::ok(serde_json::json!({"initialized": true})),
        Err(e) => AdhderResponse::from_error(&e),
    };
    to_jstring(&mut env, &resp)
}

#[no_mangle]
pub extern "system" fn Java_com_adhderandroid_bridge_AdhderNative_invoke(
    mut env: JNIEnv,
    _class: JClass,
    command: JString,
    payload: JString,
) -> jstring {
    let command: String = env
        .get_string(&command)
        .map(|s| s.into())
        .unwrap_or_default();
    let payload: String = env
        .get_string(&payload)
        .map(|s| s.into())
        .unwrap_or_else(|_| "{}".into());
    let resp = match invoke_json(&command, &payload) {
        Ok(v) => v,
        Err(e) => AdhderResponse::from_error(&e),
    };
    to_jstring(&mut env, &resp)
}

fn to_jstring(env: &mut JNIEnv, resp: &AdhderResponse) -> jstring {
    let json = serde_json::to_string(resp).unwrap_or_else(|_| {
        r#"{"ok":false,"error":{"code":"internal","message":"serialize failed"}}"#.into()
    });
    env.new_string(json)
        .map(|s| s.into_raw())
        .unwrap_or(std::ptr::null_mut())
}
