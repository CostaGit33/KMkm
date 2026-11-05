import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/brand_theme.dart';

class PasswordResetPage extends StatefulWidget {
  const PasswordResetPage({
    super.key,
    required this.api,
    required this.token,
    required this.onSuccess,
  });

  final ApiClient api;
  final String token;
  final VoidCallback onSuccess;

  @override
  State<PasswordResetPage> createState() => _PasswordResetPageState();
}

class _PasswordResetPageState extends State<PasswordResetPage> {
  final _formKey = GlobalKey<FormState>();
  final _password = TextEditingController();
  final _confirmation = TextEditingController();
  bool _hidePassword = true;
  bool _submitting = false;
  bool _completed = false;
  String? _message;

  @override
  void dispose() {
    _password.dispose();
    _confirmation.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_submitting || !_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _submitting = true;
      _message = null;
    });

    try {
      await widget.api.resetPassword(
        token: widget.token,
        password: _password.text,
      );
      if (!mounted) return;
      setState(() {
        _completed = true;
        _password.clear();
        _confirmation.clear();
        _message = 'Senha redefinida. Entre com sua nova senha.';
      });
      widget.onSuccess();
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() => _message = error.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Recuperar acesso'),
        backgroundColor: Colors.transparent,
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(22),
                  child: _completed ? _successContent() : _formContent(),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _formContent() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Icon(Icons.lock_reset, size: 42, color: BrandPalette.gold),
          const SizedBox(height: 16),
          Text(
            'Crie uma nova senha',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          const Text(
            'Escolha uma senha de 8 a 128 caracteres. O link é de uso único e expira em 30 minutos.',
          ),
          const SizedBox(height: 22),
          TextFormField(
            controller: _password,
            obscureText: _hidePassword,
            autofillHints: const [AutofillHints.newPassword],
            textInputAction: TextInputAction.next,
            decoration: InputDecoration(
              labelText: 'Nova senha',
              suffixIcon: IconButton(
                tooltip: _hidePassword ? 'Mostrar senha' : 'Ocultar senha',
                onPressed: () => setState(() => _hidePassword = !_hidePassword),
                icon: Icon(_hidePassword
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined),
              ),
            ),
            validator: (value) {
              final password = value ?? '';
              if (password.length < 8 || password.length > 128) {
                return 'Use de 8 a 128 caracteres.';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _confirmation,
            obscureText: _hidePassword,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _submit(),
            decoration: const InputDecoration(labelText: 'Confirme a nova senha'),
            validator: (value) => value != _password.text
                ? 'As senhas não coincidem.'
                : null,
          ),
          if (_message != null) ...[
            const SizedBox(height: 16),
            Text(_message!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 22),
          FilledButton(
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Salvar nova senha'),
          ),
        ],
      ),
    );
  }

  Widget _successContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Icon(Icons.check_circle_outline, size: 48, color: BrandPalette.gold),
        const SizedBox(height: 16),
        Text('Senha atualizada', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 8),
        Text(_message ?? 'Senha redefinida. Entre com sua nova senha.'),
        const SizedBox(height: 22),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Voltar para entrar'),
        ),
      ],
    );
  }
}
