import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/brand_theme.dart';

class PasswordResetPage extends StatefulWidget {
  const PasswordResetPage({
    super.key,
    required this.api,
    required this.token,
    required this.onCompleted,
  });

  final ApiClient api;
  final String token;
  final VoidCallback onCompleted;

  @override
  State<PasswordResetPage> createState() => _PasswordResetPageState();
}

class _PasswordResetPageState extends State<PasswordResetPage> {
  final _formKey = GlobalKey<FormState>();
  final _password = TextEditingController();
  final _confirmation = TextEditingController();
  bool _loading = false;
  bool _completed = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _password.dispose();
    _confirmation.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_password.text != _confirmation.text) {
      setState(() => _error = 'As senhas não coincidem.');
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await widget.api.resetPassword(
        token: widget.token,
        password: _password.text,
      );
      if (!mounted) return;
      setState(() => _completed = true);
      // A API revoga todas as sessões da conta após redefinir a senha.
      widget.onCompleted();
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BrandPalette.forestDeep,
      appBar: AppBar(
        title: const Text('Redefinir senha'),
        backgroundColor: BrandPalette.forestDeep,
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: _completed ? _success() : _form(),
            ),
          ),
        ),
      ),
    );
  }

  Widget _form() => Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.lock_reset, color: BrandPalette.gold, size: 48),
            const SizedBox(height: 18),
            const Text(
              'Crie uma nova senha',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: BrandPalette.cream,
                fontSize: 23,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Use pelo menos 8 caracteres. O link é individual, expira em 30 minutos e só pode ser usado uma vez.',
              textAlign: TextAlign.center,
              style: TextStyle(color: BrandPalette.darkMuted, height: 1.5),
            ),
            const SizedBox(height: 26),
            TextFormField(
              controller: _password,
              obscureText: _obscure,
              maxLength: 128,
              autofillHints: const [AutofillHints.newPassword],
              decoration: InputDecoration(
                labelText: 'Nova senha',
                suffixIcon: IconButton(
                  tooltip: _obscure ? 'Mostrar senha' : 'Ocultar senha',
                  onPressed: () => setState(() => _obscure = !_obscure),
                  icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off),
                ),
              ),
              validator: (value) {
                final password = value ?? '';
                if (password.length < 8) return 'Use pelo menos 8 caracteres.';
                if (password.length > 128) return 'A senha pode ter até 128 caracteres.';
                return null;
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _confirmation,
              obscureText: _obscure,
              maxLength: 128,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _submit(),
              decoration: const InputDecoration(labelText: 'Confirme a nova senha'),
              validator: (value) => (value ?? '').isEmpty
                  ? 'Confirme sua nova senha.'
                  : null,
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, role: null, style: const TextStyle(color: BrandPalette.darkDanger)),
            ],
            const SizedBox(height: 18),
            FilledButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Salvar nova senha'),
            ),
          ],
        ),
      );

  Widget _success() => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Icon(Icons.check_circle_outline, color: BrandPalette.gold, size: 54),
          const SizedBox(height: 18),
          const Text(
            'Senha redefinida',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: BrandPalette.cream,
              fontSize: 23,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'Todas as sessões anteriores foram encerradas. Entre novamente com sua nova senha.',
            textAlign: TextAlign.center,
            style: TextStyle(color: BrandPalette.darkMuted, height: 1.5),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Ir para login'),
          ),
        ],
      );
}
