import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/error_messages.dart';
import '../../../data/models/merchant_dashboard.dart';
import '../../../data/models/opening_hours.dart';
import '../../../l10n/app_localizations.dart';
import '../../../widgets/partner_image.dart';
import '../../../widgets/primary_button.dart';
import '../../partners/partner_providers.dart';
import 'opening_hours_editor.dart';
import '../merchant_providers.dart';

/// Ajustes do estabelecimento: visibilidade, desconto, regra, carta e PIN.
class MerchantSettingsForm extends ConsumerStatefulWidget {
  const MerchantSettingsForm({super.key, required this.data});

  final MerchantDashboard data;

  @override
  ConsumerState<MerchantSettingsForm> createState() =>
      _MerchantSettingsFormState();
}

class _MerchantSettingsFormState extends ConsumerState<MerchantSettingsForm> {
  final _formKey = GlobalKey<FormState>();
  late bool _active = widget.data.isActive;
  late final _percent = TextEditingController(
    text: '${widget.data.partner.discountPercent}',
  );
  late final _rule = TextEditingController(
    text: widget.data.partner.discountRule ?? '',
  );
  late final _menu = TextEditingController(
    text: widget.data.partner.menuUrl ?? '',
  );
  final _pin = TextEditingController();
  late Map<int, List<TimeRange>> _hours = {
    ...?widget.data.partner.openingHours?.days,
  };
  bool _saving = false;
  bool _uploading = false;

  static const minPercent = 5;
  static const maxPercent = 50;

  @override
  void dispose() {
    _percent.dispose();
    _rule.dispose();
    _menu.dispose();
    _pin.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final l10n = AppLocalizations.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _saving = true);
    try {
      await ref
          .read(merchantRepositoryProvider)
          .saveSettings(
            MerchantSettings(
              isActive: _active,
              discountPercent: int.parse(_percent.text),
              discountRule: _rule.text.trim(),
              menuUrl: _menu.text.trim().isEmpty ? null : _menu.text.trim(),
              newPin: _pin.text.isEmpty ? null : _pin.text,
              openingHours: _hours.values.every((r) => r.isEmpty)
                  ? null
                  : OpeningHours(_hours),
            ),
          );
      _pin.clear();
      ref.invalidate(merchantDashboardProvider);
      messenger.showSnackBar(SnackBar(content: Text(l10n.settingsSaved)));
    } catch (_) {
      messenger.showSnackBar(SnackBar(content: Text(l10n.loadError)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickPhoto() async {
    final l10n = AppLocalizations.of(context);
    final messenger = ScaffoldMessenger.of(context);
    // Reduz no próprio aparelho: foto leve carrega rápido para o cliente.
    final file = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 1600,
      imageQuality: 82,
    );
    if (file == null) return;
    final bytes = await file.readAsBytes();
    if (bytes.length > 2 * 1024 * 1024) {
      messenger.showSnackBar(SnackBar(content: Text(l10n.photoTooLarge)));
      return;
    }
    final name = file.name.toLowerCase();
    final type = name.endsWith('.png')
        ? 'image/png'
        : name.endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg';
    setState(() => _uploading = true);
    try {
      await ref.read(merchantRepositoryProvider).uploadPhoto(bytes, type);
      ref.invalidate(merchantDashboardProvider);
      ref.invalidate(nearbyPartnersProvider);
      messenger.showSnackBar(SnackBar(content: Text(l10n.photoUpdated)));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(errorMessage(l10n, e))));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Form(
      key: _formKey,
      child: Column(
        children: [
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: _active,
            activeThumbColor: AppColors.green,
            onChanged: (v) => setState(() => _active = v),
            title: Text(
              l10n.visibleInApp,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            subtitle: Text(
              l10n.visibleInAppHint,
              style: const TextStyle(color: AppColors.textMuted),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              PartnerImage.of(widget.data.partner, size: 64),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  l10n.photoLabel,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
              _uploading
                  ? const CircularProgressIndicator()
                  : OutlinedButton.icon(
                      onPressed: _pickPhoto,
                      icon: const Icon(Icons.photo_camera_outlined),
                      label: Text(l10n.changePhoto),
                    ),
            ],
          ),
          const SizedBox(height: 20),
          _field(
            controller: _percent,
            label: l10n.discountPercentLabel,
            suffix: '%',
            keyboard: TextInputType.number,
            formatters: [FilteringTextInputFormatter.digitsOnly],
            validator: (v) {
              final n = int.tryParse(v ?? '');
              return n == null || n < minPercent || n > maxPercent
                  ? l10n.percentInvalid
                  : null;
            },
          ),
          _field(
            controller: _rule,
            label: l10n.discountRuleLabel,
            maxLines: 3,
            maxLength: 200,
          ),
          _field(
            controller: _menu,
            label: l10n.menuUrlLabel,
            keyboard: TextInputType.url,
            validator: (v) {
              final value = v?.trim() ?? '';
              if (value.isEmpty) return null;
              final uri = Uri.tryParse(value);
              return uri == null || uri.scheme != 'https' || uri.host.isEmpty
                  ? l10n.urlInvalid
                  : null;
            },
          ),
          _field(
            controller: _pin,
            label: l10n.newPinLabel,
            hint: l10n.newPinHint,
            keyboard: TextInputType.number,
            obscure: true,
            formatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(4),
            ],
            validator: (v) =>
                (v ?? '').isEmpty || v!.length == 4 ? null : l10n.pinInvalid,
          ),
          OpeningHoursEditor(
            value: _hours,
            onChanged: (v) => setState(() => _hours = v),
          ),
          const SizedBox(height: 16),
          _saving
              ? const Padding(
                  padding: EdgeInsets.all(12),
                  child: CircularProgressIndicator(),
                )
              : PrimaryButton(label: l10n.saveChanges, onPressed: _save),
        ],
      ),
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String label,
    String? hint,
    String? suffix,
    TextInputType? keyboard,
    List<TextInputFormatter>? formatters,
    String? Function(String?)? validator,
    int maxLines = 1,
    int? maxLength,
    bool obscure = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboard,
        inputFormatters: formatters,
        validator: validator,
        maxLines: maxLines,
        maxLength: maxLength,
        obscureText: obscure,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          suffixText: suffix,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 14,
          ),
        ),
      ),
    );
  }
}
