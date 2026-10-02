import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/app_config.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/partner.dart';
import '../../l10n/app_localizations.dart';
import '../../routes/route_paths.dart';
import '../../widgets/category_chips.dart';
import '../../widgets/eclud_logo.dart';
import '../../widgets/partner_card.dart';
import '../location/location_providers.dart';
import '../partners/partner_providers.dart';

/// Tela 3 — mapa com os parceiros próximos.
class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  final _mapController = MapController();
  String? _selectedId;

  static const _zoom = 15.0;

  void _recenter() {
    final location = ref.read(userLocationProvider).value;
    _mapController.move(location ?? AppConfig.defaultCenter, _zoom);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final userLocation = ref.watch(userLocationProvider).value;
    final partners = ref.watch(mapPartnersProvider).value ?? const [];
    final category = ref.watch(mapCategoryProvider);

    NearbyPartner? selected;
    for (final item in partners) {
      if (item.partner.id == _selectedId) selected = item;
    }
    selected ??= partners.isEmpty ? null : partners.first;

    // Centraliza no usuário assim que a localização chegar.
    ref.listen(userLocationProvider, (_, next) {
      final value = next.value;
      if (value != null) _mapController.move(value, _zoom);
    });

    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: userLocation ?? AppConfig.defaultCenter,
            initialZoom: _zoom,
            backgroundColor: AppColors.background,
          ),
          children: [
            TileLayer(
              urlTemplate: AppConfig.mapTileUrl,
              subdomains: const ['a', 'b', 'c', 'd'],
              retinaMode: RetinaMode.isHighDensity(context),
              userAgentPackageName: 'com.leunamesoftwares.eclud',
            ),
            MarkerLayer(
              markers: [
                for (final item in partners)
                  Marker(
                    point: item.partner.location,
                    width: 40,
                    height: 48,
                    alignment: Alignment.topCenter,
                    child: _PartnerPin(
                      selected: item.partner.id == selected?.partner.id,
                      label: item.partner.name,
                      onTap: () =>
                          setState(() => _selectedId = item.partner.id),
                    ),
                  ),
                if (userLocation != null)
                  Marker(
                    point: userLocation,
                    width: 28,
                    height: 28,
                    child: const _UserDot(),
                  ),
              ],
            ),
            // Crédito obrigatório do provedor do mapa.
            const Align(
              alignment: Alignment.bottomRight,
              child: ColoredBox(
                color: Color(0x99000000),
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  child: Text(
                    '© ${AppConfig.mapAttribution}',
                    style: TextStyle(fontSize: 10, color: AppColors.textMuted),
                  ),
                ),
              ),
            ),
          ],
        ),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
            child: Column(
              children: [
                const Align(
                  alignment: Alignment.centerLeft,
                  child: EcludLogoRow(),
                ),
                const SizedBox(height: 12),
                TextField(
                  onChanged: ref.read(mapSearchProvider.notifier).update,
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: l10n.mapSearchHint,
                    prefixIcon: const Icon(Icons.search),
                    fillColor: AppColors.surface.withValues(alpha: 0.95),
                  ),
                ),
              ],
            ),
          ),
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: 28,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Padding(
                padding: const EdgeInsets.only(right: 20, bottom: 12),
                child: FloatingActionButton.small(
                  heroTag: null,
                  tooltip: l10n.myLocation,
                  backgroundColor: AppColors.surface,
                  foregroundColor: AppColors.text,
                  onPressed: _recenter,
                  child: const Icon(Icons.my_location),
                ),
              ),
              if (selected != null)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: PartnerCard(
                    item: selected,
                    onTap: () =>
                        context.push(RoutePaths.partner(selected!.partner.id)),
                  ),
                ),
              const SizedBox(height: 12),
              CategoryChips(
                selected: category,
                onSelected: (value) {
                  setState(() => _selectedId = null);
                  ref.read(mapCategoryProvider.notifier).select(value);
                },
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _PartnerPin extends StatelessWidget {
  const _PartnerPin({
    required this.selected,
    required this.label,
    required this.onTap,
  });

  final bool selected;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      child: GestureDetector(
        onTap: onTap,
        child: Icon(
          Icons.location_on,
          size: selected ? 48 : 40,
          color: selected ? AppColors.gold : AppColors.green,
          shadows: const [Shadow(color: Colors.black54, blurRadius: 6)],
        ),
      ),
    );
  }
}

class _UserDot extends StatelessWidget {
  const _UserDot();

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      color: const Color(0x334A8DFF),
      border: Border.all(color: const Color(0x664A8DFF)),
    ),
    alignment: Alignment.center,
    child: Container(
      width: 14,
      height: 14,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: const Color(0xFF4A8DFF),
        border: Border.all(color: Colors.white, width: 2),
      ),
    ),
  );
}
