/// Avaliação de um estabelecimento (só de quem usou o desconto).
class Review {
  const Review({
    required this.rating,
    required this.author,
    required this.createdAt,
    this.comment,
  });

  final int rating;
  final String author;
  final DateTime createdAt;
  final String? comment;

  factory Review.fromJson(Map<String, dynamic> json) => Review(
    rating: json['rating'] as int,
    author: json['author'] as String,
    createdAt: DateTime.parse(json['createdAt'] as String).toLocal(),
    comment: json['comment'] as String?,
  );
}
