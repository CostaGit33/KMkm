import 'package:flutter/material.dart';

import 'core/api/api_client.dart';
import 'core/models/catalog_snapshot.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const Mais1kmApp());
}

class AppColors {
  static const forest = Color(0xFF173D2E);
  static const forestLight = Color(0xFF285541);
  static const gold = Color(0xFFC7A45D);
  static const cream = Color(0xFFF5F1E7);
  static const paper = Color(0xFFFFFDF8);
  static const ink = Color(0xFF202820);
  static const muted = Color(0xFF6F786F);
  static const border = Color(0xFFE3DED1);
  static const danger = Color(0xFFB5473C);
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
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: AppColors.cream,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.forest,
          primary: AppColors.forest,
          secondary: AppColors.gold,
          surface: AppColors.paper,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.paper,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 17,
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.forest, width: 1.5),
          ),
        ),
      ),
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

  @override
  void initState() {
    super.initState();
    _restoreSession();
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
    }
  }

  Map<String, dynamic> _userFrom(Map<String, dynamic> response) {
    final user = response['usuario'];
    return user is Map<String, dynamic> ? user : <String, dynamic>{};
  }

  void _onAuthenticated(Map<String, dynamic> response) {
    setState(() => _user = _userFrom(response));
  }

  Future<void> _logout() async {
    try {
      await widget.api.logout();
    } on ApiException {
      // A sessão local é limpa pelo cliente mesmo se a rede falhar.
    }
    if (mounted) setState(() => _user = null);
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) {
      return const Scaffold(
        backgroundColor: AppColors.cream,
        body: Center(
          child: CircularProgressIndicator(color: AppColors.forest),
        ),
      );
    }
    if (_user != null) {
      return HomeShell(api: widget.api, user: _user!, onLogout: _logout);
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
                        backgroundColor: AppColors.forest,
                        foregroundColor: Colors.white,
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
  });

  final ApiClient api;
  final Map<String, dynamic> user;
  final VoidCallback onLogout;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  CatalogSnapshot? _catalog;
  bool _loadingCatalog = true;
  String? _catalogError;
  String _search = '';
  String? _category;

  @override
  void initState() {
    super.initState();
    _loadCatalog();
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

  List<CatalogPoint> get _visiblePoints {
    final points = _catalog?.points ?? const <CatalogPoint>[];
    return points.where((point) {
      final matchesSearch = _search.isEmpty ||
          point.name.toLowerCase().contains(_search.toLowerCase()) ||
          point.code.toLowerCase().contains(_search.toLowerCase()) ||
          point.address?.toLowerCase().contains(_search.toLowerCase()) == true;
      final matchesCategory =
          _category == null || point.categories.contains(_category);
      return matchesSearch && matchesCategory;
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
              Text(
                point.name,
                style: const TextStyle(
                  color: AppColors.ink,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
              if (point.address?.isNotEmpty == true) ...[
                const SizedBox(height: 10),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.place_outlined,
                        color: AppColors.forest, size: 19),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        point.address!,
                        style: const TextStyle(color: AppColors.muted),
                      ),
                    ),
                  ],
                ),
              ],
              if (point.note?.isNotEmpty == true) ...[
                const SizedBox(height: 16),
                Text(
                  point.note!,
                  style: const TextStyle(
                    color: AppColors.ink,
                    height: 1.5,
                  ),
                ),
              ],
              if (point.categories.isNotEmpty) ...[
                const SizedBox(height: 18),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: point.categories
                      .map((item) => Chip(
                            label: Text(item),
                            backgroundColor: AppColors.cream,
                            side: BorderSide.none,
                          ))
                      .toList(),
                ),
              ],
              const SizedBox(height: 14),
              Text(
                'Código do ponto: ${point.code}',
                style: const TextStyle(
                  color: AppColors.muted,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final name = widget.user['nome']?.toString().trim();
    final points = _visiblePoints;
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.forest,
        foregroundColor: Colors.white,
        title: const Text(
          '+1 KM',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            tooltip: 'Sair',
            onPressed: widget.onLogout,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.forest,
        onRefresh: _loadCatalog,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                color: AppColors.forest,
                borderRadius: BorderRadius.circular(22),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'SUA PRÓXIMA DESCOBERTA',
                    style: TextStyle(
                      color: AppColors.gold,
                      fontSize: 11,
                      letterSpacing: 1.4,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    name == null || name.isEmpty ? 'Bem-vindo!' : 'Olá, $name!',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 25,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Explore lugares, conheça histórias e registre suas descobertas.',
                    style: TextStyle(
                      color: Color(0xFFE6E9E2),
                      height: 1.45,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Pontos para descobrir',
                    style: TextStyle(
                      color: AppColors.ink,
                      fontSize: 19,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                if (!_loadingCatalog && _catalog != null)
                  Text(
                    '${_catalog!.points.length}',
                    style: const TextStyle(
                      color: AppColors.forest,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              onChanged: (value) => setState(() => _search = value.trim()),
              decoration: const InputDecoration(
                hintText: 'Buscar ponto ou endereço',
                prefixIcon: Icon(Icons.search),
                isDense: true,
              ),
            ),
            if (_categories.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 7,
                runSpacing: 4,
                children: [
                  ChoiceChip(
                    label: const Text('Todos'),
                    selected: _category == null,
                    onSelected: (_) => setState(() => _category = null),
                  ),
                  ..._categories.map(
                    (category) => ChoiceChip(
                      label: Text(category),
                      selected: _category == category,
                      onSelected: (_) => setState(
                        () => _category =
                            _category == category ? null : category,
                      ),
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 14),
            if (_loadingCatalog)
              const Padding(
                padding: EdgeInsets.all(28),
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.forest),
                ),
              )
            else if (_catalogError != null)
              _CatalogNotice(
                message: _catalogError!,
                onRetry: _loadCatalog,
              )
            else if (points.isEmpty)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'Nenhum ponto publicado corresponde à busca.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.muted),
                ),
              )
            else
              ...points.map(
                (point) => Card(
                  color: AppColors.paper,
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(15),
                    side: const BorderSide(color: AppColors.border),
                  ),
                  child: ListTile(
                    onTap: () => _showPoint(point),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 15,
                      vertical: 7,
                    ),
                    leading: Container(
                      height: 44,
                      width: 44,
                      decoration: BoxDecoration(
                        color: AppColors.cream,
                        borderRadius: BorderRadius.circular(13),
                      ),
                      child: const Icon(
                        Icons.place_outlined,
                        color: AppColors.forest,
                      ),
                    ),
                    title: Text(
                      point.name,
                      style: const TextStyle(
                        color: AppColors.ink,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    subtitle: Text(
                      point.categories.isEmpty
                          ? (point.address ?? point.code)
                          : point.categories.join(' · '),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 12,
                      ),
                    ),
                    trailing: const Icon(
                      Icons.chevron_right,
                      color: AppColors.muted,
                    ),
                  ),
                ),
              ),
            if (_catalog?.circuits.isNotEmpty == true) ...[
              const SizedBox(height: 18),
              const Text(
                'Circuitos',
                style: TextStyle(
                  color: AppColors.ink,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 10),
              ..._catalog!.circuits.map(
                (circuit) => Card(
                  color: AppColors.paper,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(15),
                    side: const BorderSide(color: AppColors.border),
                  ),
                  child: ListTile(
                    leading: const Icon(
                      Icons.route_outlined,
                      color: AppColors.forest,
                    ),
                    title: Text(
                      circuit.name,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text(
                      circuit.subtitle ??
                          '${circuit.pointCodes.length} pontos',
                    ),
                  ),
                ),
              ),
            ],
          ],
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

class _HomeFeature extends StatelessWidget {
  const _HomeFeature({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppColors.paper,
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.border),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 17,
          vertical: 8,
        ),
        leading: Container(
          height: 46,
          width: 46,
          decoration: BoxDecoration(
            color: AppColors.cream,
            borderRadius: BorderRadius.circular(13),
          ),
          child: Icon(icon, color: AppColors.forest),
        ),
        title: Text(
          title,
          style: const TextStyle(
            color: AppColors.ink,
            fontWeight: FontWeight.w700,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: const TextStyle(color: AppColors.muted, fontSize: 12),
        ),
        trailing: const Icon(
          Icons.arrow_forward_ios_rounded,
          size: 15,
          color: AppColors.muted,
        ),
      ),
    );
  }
}
