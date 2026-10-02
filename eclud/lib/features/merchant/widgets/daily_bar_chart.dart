import 'dart:math';

import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

/// Gráfico de colunas por dia do mês. Toque numa coluna para ver o valor.
class DailyBarChart extends StatefulWidget {
  const DailyBarChart({
    super.key,
    required this.values,
    required this.start,
    required this.semanticLabel,
    required this.tooltipFor,
  });

  final List<int> values;

  /// Data da primeira coluna.
  final DateTime start;
  final String semanticLabel;
  final String Function(DateTime date, int value) tooltipFor;

  @override
  State<DailyBarChart> createState() => _DailyBarChartState();
}

class _DailyBarChartState extends State<DailyBarChart> {
  int? _selected;

  // Verde dentro da faixa de luminosidade validada para o fundo escuro.
  static const _barColor = Color(0xFF14A865);
  static const _height = 170.0;
  static const _axisWidth = 28.0;

  DateTime _dateAt(int index) =>
      DateTime(widget.start.year, widget.start.month, widget.start.day + index);

  void _select(Offset local, double plotWidth) {
    final n = widget.values.length;
    if (n == 0) return;
    final x = local.dx - _axisWidth;
    final index = (x / (plotWidth / n)).floor().clamp(0, n - 1);
    setState(() => _selected = index == _selected ? null : index);
  }

  @override
  Widget build(BuildContext context) {
    final selected = _selected;
    return Semantics(
      label: widget.semanticLabel,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 22,
            child: selected == null
                ? null
                : Text(
                    widget.tooltipFor(
                      _dateAt(selected),
                      widget.values[selected],
                    ),
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: AppColors.text,
                    ),
                  ),
          ),
          LayoutBuilder(
            builder: (context, constraints) {
              final plotWidth = constraints.maxWidth - _axisWidth;
              return GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTapDown: (d) => _select(d.localPosition, plotWidth),
                child: CustomPaint(
                  size: Size(constraints.maxWidth, _height),
                  painter: _BarsPainter(
                    values: widget.values,
                    start: widget.start,
                    selected: selected,
                    barColor: _barColor,
                    axisWidth: _axisWidth,
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _BarsPainter extends CustomPainter {
  _BarsPainter({
    required this.values,
    required this.start,
    required this.selected,
    required this.barColor,
    required this.axisWidth,
  });

  final List<int> values;
  final DateTime start;
  final int? selected;
  final Color barColor;
  final double axisWidth;

  static const _labelHeight = 18.0;
  static const _labelStyle = TextStyle(
    fontSize: 10,
    color: AppColors.textMuted,
    fontFamily: 'Montserrat',
  );

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;
    final plotHeight = size.height - _labelHeight;
    final plotWidth = size.width - axisWidth;
    final maxValue = _niceMax(values.reduce(max));

    // Grade discreta: 0, metade e máximo.
    final grid = Paint()
      ..color = const Color(0x1AFFFFFF)
      ..strokeWidth = 1;
    for (final v in [0, maxValue ~/ 2, maxValue]) {
      final y = plotHeight - plotHeight * v / maxValue;
      canvas.drawLine(Offset(axisWidth, y), Offset(size.width, y), grid);
      _text(canvas, '$v', Offset(0, y - 6), axisWidth - 6, TextAlign.right);
    }

    final slot = plotWidth / values.length;
    // Coluna fina com 2px de respiro entre vizinhas, no máximo 24px.
    final barWidth = min(24.0, max(2.0, slot - 2));
    for (var i = 0; i < values.length; i++) {
      final h = plotHeight * values[i] / maxValue;
      final left = axisWidth + i * slot + (slot - barWidth) / 2;
      final rect = Rect.fromLTWH(left, plotHeight - h, barWidth, h);
      final radius = Radius.circular(min(4, barWidth / 2));
      canvas.drawRRect(
        RRect.fromRectAndCorners(rect, topLeft: radius, topRight: radius),
        Paint()
          ..color = selected == null || selected == i
              ? (selected == i ? AppColors.green : barColor)
              : barColor.withValues(alpha: 0.45),
      );

      // Rótulo a cada 5 colunas, contando a partir de hoje (última coluna),
      // para nunca encavalar dois rótulos.
      if ((values.length - 1 - i) % 5 == 0) {
        final day = DateTime(start.year, start.month, start.day + i).day;
        _text(
          canvas,
          day.toString().padLeft(2, '0'),
          Offset(left + barWidth / 2 - 10, plotHeight + 4),
          20,
          TextAlign.center,
        );
      }
    }
  }

  void _text(
    Canvas canvas,
    String text,
    Offset offset,
    double width,
    TextAlign align,
  ) {
    final painter = TextPainter(
      text: TextSpan(text: text, style: _labelStyle),
      textAlign: align,
      textDirection: TextDirection.ltr,
    )..layout(minWidth: width, maxWidth: width);
    painter.paint(canvas, offset);
  }

  /// Arredonda o topo do eixo para a dezena acima, para a metade ser inteira.
  static int _niceMax(int value) => max(10, (value / 10).ceil() * 10);

  @override
  bool shouldRepaint(_BarsPainter old) =>
      old.values != values || old.start != start || old.selected != selected;
}
