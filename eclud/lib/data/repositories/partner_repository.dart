import '../models/partner.dart';
import '../models/review.dart';

/// Fonte dos estabelecimentos parceiros. A implementação de demonstração
/// será trocada pela da API quando o backend estiver pronto.
abstract interface class PartnerRepository {
  Future<List<Partner>> fetchPartners();

  Future<List<Review>> fetchReviews(String partnerId);

  /// Só aceita de quem já usou o desconto no estabelecimento.
  Future<void> submitReview(String partnerId, int rating, String? comment);
}
