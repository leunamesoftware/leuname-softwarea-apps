import '../datasources/credit_remote_datasource.dart';
import '../models/credit_transaction_model.dart';

class CreditRepository {
  CreditRepository(this._dataSource);

  final CreditRemoteDataSource _dataSource;

  Stream<List<CreditTransactionModel>> watchHistory(String uid) {
    return _dataSource.watchHistory(uid).map((snapshot) {
      return snapshot.docs
          .map((doc) => CreditTransactionModel.fromMap(doc.id, doc.data()))
          .toList();
    });
  }
}
