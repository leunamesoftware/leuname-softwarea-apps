/// Detecção básica de tentativa de contato externo no texto do chat
/// (item 13 do escopo do produto): números de telefone, WhatsApp e redes
/// sociais não podem ser compartilhados dentro da negociação — tudo deve
/// acontecer pelo chat interno. Isto é uma primeira camada (regex); análise
/// de imagem (OCR) fica para a Fase 11 (moderação).
abstract final class ContactFilter {
  static final _phone = RegExp(r'(\+?\d[\d\s().-]{7,}\d)');
  static final _keywords = RegExp(
    r'\b(whats\s*app|whatsapp|zap\s*zap|zapzap|telegram|instagram|insta\b|facebook|@gmail|@hotmail|@outlook)\b',
    caseSensitive: false,
  );

  /// Retorna `true` quando o texto provavelmente contém uma tentativa de
  /// compartilhar contato externo.
  static bool containsExternalContact(String text) {
    final digitsOnly = text.replaceAll(RegExp(r'[^\d]'), '');
    if (digitsOnly.length >= 8 && _phone.hasMatch(text)) return true;
    return _keywords.hasMatch(text);
  }
}
