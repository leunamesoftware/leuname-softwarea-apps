import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../data/models/merchant_dashboard.dart';
import '../../../l10n/app_localizations.dart';
import '../../../widgets/primary_button.dart';
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
  bool _saving = false;

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
          const SizedBox(height: 12),
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
          const SizedBox(height: 8),
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
