import 'dart:async';
import 'dart:ui' as ui;

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'core/api/api_client.dart';
import 'core/models/catalog_snapshot.dart';
import 'core/models/notebook_snapshot.dart';
import 'core/theme/brand_theme.dart';
import 'features/gamification/podium_page.dart';
import 'features/map/catalog_map.dart';
import 'features/notebook/notebook_pages.dart';
import 'features/profile/profile_page.dart';
import 'features/stamp/stamp_link_parser.dart';
import 'features/stamp/stamp_page.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const Mais1kmApp());
}

class AppColors {
  static const forest = BrandPalette.forest;
  static const forestLight = BrandPalette.green;
  static const gold = BrandPalette.gold;
  static const cream = BrandPalette.cream;
  static const paper = BrandPalette.darkSurface;
  static const ink = BrandPalette.cream;
  static const muted = BrandPalette.darkMuted;
  static const border = BrandPalette.darkRule;
  static const danger = BrandPalette.darkDanger;
}

class Mais1kmApp extends StatefulWidget {
  const Mais1kmApp({super.key});

  @override
  State<Mais1kmApp> createState() => _Mais1kmAppState();
}

class _Mais1kmAppState extends State<Mais1kmApp> {
  late final ApiClient _api = ApiClient();

  @override
  void dispose() {
    _api.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '+1 KM',
      debugShowCheckedModeBanner: false,
      theme: Mais1kmTheme.light,
      darkTheme: Mais1kmTheme.dark,
      themeMode: ThemeMode.dark,
      home: AuthGate(api: _api),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key, required this.api});

  final ApiClient api;

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool _checking = true;
  Map<String, dynamic>? _user;
  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _appLinkSubscription;
  Uri? _pendingStampUri;
  int _stampVersion = 0;

  @override
  void initState() {
    super.initState();
    _listenForAppLinks();
    _restoreSession();
  }

  Future<void> _listenForAppLinks() async {
    _appLinkSubscription = _appLinks.uriLinkStream.listen(
      _handleIncomingUri,
      onError: (_) {},
    );
    try {
      final uri = await _appLinks.getInitialLink();
      if (uri != null) _handleIncomingUri(uri);
    } catch (_) {
      // Um link inválido ou indisponível não impede a abertura normal do app.
    }
  }

  void _handleIncomingUri(Uri uri) {
    if (!mounted || StampLinkParser.parse(uri.toString()) == null) return;
    if (_user == null) {
      _pendingStampUri = uri;
      return;
    }
    unawaited(_openStampPage(uri));
  }

  Future<void> _openStampPage(Uri? uri) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => StampPage(
          api: widget.api,
          initialUri: uri,
          onSuccess: () {
            if (mounted) setState(() => _stampVersion++);
          },
        ),
      ),
    );
  }

  void _openPendingStampAfterAuthentication() {
    final uri = _pendingStampUri;
    if (uri == null) return;
    _pendingStampUri = null;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (_user == null) {
        _pendingStampUri = uri;
        return;
      }
      unawaited(_openStampPage(uri));
    });
  }

  Future<void> _restoreSession() async {
    try {
      final response = await widget.api.currentSession();
      if (!mounted) return;
      setState(() => _user = _userFrom(response));
    } on ApiException {
      // Falha de rede não apaga uma sessão que ainda pode ser válida.
    } finally {
      if (mounted) setState(() => _checking = false);
      _openPendingStampAfterAuthentication();
    }
  }

  Map<String, dynamic> _userFrom(Map<String, dynamic> response) {
    final user = response['usuario'];
    return user is Map<String, dynamic> ? user : <String, dynamic>{};
  }

  void _onAuthenticated(Map<String, dynamic> response) {
    setState(() => _user = _userFrom(response));
    _openPendingStampAfterAuthentication();
  }

  Future<void> _logout() async {
    try {
      await widget.api.logout();
    } on ApiException {
      // A sessão local é limpa pelo cliente mesmo se a rede falhar.
    }
    if (mounted) setState(() => _user = null);
  }

  void _sessionEnded() {
    if (mounted) setState(() => _user = null);
  }

  @override
  void dispose() {
    _appLinkSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) {
      return const Scaffold(
        backgroundColor: BrandPalette.forestDeep,
        body: Center(
          child: CircularProgressIndicator(color: AppColors.forest),
        ),
      );
    }
    if (_user != null) {
      return HomeShell(
        api: widget.api,
        user: _user!,
        onLogout: _logout,
        onSessionEnded: _sessionEnded,
        stampVersion: _stampVersion,
      );
    }
    return AuthScreen(api: widget.api, onAuthenticated: _onAuthenticated);
  }
}

enum AuthMode { login, register, recovery }

class AuthScreen extends StatefulWidget {
  const AuthScreen({
    super.key,
    required this.api,
    required this.onAuthenticated,
  });

  final ApiClient api;
  final ValueChanged<Map<String, dynamic>> onAuthenticated;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  AuthMode _mode = AuthMode.login;
  bool _loading = false;
  bool _hidePassword = true;
  String? _message;
  bool _messageIsError = true;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _loading = true;
      _message = null;
    });

    try {
      if (_mode == AuthMode.recovery) {
        await widget.api.requestPasswordRecovery(_email.text);
        setState(() {
          _message =
              'Se o e-mail estiver cadastrado, você receberá as instruções para redefinir a senha.';
          _messageIsError = false;
        });
        return;
      }

      final response = _mode == AuthMode.login
          ? await widget.api.login(
              email: _email.text,
              password: _password.text,
            )
          : await widget.api.register(
              name: _name.text,
              email: _email.text,
              password: _password.text,
            );
      widget.onAuthenticated(response);
    } on ApiException catch (error) {
      setState(() {
        _message = error.message;
        _messageIsError = true;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _setMode(AuthMode mode) {
    setState(() {
      _mode = mode;
      _message = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isLogin = _mode == AuthMode.login;
    final isRegister = _mode == AuthMode.register;
    final isRecovery = _mode == AuthMode.recovery;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const _BrandHeader(),
                    const SizedBox(height: 34),
                    Text(
                      isRecovery
                          ? 'Recuperar acesso'
                          : isRegister
                              ? 'Crie sua conta'
                              : 'Bem-vindo de volta',
                      style: const TextStyle(
                        color: AppColors.ink,
                        fontSize: 25,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 7),
                    Text(
                      isRecovery
                          ? 'Vamos enviar as instruções para seu e-mail.'
                          : isRegister
                              ? 'Sua próxima descoberta começa aqui.'
                              : 'Entre para continuar sua jornada pelo +1 KM.',
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 14,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 24),
                    if (isRegister) ...[
                      const _FieldLabel('Nome'),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _name,
                        textCapitalization: TextCapitalization.words,
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.name],
                        decoration: const InputDecoration(
                          hintText: 'Como podemos chamar você?',
                          prefixIcon: Icon(Icons.person_outline),
                        ),
                        validator: (value) =>
                            value == null || value.trim().length < 2
                                ? 'Informe seu nome.'
                                : null,
                      ),
                      const SizedBox(height: 17),
                    ],
                    const _FieldLabel('E-mail'),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction:
                          isRecovery ? TextInputAction.done : TextInputAction.next,
                      autofillHints: const [AutofillHints.email],
                      autocorrect: false,
                      decoration: const InputDecoration(
                        hintText: 'seuemail@exemplo.com',
                        prefixIcon: Icon(Icons.mail_outline),
                      ),
                      validator: (value) {
                        final email = value?.trim() ?? '';
                        return RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
                                .hasMatch(email)
                            ? null
                            : 'Informe um e-mail válido.';
                      },
                    ),
                    if (!isRecovery) ...[
                      const SizedBox(height: 17),
                      const _FieldLabel('Senha'),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _password,
                        obscureText: _hidePassword,
                        textInputAction: TextInputAction.done,
                        autofillHints: isLogin
                            ? const [AutofillHints.password]
                            : const [AutofillHints.newPassword],
                        onFieldSubmitted: (_) => _submit(),
                        decoration: InputDecoration(
                          hintText: isRegister
                              ? 'Crie uma senha segura'
                              : 'Digite sua senha',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            tooltip:
                                _hidePassword ? 'Mostrar senha' : 'Ocultar senha',
                            onPressed: () =>
                                setState(() => _hidePassword = !_hidePassword),
                            icon: Icon(
                              _hidePassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                            ),
                          ),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Informe sua senha.';
                          }
                          if (isRegister && value.length < 8) {
                            return 'Use pelo menos 8 caracteres.';
                          }
                          return null;
                        },
                      ),
                    ],
                    if (isLogin) ...[
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: () => _setMode(AuthMode.recovery),
                          child: const Text('Esqueci minha senha'),
                        ),
                      ),
                    ],
                    if (_message != null) ...[
                      const SizedBox(height: 14),
                      _MessageBanner(
                        message: _message!,
                        isError: _messageIsError,
                      ),
                    ],
                    const SizedBox(height: 22),
                    FilledButton(
                      onPressed: _loading ? null : _submit,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.gold,
                        foregroundColor: BrandPalette.forestDeep,
                        minimumSize: const Size.fromHeight(54),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: _loading
                          ? const SizedBox(
                              height: 21,
                              width: 21,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : Text(
                              isRecovery
                                  ? 'Enviar instruções'
                                  : isRegister
                                      ? 'Criar conta'
                                      : 'Entrar',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                    ),
                    const SizedBox(height: 18),
                    if (isRecovery)
                      TextButton(
                        onPressed: () => _setMode(AuthMode.login),
                        child: const Text('Voltar para entrar'),
                      )
                    else
                      Wrap(
                        alignment: WrapAlignment.center,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(
                            isLogin ? 'Ainda não tem conta?' : 'Já tem uma conta?',
                            style: const TextStyle(color: AppColors.muted),
                          ),
                          TextButton(
                            onPressed: () => _setMode(
                              isLogin ? AuthMode.register : AuthMode.login,
                            ),
                            child: Text(isLogin ? 'Cadastre-se' : 'Entrar'),
                          ),
                        ],
                      ),
                    const SizedBox(height: 24),
                    const Text(
                      'Sua conta é a mesma usada no site Mais1km.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: AppColors.muted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class HomeShell extends StatefulWidget {
  const HomeShell({
    super.key,
    required this.api,
    required this.user,
    required this.onLogout,
    required this.onSessionEnded,
    required this.stampVersion,
  });

  final ApiClient api;
  final Map<String, dynamic> user;
  final Future<void> Function() onLogout;
  final VoidCallback onSessionEnded;
  final int stampVersion;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  CatalogSnapshot? _catalog;
  NotebookSnapshot? _notebook;
  Map<String, dynamic>? _gamificationData;
  Map<String, dynamic>? _podiumData;
  late Map<String, dynamic> _accountUser = widget.user;
  bool _loadingCatalog = true;
  bool _loadingNotebook = true;
  bool _loadingPodium = true;
  String? _catalogError;
  String? _notebookError;
  String? _podiumError;
  String _search = '';
  String? _category;
  String _stampFilter = 'Todos';
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    _loadCatalog();
    _loadNotebook();
    _loadPodium();
  }

  @override
  void didUpdateWidget(covariant HomeShell oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.stampVersion != widget.stampVersion) _loadNotebook();
  }

  Future<void> _loadCatalog() async {
    setState(() {
      _loadingCatalog = true;
      _catalogError = null;
    });
    try {
      final catalog = await widget.api.fetchCatalog();
      if (mounted) setState(() => _catalog = catalog);
    } on ApiException catch (error) {
      if (mounted) setState(() => _catalogError = error.message);
    } finally {
      if (mounted) setState(() => _loadingCatalog = false);
    }
  }

  Future<void> _loadNotebook() async {
    setState(() {
      _loadingNotebook = true;
      _notebookError = null;
    });
    try {
      final notebook = await widget.api.fetchNotebook();
      if (mounted) setState(() => _notebook = notebook);
    } on ApiException catch (error) {
      if (mounted) setState(() => _notebookError = error.message);
    } finally {
      if (mounted) setState(() => _loadingNotebook = false);
    }
  }

  Future<void> _loadPodium() async {
    setState(() {
      _loadingPodium = true;
      _podiumError = null;
    });
    try {
      final results = await Future.wait([
        widget.api.fetchGamificationMe(),
        widget.api.fetchGamificationPodium(limit: 25),
      ]);
      if (!mounted) return;
      setState(() {
        _gamificationData = results[0];
        _podiumData = results[1];
      });
    } on ApiException catch (error) {
      if (mounted) setState(() => _podiumError = error.message);
    } finally {
      if (mounted) setState(() => _loadingPodium = false);
    }
  }

  Future<void> _refresh() async {
    await Future.wait([_loadCatalog(), _loadNotebook(), _loadPodium()]);
  }

  Future<void> _openStamp() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => StampPage(
          api: widget.api,
          onSuccess: () {
            unawaited(_loadNotebook());
          },
        ),
      ),
    );
  }

  Future<void> _openProfile() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => ProfilePage(
          user: _accountUser,
          onSaveAccount: ({
            required String nome,
            required String email,
            required String senhaAtual,
            required String senhaNova,
          }) async {
            final result = await widget.api.updateAccount(
              name: nome,
              email: email,
              currentPassword: senhaAtual.isEmpty ? null : senhaAtual,
              newPassword: senhaNova.isEmpty ? null : senhaNova,
            );
            final updated = result['usuario'];
            if (mounted && updated is Map<String, dynamic>) {
              setState(() => _accountUser = updated);
            }
          },
          onDeleteAccount: () async {
            await widget.api.deleteAccount();
            widget.onSessionEnded();
          },
          onLogout: widget.onLogout,
        ),
      ),
    );
  }

  Set<String> get _completedPointCodes => _notebook?.routes
          .expand((route) => route.points)
          .where((point) => point.completed)
          .map((point) => point.code.toLowerCase())
          .toSet() ??
      <String>{};

  List<CatalogPoint> get _visiblePoints {
    final points = _catalog?.points ?? const <CatalogPoint>[];
    return points.where((point) {
      final query = _search.toLowerCase();
      final matchesSearch = query.isEmpty ||
          point.name.toLowerCase().contains(query) ||
          point.code.toLowerCase().contains(query) ||
          point.address?.toLowerCase().contains(query) == true;
      final matchesCategory =
          _category == null || point.categories.contains(_category);
      final completed = _completedPointCodes.contains(point.code.toLowerCase());
      final matchesStamp = _stampFilter == 'Todos' ||
          (_stampFilter == 'Carimbados' && completed) ||
          (_stampFilter == 'Disponíveis' && !completed);
      return matchesSearch && matchesCategory && matchesStamp;
    }).toList();
  }

  List<String> get _categories {
    final values = _catalog?.points.expand((point) => point.categories) ??
        const Iterable<String>.empty();
    return values.toSet().toList()..sort();
  }

  void _showPoint(CatalogPoint point) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.paper,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(22, 16, 22, 28),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.border,
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
                const SizedBox(height: 22),
                Text(point.name,
                    style: const TextStyle(
                        color: AppColors.ink,
                        fontSize: 22,
                        fontWeight: FontWeight.w800)),
                if (point.address?.isNotEmpty == true) ...[
                  const SizedBox(height: 10),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.place_outlined,
                          color: AppColors.forest, size: 19),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(point.address!,
                            style: const TextStyle(color: AppColors.muted)),
                      ),
                    ],
                  ),
                ],
                if (point.note?.isNotEmpty == true) ...[
                  const SizedBox(height: 16),
                  Text(point.note!,
                      style: const TextStyle(
                          color: AppColors.ink, height: 1.5)),
                ],
                if (point.categories.isNotEmpty) ...[
                  const SizedBox(height: 18),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: point.categories
                        .map((item) => Chip(
                              label: Text(item),
                              backgroundColor: AppColors.paper,
                              side: const BorderSide(color: AppColors.border),
                            ))
                        .toList(),
                  ),
                ],
                const SizedBox(height: 14),
                Text('Código do ponto: ${point.code}',
                    style: const TextStyle(
                        color: AppColors.muted, fontSize: 12)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showPointByCode(String code) {
    final normalized = code.toLowerCase();
    CatalogPoint? point;
    for (final candidate in _catalog?.points ?? const <CatalogPoint>[]) {
      if (candidate.code.toLowerCase() == normalized) {
        point = candidate;
        break;
      }
    }
    if (point != null) {
      _showPoint(point);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Os detalhes deste ponto não estão no catálogo carregado.')),
      );
    }
  }

  Widget _buildExplorer() {
    final points = _visiblePoints;
    final mapped = points.where((point) =>
      point.latitude != null && point.longitude != null).length;

    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 2, 4, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('MAPA DE DESCOBERTAS',
                    style: GoogleFonts.montserrat(
                      color: AppColors.gold,
                      fontSize: 10,
                      letterSpacing: 2,
                      fontWeight: FontWeight.w800,
                    )),
                const SizedBox(height: 4),
                Text('Eunápolis',
                    style: GoogleFonts.cinzel(
                      color: AppColors.ink,
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                    )),
                const SizedBox(height: 4),
                const Text('Encontre os lugares e escolha sua próxima descoberta.',
                    style: TextStyle(color: AppColors.muted, fontSize: 11)),
              ],
            ),
          ),
          TextField(
            onChanged: (value) => setState(() => _search = value.trim()),
            decoration: const InputDecoration(
              hintText: 'Buscar ponto ou código',
              prefixIcon: Icon(Icons.search),
              isDense: true,
              contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            ),
          ),
          if (_categories.isNotEmpty) ...[
            const SizedBox(height: 9),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  ChoiceChip(
                    label: const Text('Todas'),
                    selected: _category == null,
                    onSelected: (_) => setState(() => _category = null),
                  ),
                  const SizedBox(width: 6),
                  ..._categories.map((category) => Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: ChoiceChip(
                      label: Text(category),
                      selected: _category == category,
                      onSelected: (_) => setState(() =>
                        _category = _category == category ? null : category),
                    ),
                  )),
                ],
              ),
            ),
          ],
          if (_notebook != null) ...[
            const SizedBox(height: 7),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final filter in const ['Todos', 'Disponíveis', 'Carimbados'])
                    Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ChoiceChip(
                        label: Text(filter),
                        selected: _stampFilter == filter,
                        onSelected: (_) => setState(() => _stampFilter = filter),
                      ),
                    ),
                ],
              ),
            ),
          ],
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 8, 4, 9),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    '${points.length} ${points.length == 1 ? 'ponto' : 'pontos'} encontrados',
                    style: const TextStyle(color: AppColors.muted, fontSize: 10),
                  ),
                ),
                Text('$mapped no mapa',
                    style: const TextStyle(color: AppColors.gold, fontSize: 10, fontWeight: FontWeight.w700)),
                if (_search.isNotEmpty || _category != null || _stampFilter != 'Todos')
                  TextButton(
                    onPressed: () => setState(() {
                      _search = '';
                      _category = null;
                      _stampFilter = 'Todos';
                    }),
                    child: const Text('Limpar'),
                  ),
              ],
            ),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.paper,
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: _loadingCatalog
                    ? const Center(child: CircularProgressIndicator(color: AppColors.gold))
                    : _catalogError != null
                        ? _CatalogNotice(message: _catalogError!, onRetry: _loadCatalog)
                        : CatalogMap(
                            points: points,
                            onSelectPoint: _showPoint,
                          ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final titles = ['Início', 'Mapa', 'Rotas', 'Coleção', 'Pódio'];
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.paper,
        foregroundColor: AppColors.ink,
        title: Text(
          _tab == 0 ? '+1 KM' : titles[_tab],
          style: GoogleFonts.yellowtail(color: AppColors.gold, fontSize: 24),
        ),
        actions: [
          IconButton(
            tooltip: 'Atualizar dados',
            onPressed: _refresh,
            icon: const Icon(Icons.refresh),
          ),
          IconButton(
            tooltip: 'Conquistar carimbo',
            onPressed: _openStamp,
            icon: const Icon(Icons.nfc),
          ),
          IconButton(
            tooltip: 'Meu perfil',
            onPressed: _openProfile,
            icon: const Icon(Icons.account_circle_outlined),
          ),
        ],
      ),
      body: _tab == 1
          ? _buildExplorer()
          : _tab == 4
              ? PodiumPage(
                  podiumData: _podiumData,
                  gamificationData: _gamificationData,
                  loading: _loadingPodium,
                  error: _podiumError,
                  onRefresh: _loadPodium,
                  onSaveParticipation: ({
                    required bool optIn,
                    required String alias,
                  }) async {
                    await widget.api.updateGamificationParticipation(
                      optIn: optIn,
                      alias: alias.isEmpty ? null : alias,
                    );
                    await _loadPodium();
                  },
                )
              : NotebookPages(
              page: _tab,
              snapshot: _notebook,
              user: widget.user,
              loading: _loadingNotebook,
              error: _notebookError,
              onRetry: _loadNotebook,
              onOpenMap: () => setState(() => _tab = 1),
              onOpenCollection: () => setState(() => _tab = 3),
              onOpenPoint: _showPointByCode,
            ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          margin: const EdgeInsets.fromLTRB(10, 0, 10, 10),
          decoration: BoxDecoration(
            color: AppColors.paper.withValues(alpha: .88),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.border),
            boxShadow: const [
              BoxShadow(color: Color(0x66000000), blurRadius: 24, offset: Offset(0, 9)),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: BackdropFilter(
              filter: ui.ImageFilter.blur(sigmaX: 16, sigmaY: 16),
              child: NavigationBar(
                height: 68,
                selectedIndex: _tab,
                onDestinationSelected: (index) => setState(() => _tab = index),
                backgroundColor: Colors.transparent,
                indicatorColor: AppColors.gold.withValues(alpha: .22),
                destinations: const [
                  NavigationDestination(
                      icon: Icon(Icons.home_outlined),
                      selectedIcon: Icon(Icons.home),
                      label: 'Início'),
                  NavigationDestination(
                      icon: Icon(Icons.map_outlined),
                      selectedIcon: Icon(Icons.map),
                      label: 'Mapa'),
                  NavigationDestination(
                      icon: Icon(Icons.route_outlined),
                      selectedIcon: Icon(Icons.route),
                      label: 'Rotas'),
                  NavigationDestination(
                      icon: Icon(Icons.collections_bookmark_outlined),
                      selectedIcon: Icon(Icons.collections_bookmark),
                      label: 'Coleção'),
                  NavigationDestination(
                      icon: Icon(Icons.emoji_events_outlined),
                      selectedIcon: Icon(Icons.emoji_events),
                      label: 'Pódio'),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CatalogNotice extends StatelessWidget {
  const _CatalogNotice({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.paper,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.muted),
          ),
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Tentar novamente'),
          ),
        ],
      ),
    );
  }
}

class _BrandHeader extends StatelessWidget {
  const _BrandHeader();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          height: 76,
          width: 76,
          decoration: BoxDecoration(
            color: AppColors.forest,
            borderRadius: BorderRadius.circular(23),
            boxShadow: const [
              BoxShadow(
                color: Color(0x22173D2E),
                blurRadius: 18,
                offset: Offset(0, 8),
              ),
            ],
          ),
          child: const Center(
            child: Text(
              '+1',
              style: TextStyle(
                color: AppColors.gold,
                fontSize: 34,
                fontWeight: FontWeight.w900,
                letterSpacing: -2,
              ),
            ),
          ),
        ),
        const SizedBox(height: 13),
        const Text(
          'MAIS1KM',
          style: TextStyle(
            color: AppColors.forest,
            fontSize: 17,
            fontWeight: FontWeight.w900,
            letterSpacing: 3,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'CADA CAMINHO CONTA UMA HISTÓRIA',
          style: TextStyle(
            color: AppColors.muted,
            fontSize: 9,
            letterSpacing: 1.25,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) => Text(
        label,
        style: const TextStyle(
          color: AppColors.ink,
          fontWeight: FontWeight.w700,
          fontSize: 13,
        ),
      );
}

class _MessageBanner extends StatelessWidget {
  const _MessageBanner({
    required this.message,
    required this.isError,
  });

  final String message;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    final color = isError ? AppColors.danger : AppColors.forestLight;
    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Text(
        message,
        style: TextStyle(color: color, fontSize: 13, height: 1.4),
      ),
    );
  }
}
