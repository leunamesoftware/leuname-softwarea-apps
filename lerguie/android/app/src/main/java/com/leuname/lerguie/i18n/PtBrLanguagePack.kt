package com.leuname.lerguie.i18n

import com.leuname.lerguie.core.settings.UsageType
import com.leuname.lerguie.core.voice.VoiceCommand

/** Pacote de idioma Português (Brasil) — idioma padrão e fallback. */
object PtBrLanguagePack : LanguagePack {
    override val languageTag = "pt-BR"

    private fun m(name: String) = Term(name, "um $name")
    private fun f(name: String) = Term(name, "uma $name")
    private fun Term.withHazard(text: String) = copy(hazard = text)

    override fun sure(thing: Term) = "É ${thing.withArticle}."
    override fun likely(thing: Term) = "Parece ser ${thing.withArticle}."
    override fun uncertain(text: String) = "Não tenho certeza, mas parece ser: " + text.replaceFirstChar { it.lowercase() }
    override val uncertainPrefix = "Não tenho certeza"
    override fun attention(hazards: List<String>) = "Atenção. " + hazards.joinToString(". ") { it.trimEnd('.') } + "."
    override fun position(p: Position) = when (p) {
        Position.LEFT -> "à sua esquerda"
        Position.FRONT -> "à sua frente"
        Position.RIGHT -> "à sua direita"
    }
    override fun alsoSeen(names: List<String>) = "Também identifiquei: ${names.joinToString(", ")}."
    override fun vehicleNear(position: String) = "Há um veículo muito próximo, $position"
    override fun proximity(p: Proximity) = when (p) {
        Proximity.NEAR -> "bem perto"
        Proximity.MEDIUM -> "a poucos metros"
        Proximity.FAR -> "mais distante"
    }
    override fun detectedAt(thing: Term, position: String, proximity: Proximity) =
        "Há ${thing.withArticle} $position, ${this.proximity(proximity)}."
    override fun walkItem(thing: Term, position: String, proximity: Proximity) =
        "${thing.name.replaceFirstChar { it.uppercase() }} $position, ${this.proximity(proximity)}."
    override fun knownSure(name: String) = "É o seu objeto: $name."
    override fun knownLikely(name: String) = "Parece ser o seu objeto: $name."
    override fun knownWalk(name: String) = "$name à sua frente."
    override fun alsoAround(items: List<String>) = "Também há: ${items.joinToString("; ")}."
    override fun dominantColor(color: ColorName) = "Cor predominante no centro: ${colorName(color)}."
    override fun colorName(color: ColorName) = when (color) {
        ColorName.BLACK -> "preto"; ColorName.WHITE -> "branco"; ColorName.GRAY -> "cinza"
        ColorName.WINE -> "vinho"; ColorName.RED -> "vermelho"; ColorName.BROWN -> "marrom"
        ColorName.ORANGE -> "laranja"; ColorName.DARK_BROWN -> "marrom-escuro"; ColorName.YELLOW -> "amarelo"
        ColorName.GREEN -> "verde"; ColorName.LIGHT_BLUE -> "azul-claro"; ColorName.BLUE -> "azul"
        ColorName.PURPLE -> "roxo"; ColorName.PINK -> "rosa"
    }
    override val unreadable = "[trecho pouco legível]"
    override val wakeWord = "lerguie"
    override val navigatePhrases = listOf(
        "quero ir para", "quero ir pra", "quero ir ao", "quero ir a", "quero ir na", "quero ir no",
        "ir para", "ir pra", "ir ao", "ir a", "ir na", "ir no", "me leve para", "me leve ao", "me leve a",
        "me leva para", "me leva pra", "me leva ao", "como chego", "como eu chego", "caminho para", "rota para", "navegar para",
    )
    override val findPhrases = listOf(
        "procurar", "procure", "procura", "onde fica", "encontrar", "encontre", "achar", "ache", "onde esta", "onde tem",
        "estou procurando", "quero", "eu quero", "preciso de", "preciso",
    )
    override val fillerWords = setOf("o", "a", "os", "as", "um", "uma", "uns", "umas", "de", "do", "da", "ao", "aos", "para", "pra", "pro", "no", "na", "meu", "minha", "chego", "ate")
    override fun findingStart(item: String) = "Procurando $item. Aponte a câmera para frente e vire devagar. Eu aviso quando encontrar."
    override fun found(text: String) = "Encontrei: $text"
    override fun writtenText(text: String) = "Está escrito: $text"
    override fun askQuestion(item: String) = "Olá, com licença. Estou procurando $item. Pode me dizer onde fica? Por favor, fale perto do celular."
    override fun theyAnswered(text: String) = "A pessoa disse: $text"
    override val profileWords = listOf(
        UsageType.CANNOT_READ to listOf("nao sei ler", "nao leio", "ler nao"),
        UsageType.DEAF_NONSPEAKING to listOf("surdo e mudo", "surda e muda", "nao falo", "mudo", "muda"),
        UsageType.DEAF_SPEAKING to listOf("surdo", "surda", "nao escuto", "nao ouco"),
        UsageType.BLIND_LOW_VISION to listOf("cego", "cega", "nao enxergo", "nao vejo", "baixa visao", "enxergo pouco"),
        UsageType.HEARING to listOf("normal", "enxergo e ouco", "ajudante", "familiar"),
    )
    override fun navigatingStart(place: String) = "Abrindo a navegação a pé até $place. As instruções de rua serão faladas pelo Google Maps. Volte ao Lerguie no modo Caminhar para eu avisar os obstáculos."

    override val voiceCommands: List<Pair<VoiceCommand, List<String>>> = listOf(
        VoiceCommand.STOP to listOf("parar", "pare", "silencio", "cala"),
        VoiceCommand.REPEAT to listOf("repetir", "repete", "de novo", "novamente"),
        VoiceCommand.SAVE to listOf("salvar", "salva", "guardar", "favoritar"),
        VoiceCommand.SEE to listOf("o que estou vendo", "o que tem na minha frente", "descrever", "descreve", "ver", "enxergar", "camera"),
        VoiceCommand.READ to listOf("ler", "leia", "leitura", "documento"),
        VoiceCommand.LISTEN to listOf("ouvir", "escutar", "transcrever"),
        VoiceCommand.COMMUNICATE to listOf("comunicar", "conversar", "conversa", "falar"),
        VoiceCommand.FAVORITES to listOf("favoritos"),
        VoiceCommand.HISTORY to listOf("historico"),
        VoiceCommand.SETTINGS to listOf("configuracoes", "configuracao", "ajustes"),
        VoiceCommand.HOME to listOf("inicio", "tela inicial", "voltar"),
    )

    override val labels: Map<String, Term> = mapOf(
        // Animais
        "Dog" to m("cachorro"), "Cat" to m("gato"), "Bird" to m("pássaro"), "Horse" to m("cavalo"),
        "Pet" to m("animal de estimação"), "Fish" to m("peixe"), "Insect" to m("inseto"),
        "Butterfly" to f("borboleta"), "Cattle" to m("gado"), "Duck" to m("pato"), "Chicken" to f("galinha"),
        // Pessoas
        "Baby" to m("bebê"), "Crowd" to f("multidão"), "Smile" to m("sorriso"), "Beard" to f("barba"),
        "Hand" to f("mão"), "Selfie" to f("selfie"), "Team" to m("grupo de pessoas"),
        // Veículos e rua
        "Car" to m("carro"), "Bus" to m("ônibus"), "Bicycle" to f("bicicleta"), "Motorcycle" to f("motocicleta"),
        "Vehicle" to m("veículo"), "Truck" to m("caminhão"), "Van" to f("van"), "Train" to m("trem"),
        "Boat" to m("barco"), "Airplane" to m("avião"), "Wheel" to f("roda"), "Road" to f("rua"),
        "Bridge" to f("ponte"), "Traffic light" to m("semáforo"),
        // Casa e móveis
        "Chair" to f("cadeira"), "Couch" to m("sofá"), "Table" to f("mesa"), "Desk" to f("escrivaninha"),
        "Bed" to f("cama"), "Shelf" to f("prateleira"), "Cabinetry" to m("armário"), "Door" to f("porta"),
        "Window" to f("janela"), "Curtain" to f("cortina"), "Lamp" to m("abajur"), "Sink" to f("pia"),
        "Toilet" to m("vaso sanitário"), "Bathtub" to f("banheira"), "Kitchen" to f("cozinha"),
        "Room" to m("cômodo"), "Wall" to f("parede"), "Floor" to m("chão"), "Stairs" to f("escada"),
        "Television" to f("televisão"), "Clock" to m("relógio"), "Mirror" to m("espelho"),
        "Refrigerator" to f("geladeira"), "Oven" to m("forno"), "Microwave" to m("micro-ondas"),
        "Pillow" to m("travesseiro"), "Blanket" to m("cobertor"), "Rug" to m("tapete"),
        // Objetos
        "Mobile phone" to m("celular"), "Computer" to m("computador"), "Laptop" to m("notebook"),
        "Keyboard" to m("teclado"), "Screen" to f("tela"), "Monitor" to m("monitor"), "Camera" to f("câmera"),
        "Cup" to f("xícara"), "Mug" to f("caneca"), "Bottle" to f("garrafa"), "Glass" to m("copo"),
        "Plate" to m("prato"), "Bowl" to f("tigela"), "Fork" to m("garfo"), "Spoon" to f("colher"),
        "Glasses" to m("óculos"), "Sunglasses" to m("óculos de sol"), "Hat" to m("chapéu"), "Cap" to m("boné"),
        "Shoe" to m("sapato"), "Sandal" to f("sandália"), "Flip-flops" to m("chinelo"), "Slipper" to m("chinelo"),
        "Boot" to f("bota"), "Footwear" to m("calçado"), "Sneakers" to m("tênis"), "Jeans" to f("calça jeans"), "Jacket" to f("jaqueta"),
        "Shirt" to f("camisa"), "Dress" to m("vestido"), "Handbag" to f("bolsa"), "Backpack" to f("mochila"),
        "Umbrella" to m("guarda-chuva"), "Watch" to m("relógio de pulso"), "Jewellery" to f("joia"),
        "Book" to m("livro"), "Paper" to m("papel"), "Poster" to m("cartaz"), "Flag" to f("bandeira"),
        "Toy" to m("brinquedo"), "Balloon" to m("balão"), "Box" to f("caixa"), "Bag" to f("sacola"),
        "Key" to f("chave"), "Pen" to f("caneta"), "Scissors" to f("tesoura").withHazard("Há uma tesoura, um objeto cortante"),
        "Knife" to f("faca").withHazard("Há uma faca, um objeto cortante"),
        "Musical instrument" to m("instrumento musical"), "Guitar" to m("violão"), "Piano" to m("piano"),
        "Drum" to m("tambor"), "Ball" to f("bola"), "Money" to m("dinheiro"), "Wallet" to f("carteira"),
        // Comida
        "Food" to f("comida"), "Fruit" to f("fruta"), "Vegetable" to m("legume"), "Bread" to m("pão"),
        "Cake" to m("bolo"), "Pizza" to f("pizza"), "Cheeseburger" to m("hambúrguer"), "Hamburger" to m("hambúrguer"),
        "Coffee" to m("café"), "Juice" to m("suco"), "Wine" to m("vinho"), "Beer" to f("cerveja"),
        "Egg" to m("ovo"), "Banana" to f("banana"), "Apple" to f("maçã"), "Orange" to f("laranja"),
        "Cookie" to m("biscoito"), "Candy" to m("doce"), "Soup" to f("sopa"), "Salad" to f("salada"),
        // Ambientes e natureza
        "Plant" to f("planta"), "Flower" to f("flor"), "Tree" to f("árvore"), "Grass" to f("grama"),
        "Garden" to m("jardim"), "Park" to m("parque"), "Building" to m("prédio"), "Skyscraper" to m("arranha-céu"),
        "House" to f("casa"), "Sky" to m("céu"), "Cloud" to f("nuvem"), "Sunset" to m("pôr do sol"),
        "Beach" to f("praia"), "Lake" to m("lago"), "River" to m("rio"), "Mountain" to f("montanha"),
        "Snow" to f("neve"), "Rain" to f("chuva"), "Pool" to f("piscina"), "Pier" to m("píer"),
        "Factory" to f("fábrica"), "Church" to f("igreja"), "Shop" to f("loja"), "Supermarket" to m("supermercado"),
        "Office" to m("escritório"), "Restaurant" to m("restaurante"), "Stadium" to m("estádio"),
        "Fire" to m("fogo"),
        "Bonfire" to f("fogueira"),
        "Fireworks" to m("fogos de artifício"),
    )

    override val cocoLabels: Map<String, Term> = mapOf(
        "person" to f("pessoa"), "bicycle" to f("bicicleta"), "car" to m("carro"), "motorcycle" to f("moto"),
        "airplane" to m("avião"), "bus" to m("ônibus"), "train" to m("trem"), "truck" to m("caminhão"), "boat" to m("barco"),
        "traffic light" to m("semáforo"), "fire hydrant" to m("hidrante"), "stop sign" to f("placa de pare"),
        "parking meter" to m("parquímetro"), "bench" to m("banco"), "bird" to m("pássaro"), "cat" to m("gato"),
        "dog" to m("cachorro"), "horse" to m("cavalo"), "sheep" to f("ovelha"), "cow" to f("vaca"),
        "elephant" to m("elefante"), "bear" to m("urso"), "zebra" to f("zebra"), "giraffe" to f("girafa"),
        "backpack" to f("mochila"), "umbrella" to m("guarda-chuva"), "handbag" to f("bolsa"), "tie" to f("gravata"),
        "suitcase" to f("mala"), "frisbee" to m("frisbee"), "skis" to m("esqui"), "snowboard" to f("prancha de neve"),
        "sports ball" to f("bola"), "kite" to f("pipa"), "baseball bat" to m("taco"), "baseball glove" to f("luva"),
        "skateboard" to m("skate"), "surfboard" to f("prancha de surfe"), "tennis racket" to f("raquete"),
        "bottle" to f("garrafa"), "wine glass" to f("taça"), "cup" to m("copo"), "fork" to m("garfo"),
        "knife" to f("faca").withHazard("Há uma faca, um objeto cortante"), "spoon" to f("colher"), "bowl" to f("tigela"),
        "banana" to f("banana"), "apple" to f("maçã"), "sandwich" to m("sanduíche"), "orange" to f("laranja"),
        "broccoli" to m("brócolis"), "carrot" to f("cenoura"), "hot dog" to m("cachorro-quente"), "pizza" to f("pizza"),
        "donut" to f("rosquinha"), "cake" to m("bolo"), "chair" to f("cadeira"), "couch" to m("sofá"),
        "potted plant" to m("vaso de planta"), "bed" to f("cama"), "dining table" to f("mesa"),
        "toilet" to m("vaso sanitário"), "tv" to f("televisão"), "laptop" to m("notebook"), "mouse" to m("mouse"),
        "remote" to m("controle remoto"), "keyboard" to m("teclado"), "cell phone" to m("celular"),
        "microwave" to m("micro-ondas"), "oven" to m("forno"), "toaster" to f("torradeira"), "sink" to f("pia"),
        "refrigerator" to f("geladeira"), "book" to m("livro"), "clock" to m("relógio"), "vase" to m("vaso"),
        "scissors" to f("tesoura").withHazard("Há uma tesoura, um objeto cortante"), "teddy bear" to m("ursinho de pelúcia"),
        "hair drier" to m("secador de cabelo"), "toothbrush" to f("escova de dentes"),
    )
}
