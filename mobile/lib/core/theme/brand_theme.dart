import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Tokens extraídos da cascata efetiva do PWA:
/// index.html -> styles.css -> future.css -> brand-system.css.
/// O tema escuro é o padrão do PWA; o claro mantém o pergaminho institucional.
class BrandPalette {
  static const forestDeep = Color(0xFF081D14);
  static const forest = Color(0xFF1A472E);
  static const green = Color(0xFF1F593A);
  static const gold = Color(0xFFC2A169);
  static const cream = Color(0xFFF2E8DC);
  static const darkSurface = Color(0xFF10271C);
  static const darkCard = Color(0xFF10271C);
  static const darkCardStrong = Color(0xFF1A472E);
  static const darkMuted = Color(0xFFC4CFC4);
  static const darkRule = Color(0xFF385746);
  static const darkBlue = Color(0xFF9DBEAA);
  static const darkGreen = Color(0xFF7FB18C);
  static const darkDanger = Color(0xFFE5A49A);

  static const lightPaper = Color(0xFFF2E8DC);
  static const lightPaperDeep = Color(0xFFE6D9C8);
  static const lightCard = Color(0xFFFFF9F1);
  static const lightCardStrong = Color(0xFFEDE2D3);
  static const lightInk = Color(0xFF10271C);
  static const lightMuted = Color(0xFF4E5D51);
  static const lightRule = Color(0xFFC8B9A3);
  static const lightGreen = Color(0xFF1F593A);
  static const lightGold = Color(0xFF8A6938);
}

class Mais1kmTheme {
  static ThemeData get dark {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: const ColorScheme(
        brightness: Brightness.dark,
        primary: BrandPalette.gold,
        onPrimary: BrandPalette.forestDeep,
        secondary: BrandPalette.darkBlue,
        onSecondary: BrandPalette.forestDeep,
        error: BrandPalette.darkDanger,
        onError: BrandPalette.forestDeep,
        surface: BrandPalette.darkSurface,
        onSurface: BrandPalette.cream,
        surfaceContainerHighest: BrandPalette.darkCardStrong,
        onSurfaceVariant: BrandPalette.darkMuted,
        outline: BrandPalette.darkRule,
        outlineVariant: BrandPalette.darkRule,
        shadow: Colors.black,
        scrim: Colors.black,
        inverseSurface: BrandPalette.cream,
        onInverseSurface: BrandPalette.forestDeep,
        inversePrimary: BrandPalette.forest,
        tertiary: BrandPalette.darkGreen,
        onTertiary: BrandPalette.forestDeep,
        surfaceTint: BrandPalette.gold,
      ),
      scaffoldBackgroundColor: BrandPalette.forestDeep,
      dividerColor: BrandPalette.darkRule,
    );
    final text = GoogleFonts.montserratTextTheme(base.textTheme).copyWith(
      displayLarge: GoogleFonts.cinzel(fontSize: 34, fontWeight: FontWeight.w700, color: BrandPalette.cream),
      displayMedium: GoogleFonts.cinzel(fontSize: 30, fontWeight: FontWeight.w700, color: BrandPalette.cream),
      displaySmall: GoogleFonts.cinzel(fontSize: 26, fontWeight: FontWeight.w700, color: BrandPalette.cream),
      headlineLarge: GoogleFonts.cinzel(fontSize: 25, fontWeight: FontWeight.w700, color: BrandPalette.cream),
      headlineMedium: GoogleFonts.cinzel(fontSize: 22, fontWeight: FontWeight.w700, color: BrandPalette.cream),
      headlineSmall: GoogleFonts.cinzel(fontSize: 19, fontWeight: FontWeight.w700, color: BrandPalette.cream),
      titleLarge: GoogleFonts.montserrat(fontSize: 18, fontWeight: FontWeight.w700, color: BrandPalette.cream),
      bodyLarge: GoogleFonts.montserrat(fontSize: 14, color: BrandPalette.cream, height: 1.5),
      bodyMedium: GoogleFonts.montserrat(fontSize: 13, color: BrandPalette.cream, height: 1.45),
      bodySmall: GoogleFonts.montserrat(fontSize: 11, color: BrandPalette.darkMuted, height: 1.4),
    );
    return base.copyWith(
      textTheme: text,
      appBarTheme: const AppBarTheme(
        backgroundColor: BrandPalette.forestDeep,
        foregroundColor: BrandPalette.cream,
        elevation: 0,
        centerTitle: false,
        surfaceTintColor: Colors.transparent,
      ),
      cardTheme: CardThemeData(
        color: BrandPalette.darkCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: BrandPalette.darkRule),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: BrandPalette.darkCard,
        hintStyle: const TextStyle(color: BrandPalette.darkMuted),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: BrandPalette.darkRule),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: BrandPalette.darkRule),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: BrandPalette.gold, width: 1.5),
        ),
      ),
      navigationBarTheme: const NavigationBarThemeData(
        backgroundColor: BrandPalette.darkSurface,
        indicatorColor: Color(0x33C2A169),
        elevation: 0,
        labelTextStyle: WidgetStatePropertyAll(TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: BrandPalette.darkCardStrong,
        selectedColor: BrandPalette.gold.withValues(alpha: .22),
        side: const BorderSide(color: BrandPalette.darkRule),
        labelStyle: const TextStyle(color: BrandPalette.cream),
      ),
      snackBarTheme: const SnackBarThemeData(
        backgroundColor: BrandPalette.darkCardStrong,
        contentTextStyle: TextStyle(color: BrandPalette.cream),
      ),
    );
  }

  static ThemeData get light {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: BrandPalette.lightGreen,
        brightness: Brightness.light,
        primary: BrandPalette.forest,
        secondary: BrandPalette.lightGold,
        surface: BrandPalette.lightCard,
      ),
      scaffoldBackgroundColor: BrandPalette.lightPaper,
      dividerColor: BrandPalette.lightRule,
    );
    return base.copyWith(
      textTheme: GoogleFonts.montserratTextTheme(base.textTheme).copyWith(
        displaySmall: GoogleFonts.cinzel(fontSize: 26, fontWeight: FontWeight.w700, color: BrandPalette.lightInk),
        headlineSmall: GoogleFonts.cinzel(fontSize: 20, fontWeight: FontWeight.w700, color: BrandPalette.lightInk),
        titleLarge: GoogleFonts.montserrat(fontSize: 18, fontWeight: FontWeight.w700, color: BrandPalette.lightInk),
        bodyMedium: GoogleFonts.montserrat(fontSize: 13, color: BrandPalette.lightInk, height: 1.45),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: BrandPalette.lightPaper,
        foregroundColor: BrandPalette.lightInk,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      cardTheme: CardThemeData(
        color: BrandPalette.lightCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: BrandPalette.lightRule),
        ),
      ),
    );
  }
}
