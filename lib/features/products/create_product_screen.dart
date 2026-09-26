import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/constants/app_constants.dart';
import '../../core/services/storage_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../data/models/product_model.dart';
import '../../data/models/product_status.dart';
import '../../routes/route_paths.dart';
import '../auth/auth_providers.dart';
import '../categories/category_providers.dart';
import '../location/location_providers.dart';
import 'product_providers.dart';

/// Tela de criação de anúncio (Fase 5). Publicar consome 1 crédito de
/// anúncio (Fase 6) e o anúncio fica ativo por 40 dias.
class CreateProductScreen extends ConsumerStatefulWidget {
  const CreateProductScreen({super.key});

  @override
  ConsumerState<CreateProductScreen> createState() =>
      _CreateProductScreenState();
}

class _CreateProductScreenState extends ConsumerState<CreateProductScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _priceController = TextEditingController();
  final _descriptionController = TextEditingController();

  final List<File> _images = [];
  String? _categoryId;
  ProductCondition _condition = ProductCondition.novo;
  int _quantity = 1;
  bool _publishing = false;

  @override
  void dispose() {
    _titleController.dispose();
    _priceController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickImages() async {
    final remaining = AppConstants.maxProductImages - _images.length;
    if (remaining <= 0) return;

    final picked = await ImagePicker().pickMultiImage(
      imageQuality: 80,
      limit: remaining,
    );
    setState(() => _images.addAll(picked.map((x) => File(x.path))));
  }

  Future<void> _publish() async {
    if (!_formKey.currentState!.validate()) return;
    if (_categoryId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Escolha uma categoria.')));
      return;
    }
    if (_images.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Adicione pelo menos 1 foto.')),
      );
      return;
    }

    final myUid = ref.read(authStateChangesProvider).value?.uid;
    if (myUid == null) return;

    setState(() => _publishing = true);
    try {
      final storage = ref.read(storageServiceProvider);
      final imageUrls = <String>[];
      for (var i = 0; i < _images.length; i++) {
        final url = await storage.uploadProductImage(
          sellerId: myUid,
          file: _images[i],
          index: i,
        );
        imageUrls.add(url);
      }

      final now = DateTime.now();
      final product = ProductModel(
        id: '',
        sellerId: myUid,
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        price: double.tryParse(_priceController.text.replaceAll(',', '.')) ?? 0,
        imageUrls: imageUrls,
        categoryId: _categoryId!,
        condition: _condition,
        quantity: _quantity,
        status: ProductStatus.active,
        state: 'RJ',
        city: ref.read(currentLocationLabelProvider),
        region: ref.read(currentRegionLabelProvider),
        createdAt: now,
        expiresAt: now.add(const Duration(days: AppConstants.adValidityDays)),
      );

      await ref.read(productRepositoryProvider).publish(product);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Anúncio publicado com sucesso!')),
        );
        _titleController.clear();
        _priceController.clear();
        _descriptionController.clear();
        setState(() {
          _images.clear();
          _categoryId = null;
          _condition = ProductCondition.novo;
          _quantity = 1;
        });
        context.go(RoutePaths.home);
      }
    } on StateError catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Não foi possível publicar. Tente de novo.'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _publishing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final city = ref.watch(currentLocationLabelProvider);
    final region = ref.watch(currentRegionLabelProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Criar anúncio')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Preencha as informações para publicar seu anúncio.',
                style: AppTextStyles.bodyRegular,
              ),
              const SizedBox(height: 20),

              _SectionLabel(
                number: 1,
                label:
                    'Fotos do produto (até ${AppConstants.maxProductImages} fotos)',
              ),
              const SizedBox(height: 10),
              _PhotosPicker(
                images: _images,
                onAdd: _pickImages,
                onRemove: (i) => setState(() => _images.removeAt(i)),
              ),
              const SizedBox(height: 20),

              const _SectionLabel(number: 2, label: 'Título do anúncio'),
              const SizedBox(height: 8),
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  hintText: 'Ex.: iPhone 13 128GB',
                ),
                validator: (v) => (v == null || v.trim().length < 3)
                    ? 'Informe um título.'
                    : null,
              ),
              const SizedBox(height: 20),

              const _SectionLabel(number: 3, label: 'Categoria'),
              const SizedBox(height: 8),
              categoriesAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => Text('Erro ao carregar categorias: $e'),
                data: (categories) => DropdownButtonFormField<String>(
                  initialValue: _categoryId,
                  hint: const Text('Selecione'),
                  items: categories
                      .map(
                        (c) =>
                            DropdownMenuItem(value: c.id, child: Text(c.name)),
                      )
                      .toList(),
                  onChanged: (value) => setState(() => _categoryId = value),
                ),
              ),
              const SizedBox(height: 20),

              const _SectionLabel(number: 4, label: 'Estado do produto'),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _ConditionButton(
                      label: 'Novo',
                      selected: _condition == ProductCondition.novo,
                      onTap: () =>
                          setState(() => _condition = ProductCondition.novo),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _ConditionButton(
                      label: 'Usado',
                      selected: _condition == ProductCondition.usado,
                      onTap: () =>
                          setState(() => _condition = ProductCondition.usado),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              const _SectionLabel(number: 5, label: 'Preço'),
              const SizedBox(height: 8),
              TextFormField(
                controller: _priceController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: const InputDecoration(
                  prefixText: 'R\$ ',
                  hintText: '0,00',
                ),
                validator: (v) {
                  final value = double.tryParse((v ?? '').replaceAll(',', '.'));
                  if (value == null || value <= 0) {
                    return 'Informe um preço válido.';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),

              const _SectionLabel(number: 6, label: 'Quantidade disponível'),
              const SizedBox(height: 8),
              Row(
                children: [
                  IconButton.filled(
                    onPressed: _quantity > 1
                        ? () => setState(() => _quantity--)
                        : null,
                    icon: const Icon(Icons.remove),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      '$_quantity',
                      style: AppTextStyles.titleSemiBold,
                    ),
                  ),
                  IconButton.filled(
                    onPressed: () => setState(() => _quantity++),
                    icon: const Icon(Icons.add),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              const _SectionLabel(number: 7, label: 'Localização'),
              const SizedBox(height: 8),
              InkWell(
                onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Escolha de localização — Fase 3.'),
                  ),
                ),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 14,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceMuted,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.location_on, color: AppColors.secondary),
                      const SizedBox(width: 10),
                      Expanded(child: Text('$region, $city')),
                      const Icon(Icons.chevron_right, color: Colors.grey),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              const _SectionLabel(number: 8, label: 'Descrição do produto'),
              const SizedBox(height: 8),
              TextFormField(
                controller: _descriptionController,
                maxLines: 4,
                maxLength: AppConstants.descriptionMaxLength,
                decoration: const InputDecoration(
                  hintText: 'Descreva o produto...',
                ),
                validator: (v) => (v == null || v.trim().length < 10)
                    ? 'Descreva melhor o produto.'
                    : null,
              ),

              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.paid_outlined, color: AppColors.secondary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '1 crédito de anúncio será usado para publicar.',
                        style: AppTextStyles.caption,
                      ),
                    ),
                    const Icon(
                      Icons.event_available_outlined,
                      color: AppColors.secondary,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Válido por ${AppConstants.adValidityDays} dias.',
                        style: AppTextStyles.caption,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              ElevatedButton.icon(
                onPressed: _publishing ? null : _publish,
                icon: _publishing
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.send),
                label: const Text('Publicar anúncio'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.number, required this.label});

  final int number;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CircleAvatar(
          radius: 11,
          backgroundColor: AppColors.secondary,
          child: Text(
            '$number',
            style: const TextStyle(
              fontSize: 11,
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(label, style: AppTextStyles.titleSemiBold),
      ],
    );
  }
}

class _PhotosPicker extends StatelessWidget {
  const _PhotosPicker({
    required this.images,
    required this.onAdd,
    required this.onRemove,
  });

  final List<File> images;
  final VoidCallback onAdd;
  final ValueChanged<int> onRemove;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 90,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          for (var i = 0; i < images.length; i++)
            Padding(
              padding: const EdgeInsets.only(right: 10),
              child: Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.file(
                      images[i],
                      width: 90,
                      height: 90,
                      fit: BoxFit.cover,
                    ),
                  ),
                  Positioned(
                    top: 4,
                    right: 4,
                    child: GestureDetector(
                      onTap: () => onRemove(i),
                      child: const CircleAvatar(
                        radius: 11,
                        backgroundColor: Colors.black54,
                        child: Icon(Icons.close, size: 14, color: Colors.white),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          if (images.length < AppConstants.maxProductImages)
            InkWell(
              onTap: onAdd,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.camera_alt_outlined, color: AppColors.secondary),
                    SizedBox(height: 4),
                    Text('Adicionar', style: TextStyle(fontSize: 11)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ConditionButton extends StatelessWidget {
  const _ConditionButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.surfaceMuted,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Text(
          label,
          style: AppTextStyles.titleSemiBold.copyWith(
            color: selected ? Colors.white : AppColors.textDark,
          ),
        ),
      ),
    );
  }
}
