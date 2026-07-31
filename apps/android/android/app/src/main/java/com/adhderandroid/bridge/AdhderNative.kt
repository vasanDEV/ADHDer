package com.adhderandroid.bridge

/**
 * Thin JNI facade over libadhder_android.so (Rust core).
 * No domain logic lives here — only transport.
 */
object AdhderNative {
  init {
    System.loadLibrary("adhder_android")
  }

  @JvmStatic
  external fun initDb(dbPath: String): String

  @JvmStatic
  external fun invoke(command: String, payloadJson: String): String
}
