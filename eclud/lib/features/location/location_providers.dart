import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import '../../core/config/app_config.dart';

/// Posição atual do usuário. Se a localização estiver desligada, negada ou
/// demorar demais, usa o centro padrão — o app nunca trava por causa disso.
final userLocationProvider = FutureProvider<LatLng>((ref) async {
  try {
    if (!await Geolocator.isLocationServiceEnabled()) {
      return AppConfig.defaultCenter;
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return AppConfig.defaultCenter;
    }
    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.medium,
        timeLimit: Duration(seconds: 8),
      ),
    );
    return LatLng(position.latitude, position.longitude);
  } catch (_) {
    return AppConfig.defaultCenter;
  }
});
