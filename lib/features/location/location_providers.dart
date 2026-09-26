import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Localização atual escolhida pelo usuário, exibida no cabeçalho do app.
/// Placeholder até a Fase 3 (seleção de Estado/Cidade/Bairro com mapa);
/// por ora fixa um valor padrão para as telas já poderem exibir o cabeçalho
/// completo.
final currentLocationLabelProvider = StateProvider<String>(
  (ref) => 'Rio de Janeiro - RJ',
);

final currentRegionLabelProvider = StateProvider<String>((ref) => 'Centro');
