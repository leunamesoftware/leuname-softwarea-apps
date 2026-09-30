package com.leuname.lerguie.i18n

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
    override fun personAt(position: String) = "Parece haver uma pessoa $position."
    override fun oneObjectAt(position: String) = "Há um objeto $position."
    override fun manyObjects(count: Int) = "Há $count objetos à sua frente."
    override fun alsoSeen(names: List<String>) = "Também identifiquei: ${names.joinToString(", ")}."
    override fun objectAt(what: String?, position: String, near: Boolean) =
        "Há ${what ?: "um objeto"} $position${if (near) ", bem próximo" else ""}."
    override fun vehicleNear(position: String) = "Há um veículo muito próximo, $position"
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
        "Room" to m("cômodo"), "Wall" to f("parede"), "Floor" to m("chão"), "Stairs" to f("escada").withHazard("Há uma escada à frente"),
        "Television" to f("televisão"), "Clock" to m("relógio"), "Mirror" to m("espelho"),
        "Refrigerator" to f("geladeira"), "Oven" to m("forno"), "Microwave" to m("micro-ondas"),
        "Pillow" to m("travesseiro"), "Blanket" to m("cobertor"), "Rug" to m("tapete"),
        // Objetos
        "Mobile phone" to m("celular"), "Computer" to m("computador"), "Laptop" to m("notebook"),
        "Keyboard" to m("teclado"), "Screen" to f("tela"), "Monitor" to m("monitor"), "Camera" to f("câmera"),
        "Cup" to f("xícara"), "Mug" to f("caneca"), "Bottle" to f("garrafa"), "Glass" to m("copo"),
        "Plate" to m("prato"), "Bowl" to f("tigela"), "Fork" to m("garfo"), "Spoon" to f("colher"),
        "Glasses" to m("óculos"), "Sunglasses" to m("óculos de sol"), "Hat" to m("chapéu"), "Cap" to m("boné"),
        "Shoe" to m("sapato"), "Sneakers" to m("tênis"), "Jeans" to f("calça jeans"), "Jacket" to f("jaqueta"),
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
        "Fire" to m("fogo").withHazard("Há fogo à frente"),
        "Bonfire" to f("fogueira").withHazard("Há fogo à frente"),
        "Fireworks" to m("fogos de artifício"),
    )

    override val objectCategories: Map<String, Term> = mapOf(
        "Fashion good" to m("item de vestuário"),
        "Food" to f("comida"),
        "Home good" to m("objeto doméstico"),
        "Place" to m("lugar"),
        "Plant" to f("planta"),
    )

}
