import 'package:flutter/material.dart';

/// Coluna cujos itens entram em sequência (surgem e sobem levemente).
/// Respeita a opção do sistema de reduzir animações.
class StaggeredColumn extends StatefulWidget {
  const StaggeredColumn({
    super.key,
    required this.children,
    this.duration = const Duration(milliseconds: 1100),
  });

  final List<Widget> children;
  final Duration duration;

  @override
  State<StaggeredColumn> createState() => _StaggeredColumnState();
}

class _StaggeredColumnState extends State<StaggeredColumn>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: widget.duration,
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller.value = 1;
    } else if (!_controller.isAnimating && _controller.value == 0) {
      _controller.forward();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final n = widget.children.length;
    return Column(
      children: [
        for (var i = 0; i < n; i++)
          _Item(
            animation: CurvedAnimation(
              parent: _controller,
              curve: Interval(
                (i / n) * 0.6,
                (i / n) * 0.6 + 0.4,
                curve: Curves.easeOutCubic,
              ),
            ),
            child: widget.children[i],
          ),
      ],
    );
  }
}

class _Item extends StatelessWidget {
  const _Item({required this.animation, required this.child});

  final Animation<double> animation;
  final Widget child;

  @override
  Widget build(BuildContext context) => FadeTransition(
    opacity: animation,
    child: SlideTransition(
      position: Tween(
        begin: const Offset(0, 0.15),
        end: Offset.zero,
      ).animate(animation),
      child: child,
    ),
  );
}

/// Símbolo que "pulsa" de leve ao aparecer, com brilho verde.
class GlowingMark extends StatelessWidget {
  const GlowingMark({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) return child;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.6, end: 1),
      duration: const Duration(milliseconds: 900),
      curve: Curves.elasticOut,
      builder: (_, scale, child) => Transform.scale(scale: scale, child: child),
      child: DecoratedBox(
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Color(0x401FD07F),
              blurRadius: 48,
              spreadRadius: 4,
            ),
          ],
        ),
        child: child,
      ),
    );
  }
}
