package com.leuname.lerguie.ai.vision

import android.graphics.Bitmap
import android.graphics.Color
import com.leuname.lerguie.i18n.ColorName

/** Identifica a cor predominante no centro da imagem (roupas, objetos, embalagens). */
object ColorNamer {
    fun dominantCenterColor(bitmap: Bitmap): ColorName? {
        val w = bitmap.width
        val h = bitmap.height
        if (w < 4 || h < 4) return null
        var r = 0L; var g = 0L; var b = 0L; var n = 0
        val step = maxOf(1, minOf(w, h) / 40)
        for (y in h / 3 until 2 * h / 3 step step) for (x in w / 3 until 2 * w / 3 step step) {
            val c = bitmap.getPixel(x, y)
            r += Color.red(c); g += Color.green(c); b += Color.blue(c); n++
        }
        if (n == 0) return null
        val hsv = FloatArray(3)
        Color.RGBToHSV((r / n).toInt(), (g / n).toInt(), (b / n).toInt(), hsv)
        return fromHsv(hsv[0], hsv[1], hsv[2])
    }

    fun fromHsv(h: Float, s: Float, v: Float): ColorName = when {
        v < 0.18f -> ColorName.BLACK
        s < 0.12f && v > 0.85f -> ColorName.WHITE
        s < 0.12f -> ColorName.GRAY
        h < 15f || h >= 345f -> if (v < 0.5f) ColorName.WINE else ColorName.RED
        h < 40f -> if (v < 0.55f) ColorName.BROWN else ColorName.ORANGE
        h < 65f -> if (v < 0.55f) ColorName.DARK_BROWN else ColorName.YELLOW
        h < 160f -> ColorName.GREEN
        h < 200f -> ColorName.LIGHT_BLUE
        h < 255f -> ColorName.BLUE
        h < 290f -> ColorName.PURPLE
        else -> ColorName.PINK
    }
}
