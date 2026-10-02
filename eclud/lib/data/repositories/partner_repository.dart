import '../models/partner.dart';

/// Fonte dos estabelecimentos parceiros. A implementação de demonstração
/// será trocada pela da API quando o backend estiver pronto.
abstract interface class PartnerRepository {
  Future<List<Partner>> fetchPartners();
}
