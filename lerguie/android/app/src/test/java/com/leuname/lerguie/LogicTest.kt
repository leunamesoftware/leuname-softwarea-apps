package com.leuname.lerguie

import com.leuname.lerguie.ai.ocr.FramingAdvisor
import com.leuname.lerguie.ai.ocr.FramingHint
import com.leuname.lerguie.ai.ocr.NormBox
import com.leuname.lerguie.ai.vision.ColorNamer
import com.leuname.lerguie.ai.vision.Confidence
import com.leuname.lerguie.ai.vision.LabelHit
import com.leuname.lerguie.ai.vision.ObjectBox
import com.leuname.lerguie.ai.vision.OnDeviceComposer
import com.leuname.lerguie.ai.vision.SceneDescription
import com.leuname.lerguie.ai.vision.SceneSpeech
import com.leuname.lerguie.ai.vision.VisionMode
import com.leuname.lerguie.ai.vision.VisionResult
import com.leuname.lerguie.ai.vision.VisionSource
import com.leuname.lerguie.core.plans.Entitlements
import com.leuname.lerguie.core.plans.Feature
import com.leuname.lerguie.core.plans.Plan
import com.leuname.lerguie.core.plans.PlanCatalog
import com.leuname.lerguie.core.speech.Speaker
import com.leuname.lerguie.core.voice.VoiceCommand
import com.leuname.lerguie.core.voice.VoiceCommandParser
import com.leuname.lerguie.i18n.ColorName
import com.leuname.lerguie.i18n.PtBrLanguagePack
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class VoiceCommandParserTest {
    private fun parse(s: String) = VoiceCommandParser.parse(s, PtBrLanguagePack)

    @Test fun parsesWithAndWithoutWakeWord() {
        assertEquals(VoiceCommand.READ, parse("Lerguie, ler."))
        assertEquals(VoiceCommand.READ, parse("ler"))
        assertEquals(VoiceCommand.SEE, parse("LERGUIE, o que estou vendo?"))
        assertEquals(VoiceCommand.LISTEN, parse("Lerguie ouvir"))
        assertEquals(VoiceCommand.COMMUNICATE, parse("comunicar"))
        assertEquals(VoiceCommand.REPEAT, parse("Lerguie, repetir"))
        assertEquals(VoiceCommand.SAVE, parse("salvar"))
        assertEquals(VoiceCommand.SETTINGS, parse("configurações"))
        assertEquals(VoiceCommand.HISTORY, parse("histórico"))
    }

    @Test fun unknownReturnsNull() {
        assertNull(parse("banana"))
        assertNull(parse("Lerguie"))
    }

    @Test fun wordMatchingDoesNotMatchInsideOtherWords() {
        // "ver" não pode casar com "verde"
        assertNull(parse("verde"))
    }
}

class OnDeviceComposerTest {
    private val pack = PtBrLanguagePack

    @Test fun nothingDetectedIsNotRecognized() {
        val r = OnDeviceComposer.compose(emptyList(), emptyList(), null, VisionMode.OBJECT, pack)
        assertEquals(VisionResult.NotRecognized, r)
    }

    @Test fun untranslatedLabelsAreIgnored() {
        val r = OnDeviceComposer.compose(listOf(LabelHit("Xyzzy", 0.99f)), emptyList(), null, VisionMode.OBJECT, pack)
        assertEquals(VisionResult.NotRecognized, r)
    }

    @Test fun highConfidenceIsAffirmative() {
        val r = OnDeviceComposer.compose(listOf(LabelHit("Dog", 0.93f)), emptyList(), null, VisionMode.OBJECT, pack) as VisionResult.Success
        assertEquals("É um cachorro.", r.scene.identified)
        assertEquals(Confidence.HIGH, r.scene.confidence)
    }

    @Test fun lowConfidenceIsSpokenAsUncertain() {
        val r = OnDeviceComposer.compose(listOf(LabelHit("Chair", 0.6f)), emptyList(), null, VisionMode.OBJECT, pack) as VisionResult.Success
        assertEquals(Confidence.LOW, r.scene.confidence)
        assertTrue(SceneSpeech.headline(r.scene, pack).startsWith("Não tenho certeza"))
    }

    @Test fun hazardAndPositionAreReported() {
        val box = ObjectBox("Home good", 0.7f, 0.1f, 0.98f, 0.9f)
        val r = OnDeviceComposer.compose(
            listOf(LabelHit("Knife", 0.9f)), listOf(box), ColorName.BLUE, VisionMode.OBJECT, pack,
        ) as VisionResult.Success
        assertTrue(r.scene.hazards.any { it.contains("faca") })
        assertTrue(r.scene.description.contains("à sua direita"))
        assertTrue(SceneSpeech.compose(r.scene, pack).startsWith("Atenção."))
        assertEquals("Cor predominante no centro: azul.", r.scene.colors)
    }

    @Test fun nearVehicleRaisesAlert() {
        val box = ObjectBox(null, 0.1f, 0.1f, 0.9f, 0.9f)
        val r = OnDeviceComposer.compose(listOf(LabelHit("Bicycle", 0.9f)), listOf(box), null, VisionMode.OBJECT, pack) as VisionResult.Success
        assertTrue(r.scene.hazards.any { it.contains("veículo") })
    }
}

class SceneSpeechTest {
    @Test fun hazardsComeFirst() {
        val s = SceneDescription("É uma escada.", hazards = listOf("Há uma escada à frente"), confidence = Confidence.HIGH, source = VisionSource.CLOUD)
        assertEquals("Atenção. Há uma escada à frente. É uma escada.", SceneSpeech.compose(s, PtBrLanguagePack))
    }
}

class FramingAdvisorTest {
    @Test fun hints() {
        assertEquals(FramingHint.NO_TEXT, FramingAdvisor.advise(emptyList()))
        assertEquals(FramingHint.MOVE_CLOSER, FramingAdvisor.advise(listOf(NormBox(0.45f, 0.45f, 0.55f, 0.55f))))
        assertEquals(FramingHint.MOVE_LEFT, FramingAdvisor.advise(listOf(NormBox(0.0f, 0.2f, 0.5f, 0.8f))))
        assertEquals(FramingHint.MOVE_RIGHT, FramingAdvisor.advise(listOf(NormBox(0.5f, 0.2f, 1.0f, 0.8f))))
        assertEquals(FramingHint.GOOD, FramingAdvisor.advise(listOf(NormBox(0.15f, 0.2f, 0.85f, 0.8f))))
        assertEquals(FramingHint.MOVE_AWAY, FramingAdvisor.advise(listOf(NormBox(0.0f, 0.0f, 1.0f, 0.9f))))
    }
}

class ColorNamerTest {
    @Test fun names() {
        assertEquals(ColorName.BLACK, ColorNamer.fromHsv(0f, 0f, 0.05f))
        assertEquals(ColorName.WHITE, ColorNamer.fromHsv(0f, 0.02f, 0.97f))
        assertEquals(ColorName.RED, ColorNamer.fromHsv(2f, 0.9f, 0.9f))
        assertEquals(ColorName.GREEN, ColorNamer.fromHsv(120f, 0.8f, 0.7f))
        assertEquals(ColorName.BLUE, ColorNamer.fromHsv(225f, 0.8f, 0.7f))
    }
}

class EntitlementsTest {
    @Test fun essentialFeaturesAreNeverBlocked() {
        val emptyPlan = Plan(id = "restricted", features = emptyList())
        val e = Entitlements(emptyPlan, PlanCatalog(plans = listOf(emptyPlan)))
        Feature.entries.filter { it.essential }.forEach { assertTrue("$it deve ser livre", e.canUse(it)) }
        assertEquals(false, e.canUse(Feature.CLOUD_DESCRIPTION))
    }

    @Test fun unknownPlanFallsBackToDefault() {
        val c = PlanCatalog.DEFAULT
        assertEquals("free", c.plan("nao-existe").id)
    }
}

class SpeechSplitTest {
    @Test fun splitsLongTextAtSentenceBoundaries() {
        val text = "Primeira frase. Segunda frase maior. Terceira."
        val parts = Speaker.splitForSpeech(text, 20)
        assertTrue(parts.all { it.length <= 20 })
        assertEquals(text.replace(" ", ""), parts.joinToString("").replace(" ", ""))
    }
}
