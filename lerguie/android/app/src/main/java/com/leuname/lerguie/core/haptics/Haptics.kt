package com.leuname.lerguie.core.haptics

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

/** Padrões de vibração distintos por evento. Respeita a preferência do usuário. */
enum class HapticEvent(val timings: LongArray, val amplitudes: IntArray) {
    CONFIRM(longArrayOf(0, 40), intArrayOf(0, 180)),
    CAPTURE(longArrayOf(0, 25), intArrayOf(0, 255)),
    SUCCESS(longArrayOf(0, 40, 80, 40), intArrayOf(0, 200, 0, 200)),
    MESSAGE(longArrayOf(0, 60, 100, 60), intArrayOf(0, 150, 0, 220)),
    ERROR(longArrayOf(0, 200), intArrayOf(0, 200)),
    ALERT(longArrayOf(0, 300, 120, 300, 120, 300), intArrayOf(0, 255, 0, 255, 0, 255)),
}

class Haptics(context: Context) {
    @Volatile
    var enabled: Boolean = true

    private val vibrator: Vibrator? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }

    fun play(event: HapticEvent) {
        val v = vibrator ?: return
        if (!enabled || !v.hasVibrator()) return
        val effect = if (v.hasAmplitudeControl()) {
            VibrationEffect.createWaveform(event.timings, event.amplitudes, -1)
        } else {
            VibrationEffect.createWaveform(event.timings, -1)
        }
        v.vibrate(effect)
    }
}
