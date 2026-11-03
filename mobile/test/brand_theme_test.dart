import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mais1km/core/theme/brand_theme.dart';

void main() {
  test('tema escuro reproduz os tokens institucionais efetivos do PWA', () {
    final theme = Mais1kmTheme.dark;

    expect(theme.brightness, Brightness.dark);
    expect(theme.scaffoldBackgroundColor, BrandPalette.forestDeep);
    expect(theme.colorScheme.primary, BrandPalette.gold);
    expect(theme.colorScheme.surface, BrandPalette.darkSurface);
    expect(theme.dividerColor, BrandPalette.darkRule);
  });

  test('tema claro mantém a paleta de pergaminho do PWA', () {
    final theme = Mais1kmTheme.light;

    expect(theme.brightness, Brightness.light);
    expect(theme.scaffoldBackgroundColor, BrandPalette.lightPaper);
    expect(theme.colorScheme.surface, BrandPalette.lightCard);
  });
}
