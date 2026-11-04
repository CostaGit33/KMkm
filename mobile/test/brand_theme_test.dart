import 'dart:ui';

import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/core/theme/brand_theme.dart';

void main() {
  test('tokens escuros correspondem à identidade efetiva do PWA', () {
    expect(BrandPalette.forestDeep, const Color(0xFF081D14));
    expect(BrandPalette.forest, const Color(0xFF1A472E));
    expect(BrandPalette.gold, const Color(0xFFC2A169));
    expect(BrandPalette.cream, const Color(0xFFF2E8DC));
    expect(BrandPalette.darkSurface, const Color(0xFF10271C));
    expect(BrandPalette.darkMuted, const Color(0xFFC4CFC4));
    expect(BrandPalette.darkRule, const Color(0xFF385746));
  });

  test('tokens claros preservam a paleta de pergaminho do PWA', () {
    expect(BrandPalette.lightPaper, const Color(0xFFF2E8DC));
    expect(BrandPalette.lightPaperDeep, const Color(0xFFE6D9C8));
    expect(BrandPalette.lightCard, const Color(0xFFFFF9F1));
    expect(BrandPalette.lightCardStrong, const Color(0xFFEDE2D3));
    expect(BrandPalette.lightInk, const Color(0xFF10271C));
    expect(BrandPalette.lightMuted, const Color(0xFF4E5D51));
    expect(BrandPalette.lightRule, const Color(0xFFC8B9A3));
  });
}
