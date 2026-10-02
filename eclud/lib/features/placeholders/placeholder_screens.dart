import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../widgets/coming_soon_view.dart';

class SavingsScreen extends StatelessWidget {
  const SavingsScreen({super.key});

  @override
  Widget build(BuildContext context) => ComingSoonView(
    title: AppLocalizations.of(context).navSavings,
    icon: Icons.savings_outlined,
  );
}

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) => ComingSoonView(
    title: AppLocalizations.of(context).navProfile,
    icon: Icons.person_outline,
  );
}
