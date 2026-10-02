import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../core/config/app_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/error_messages.dart';
import '../../data/models/admin_merchant.dart';
import '../../data/models/partner_category.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/category_style.dart';
import '../../widgets/content_width.dart';
import '../../widgets/primary_button.dart';
import '../auth/auth_form.dart';
import 'admin_providers.dart';

/// Cadastro de um estabelecimento, com a localização marcada no mapa.
class MerchantFormScreen extends ConsumerStatefulWidget {
  const MerchantFormScreen({super.key});

  @override
  ConsumerState<MerchantFormScreen> createState() => _MerchantFormState();
}

class _MerchantFormState extends ConsumerState<MerchantFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _discount = TextEditingController(text: '10');
  final _rule = TextEditingController();
  final _address = TextEditingController();
  final _city = TextEditingController(text: 'Madrid');
  final _country = TextEditingController(text: 'España');
  final _owner = TextEditingController();
  final _pin = TextEditingController();
  final _menu = TextEditingController();
  final _image = TextEditingController();
  PartnerCategory _category = PartnerCategory.food;
  int _priceLevel = 2;
  LatLng? _location;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    for (final c in [
      _name,
      _discount,
      _rule,
      _address,
      _city,
      _country,
      _owner,
      _pin,
      _menu,
      _image,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  String? _optional(String text) => text.trim().isEmpty ? null : text.trim();

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context);
    final valid = _formKey.currentState!.validate();
    if (_location == null) {
      setState(() => _error = l10n.locationRequired);
      return;
    }
    if (!valid) return;

    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref
          .read(adminMerchantsProvider.notifier)
          .create(
            NewMerchant(
              name: _name.text.trim(),
              category: _category,
              priceLevel: _priceLevel,
              discountPercent: int.parse(_discount.text),
              discountRule: _optional(_rule.text),
              address: _address.text.trim(),
              city: _city.text.trim(),
              country: _country.text.trim(),
              location: _location!,
              ownerEmail: _owner.text.trim(),
              pin: _pin.text,
              menuUrl: _optional(_menu.text),
              imageUrl: _optional(_image.text),
            ),
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l10n.merchantCreated)));
      context.pop();
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(l10n, e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    String? required(String? v) =>
        (v?.trim().isEmpty ?? true) ? l10n.fieldRequired : null;
    String? httpsOptional(String? v) {
      final value = v?.trim() ?? '';
      if (value.isEmpty) return null;
      final uri = Uri.tryParse(value);
      return uri == null || uri.scheme != 'https' || uri.host.isEmpty
          ? l10n.urlInvalid
          : null;
    }

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: Text(
          l10n.addMerchant,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      body: ContentWidth(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
            children: [
              AuthField(
                controller: _name,
                label: l10n.nameLabel,
                validator: required,
              ),
              DropdownButtonFormField<PartnerCategory>(
                initialValue: _category,
                decoration: InputDecoration(
                  labelText: l10n.categoryLabel,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14),
                ),
                items: [
                  for (final c in PartnerCategory.values)
                    DropdownMenuItem(value: c, child: Text(c.label(l10n))),
                ],
                onChanged: (v) => setState(() => _category = v ?? _category),
              ),
              const SizedBox(height: 14),
              Text(
                l10n.priceLevelLabel,
                style: const TextStyle(color: AppColors.textMuted),
              ),
              const SizedBox(height: 6),
              SegmentedButton<int>(
                segments: [
                  for (var i = 1; i <= 3; i++)
                    ButtonSegment(value: i, label: Text('€' * i)),
                ],
                selected: {_priceLevel},
                onSelectionChanged: (s) =>
                    setState(() => _priceLevel = s.first),
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _discount,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: InputDecoration(
                  labelText: l10n.discountPercentLabel,
                  suffixText: '%',
                  contentPadding: const EdgeInsets.all(14),
                ),
                validator: (v) {
                  final n = int.tryParse(v ?? '');
                  return n == null || n < 5 || n > 50
                      ? l10n.percentInvalid
                      : null;
                },
              ),
              const SizedBox(height: 14),
              AuthField(controller: _rule, label: l10n.discountRuleLabel),
              AuthField(
                controller: _address,
                label: l10n.addressLabel,
                validator: required,
              ),
              Row(
                children: [
                  Expanded(
                    child: AuthField(
                      controller: _city,
                      label: l10n.cityLabel,
                      validator: required,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: AuthField(
                      controller: _country,
                      label: l10n.countryLabel,
                      validator: required,
                    ),
                  ),
                ],
              ),
              Text(
                '${l10n.locationLabel} · ${l10n.locationHint}',
                style: const TextStyle(color: AppColors.textMuted),
              ),
              const SizedBox(height: 8),
              _LocationPicker(
                value: _location,
                onChanged: (p) => setState(() {
                  _location = p;
                  _error = null;
                }),
              ),
              const SizedBox(height: 14),
              AuthField(
                controller: _owner,
                label: l10n.ownerEmailLabel,
                hint: l10n.ownerEmailHint,
                keyboardType: TextInputType.emailAddress,
                validator: (v) => AuthValidators.email(l10n, v),
              ),
              TextFormField(
                controller: _pin,
                keyboardType: TextInputType.number,
                obscureText: true,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(4),
                ],
                decoration: InputDecoration(
                  labelText: l10n.pinLabel,
                  contentPadding: const EdgeInsets.all(14),
                ),
                validator: (v) => v?.length == 4 ? null : l10n.pinInvalid,
              ),
              const SizedBox(height: 14),
              AuthField(
                controller: _menu,
                label: l10n.menuUrlLabel,
                keyboardType: TextInputType.url,
                validator: httpsOptional,
              ),
              AuthField(
                controller: _image,
                label: l10n.imageUrlLabel,
                keyboardType: TextInputType.url,
                validator: httpsOptional,
              ),
              AuthError(_error),
              _saving
                  ? const Center(child: CircularProgressIndicator())
                  : PrimaryButton(label: l10n.addMerchant, onPressed: _save),
            ],
          ),
        ),
      ),
    );
  }
}

class _LocationPicker extends StatelessWidget {
  const _LocationPicker({required this.value, required this.onChanged});

  final LatLng? value;
  final ValueChanged<LatLng> onChanged;

  @override
  Widget build(BuildContext context) {
    final point = value;
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: SizedBox(
        height: 240,
        child: FlutterMap(
          options: MapOptions(
            initialCenter: point ?? AppConfig.defaultCenter,
            initialZoom: 14,
            backgroundColor: AppColors.surface,
            onTap: (_, p) => onChanged(p),
          ),
          children: [
            TileLayer(
              urlTemplate: AppConfig.mapTileUrl,
              subdomains: const ['a', 'b', 'c', 'd'],
              userAgentPackageName: 'com.leunamesoftwares.eclud',
            ),
            if (point != null)
              MarkerLayer(
                markers: [
                  Marker(
                    point: point,
                    width: 40,
                    height: 48,
                    alignment: Alignment.topCenter,
                    child: const Icon(
                      Icons.location_on,
                      size: 44,
                      color: AppColors.gold,
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
