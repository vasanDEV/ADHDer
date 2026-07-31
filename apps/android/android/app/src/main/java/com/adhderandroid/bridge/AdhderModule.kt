package com.adhderandroid.bridge

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class AdhderModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  @Volatile private var ready = false

  override fun getName(): String = "AdhderCore"

  @ReactMethod
  fun initialize(promise: Promise) {
    try {
      val dbFile = File(reactContext.filesDir, "adhder.db")
      val raw = AdhderNative.initDb(dbFile.absolutePath)
      ready = raw.contains("\"ok\":true")
      promise.resolve(raw)
    } catch (t: Throwable) {
      promise.reject("init_failed", t.message, t)
    }
  }

  @ReactMethod
  fun invoke(command: String, payloadJson: String, promise: Promise) {
    try {
      if (!ready) {
        val dbFile = File(reactContext.filesDir, "adhder.db")
        AdhderNative.initDb(dbFile.absolutePath)
        ready = true
      }
      val raw = AdhderNative.invoke(command, payloadJson.ifBlank { "{}" })
      promise.resolve(raw)
    } catch (t: Throwable) {
      promise.reject("invoke_failed", t.message, t)
    }
  }
}
