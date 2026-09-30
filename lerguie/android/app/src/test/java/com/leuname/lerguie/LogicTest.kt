package com.leuname.lerguie

import com.leuname.lerguie.ai.ocr.FramingAdvisor
import com.leuname.lerguie.ai.ocr.FramingHint
import com.leuname.lerguie.ai.ocr.NormBox
import com.leuname.lerguie.ai.vision.ColorNamer
import com.leuname.lerguie.ai.vision.Detection
import com.leuname.lerguie.ai.vision.WalkAnnouncer
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

    @Test fun naturalRequestsWithArgument() {
        assertEquals(com.leuname.lerguie.core.voice.ParsedCommand(VoiceCommand.FIND, "leite"), VoiceCommandParser.parseFull("Eu quero um leite", PtBrLanguagePack))
        assertEquals(com.leuname.lerguie.core.voice.ParsedCommand(VoiceCommand.NAVIGATE, "mercado"), VoiceCommandParser.parseFull("Lerguie, quero ir ao mercado", PtBrLanguagePack))
        assertEquals(com.leuname.lerguie.core.voice.ParsedCommand(VoiceCommand.NAVIGATE, "padaria"), VoiceCommandParser.parseFull("como chego na padaria", PtBrLanguagePack))
        assertEquals(com.leuname.lerguie.core.voice.ParsedCommand(VoiceCommand.FIND, "banheiro"), VoiceCommandParser.parseFull("onde fica o banheiro?", PtBrLanguagePack))
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
    private fun det(label: String, score: Float, l: Float, t: Float, r: Float, b: Float) = Detection(label, score, ObjectBox(label, l, t, r, b))

    @Test fun nothingDetectedIsNotRecognized() {
        val r = OnDeviceComposer.compose(emptyList(), emptyList(), null, VisionMode.OBJECT, pack)
        assertEquals(VisionResult.NotRecognized, r)
    }

    @Test fun untranslatedLabelsAreIgnored() {
        val r = OnDeviceComposer.compose(listOf(LabelHit("Xyzzy", 0.99f)), emptyList(), null, VisionMode.OBJECT, pack)
        assertEquals(VisionResult.NotRecognized, r)
    }

    @Test fun highConfidenceLabelIsAffirmative() {
        val r = OnDeviceComposer.compose(listOf(LabelHit("Dog", 0.95f)), emptyList(), null, VisionMode.OBJECT, pack) as VisionResult.Success
        assertEquals("É um cachorro.", r.scene.identified)
        assertEquals(Confidence.HIGH, r.scene.confidence)
    }

    @Test fun lowConfidenceIsSpokenAsUncertain() {
        val r = OnDeviceComposer.compose(listOf(LabelHit("Chair", 0.75f)), emptyList(), null, VisionMode.OBJECT, pack) as VisionResult.Success
        assertEquals(Confidence.LOW, r.scene.confidence)
        assertTrue(SceneSpeech.headline(r.scene, pack).startsWith("Não tenho certeza"))
    }

    @Test fun detectionWithPositionAndProximity() {
        val r = OnDeviceComposer.compose(emptyList(), listOf(det("person", 0.9f, 0.7f, 0.1f, 0.95f, 0.9f)), ColorName.BLUE, VisionMode.OBJECT, pack) as VisionResult.Success
        assertEquals("Há uma pessoa à sua direita, bem perto.", r.scene.identified)
        assertEquals("Cor predominante no centro: azul.", r.scene.colors)
    }

    @Test fun vehiclesComeFirstAndRaiseAlert() {
        val r = OnDeviceComposer.compose(
            emptyList(),
            listOf(det("chair", 0.9f, 0.4f, 0.4f, 0.6f, 0.6f), det("car", 0.8f, 0.3f, 0.3f, 0.7f, 0.8f)),
            null, VisionMode.OBJECT, pack,
        ) as VisionResult.Success
        assertTrue(r.scene.identified.contains("carro"))
        assertTrue(r.scene.hazards.any { it.contains("veículo") })
        assertTrue(r.scene.description.contains("cadeira"))
        assertTrue(SceneSpeech.compose(r.scene, pack).startsWith("Atenção."))
    }

    @Test fun knifeIsHazard() {
        val r = OnDeviceComposer.compose(emptyList(), listOf(det("knife", 0.8f, 0.4f, 0.4f, 0.5f, 0.5f)), null, VisionMode.OBJECT, pack) as VisionResult.Success
        assertTrue(r.scene.hazards.any { it.contains("faca") })
    }
}

class WalkAnnouncerTest {
    private val pack = PtBrLanguagePack
    private fun det(label: String, l: Float, r: Float, h: Float) = Detection(label, 0.8f, ObjectBox(label, l, 0.2f, r, 0.2f + h))

    @Test fun announcesOnceThenOnlyWhenCloser() {
        val w = WalkAnnouncer(repeatAfterMs = 7000)
        val far = listOf(det("bicycle", 0.1f, 0.2f, 0.15f))
        val first = w.next(far, pack, 0)
        assertEquals(1, first.size)
        assertEquals("Bicicleta à sua esquerda, mais distante.", first[0].text)
        assertEquals(0, w.next(far, pack, 1000).size)
        val near = w.next(listOf(det("bicycle", 0.1f, 0.3f, 0.7f)), pack, 2000)
        assertTrue(near.single().alert)
        assertTrue(near.single().text.startsWith("Atenção."))
    }

    @Test fun ignoresFarUnimportantObjects() {
        val w = WalkAnnouncer()
        assertEquals(0, w.next(listOf(det("cup", 0.4f, 0.5f, 0.1f)), pack, 0).size)
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

class MemoryMatcherTest {
    private fun v(vararg x: Float) = floatArrayOf(*x)

    @Test fun recognizesClosestTaughtObject() {
        val samples = listOf(
            com.leuname.lerguie.ai.memory.KnownSample(1, "remédio da pressão", v(1f, 0f, 0f)),
            com.leuname.lerguie.ai.memory.KnownSample(2, "chaves", v(0f, 1f, 0f)),
        )
        val m = com.leuname.lerguie.ai.memory.MemoryMatcher.best(v(0.98f, 0.05f, 0f), samples)!!
        assertEquals("remédio da pressão", m.name)
        assertEquals(com.leuname.lerguie.ai.memory.MatchLevel.SURE, m.level)
    }

    @Test fun unknownObjectIsNotClaimed() {
        val samples = listOf(com.leuname.lerguie.ai.memory.KnownSample(1, "chaves", v(0f, 1f, 0f)))
        assertNull(com.leuname.lerguie.ai.memory.MemoryMatcher.best(v(1f, 0f, 0f), samples))
    }

    @Test fun bytesRoundTrip() {
        val a = v(0.1f, -2f, 3.5f)
        val b = com.leuname.lerguie.ai.memory.MemoryMatcher.fromBytes(com.leuname.lerguie.ai.memory.MemoryMatcher.toBytes(a))
        assertTrue(a.contentEquals(b))
    }
}
