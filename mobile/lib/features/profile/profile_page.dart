import 'package:flutter/material.dart';

import '../../core/theme/brand_theme.dart';

typedef ProfileSaveCallback = Future<void> Function({
  required String nome,
  required String email,
  required String senhaAtual,
  required String senhaNova,
});
typedef ProfileActionCallback = Future<void> Function();

/// Formulário independente de perfil. Não realiza chamadas de rede.
///
/// O callback de gravação recebe todos os campos já normalizados. Senhas vazias
/// significam que a pessoa não solicitou troca de senha.
class ProfilePage extends StatefulWidget {
  const ProfilePage({
    super.key,
    required this.user,
    required this.onSaveAccount,
    required this.onDeleteAccount,
    required this.onLogout,
  });

  final Map<String, dynamic> user;
  final ProfileSaveCallback onSaveAccount;
  final ProfileActionCallback onDeleteAccount;
  final ProfileActionCallback onLogout;

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _emailController;
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  late String _originalName;
  late String _originalEmail;
  bool _busy = false;
  String? _message;
  bool _messageIsError = false;

  @override
  void initState() {
    super.initState();
    _originalName = (widget.user['nome'] ?? widget.user['name'] ?? '').toString();
    _originalEmail = (widget.user['email'] ?? '').toString();
    _nameController = TextEditingController(text: _originalName);
    _emailController = TextEditingController(text: _originalEmail);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    super.dispose();
  }

  String get _name => _nameController.text.trim();
  String get _email => _emailController.text.trim();
  String get _currentPassword => _currentPasswordController.text;
  String get _newPassword => _newPasswordController.text;
  bool get _emailChanged => _email.toLowerCase() != _originalEmail.trim().toLowerCase();

  Future<void> _save() async {
    if (_busy || !_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      await widget.onSaveAccount(
        nome: _name,
        email: _email,
        senhaAtual: _currentPassword,
        senhaNova: _newPassword,
      );
      if (!mounted) return;
      setState(() {
        _originalName = _name;
        _originalEmail = _email;
        _currentPasswordController.clear();
        _newPasswordController.clear();
        _message = 'Dados da conta salvos com sucesso.';
        _messageIsError = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _message = _errorText(error, 'Não foi possível salvar os dados da conta.');
        _messageIsError = true;
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete() async {
    if (_busy) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: BrandPalette.darkCardStrong,
        title: const Text('Excluir conta?'),
        content: const Text(
          'Essa ação é permanente e pode remover seus dados e progresso. '
          'Confirme somente se realmente deseja solicitar a exclusão.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: BrandPalette.darkDanger,
              foregroundColor: BrandPalette.forestDeep,
            ),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Confirmar exclusão'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    await _runAction(
      widget.onDeleteAccount,
      success: 'A solicitação de exclusão foi concluída.',
      failure: 'Não foi possível concluir a exclusão da conta.',
    );
  }

  Future<void> _logout() async {
    if (_busy) return;
    await _runAction(
      widget.onLogout,
      success: 'Você saiu da sua conta.',
      failure: 'Não foi possível sair da conta.',
    );
  }

  Future<void> _runAction(
    ProfileActionCallback action, {
    required String success,
    required String failure,
  }) async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      await action();
      if (!mounted) return;
      setState(() {
        _message = success;
        _messageIsError = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _message = _errorText(error, failure);
        _messageIsError = true;
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String? _validateName(String? value) {
    final name = value?.trim() ?? '';
    if (name.length < 2) return 'Informe um nome com pelo menos 2 caracteres.';
    if (name.length > 36) return 'Use no máximo 36 caracteres.';
    return null;
  }

  String? _validateEmail(String? value) {
    final email = value?.trim() ?? '';
    return RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email)
        ? null
        : 'Informe um e-mail válido.';
  }

  String? _validateCurrentPassword(String? value) {
    final current = value ?? '';
    if ((_emailChanged || _newPassword.isNotEmpty) && current.isEmpty) {
      return 'Informe a senha atual para confirmar a alteração.';
    }
    if (current.isNotEmpty && !_emailChanged && _newPassword.isEmpty) {
      return 'Informe a nova senha ou deixe a senha atual em branco.';
    }
    return null;
  }

  String? _validateNewPassword(String? value) {
    final password = value ?? '';
    if (password.isEmpty) return null;
    if (password.length < 8) return 'Use pelo menos 8 caracteres.';
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final displayName = _nameController.text.trim().isEmpty
        ? 'Sua conta'
        : _nameController.text.trim();
    final initial = displayName.substring(0, 1).toUpperCase();
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 20, 18, 32),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: BrandPalette.darkCardStrong,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: BrandPalette.darkRule),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: BrandPalette.gold,
                foregroundColor: BrandPalette.forestDeep,
                child: Text(initial, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 22)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(displayName, style: const TextStyle(color: BrandPalette.cream, fontSize: 18, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 3),
                    Text(_emailController.text, style: const TextStyle(color: BrandPalette.darkMuted)),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        const _SectionTitle('Dados da conta'),
        const SizedBox(height: 10),
        Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _nameController,
                enabled: !_busy,
                textCapitalization: TextCapitalization.words,
                maxLength: 36,
                autofillHints: const [AutofillHints.name],
                decoration: const InputDecoration(labelText: 'Nome', prefixIcon: Icon(Icons.person_outline)),
                validator: _validateName,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _emailController,
                enabled: !_busy,
                keyboardType: TextInputType.emailAddress,
                autocorrect: false,
                autofillHints: const [AutofillHints.email],
                decoration: const InputDecoration(labelText: 'E-mail', prefixIcon: Icon(Icons.mail_outline)),
                validator: _validateEmail,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _currentPasswordController,
                enabled: !_busy,
                obscureText: true,
                autofillHints: const [AutofillHints.currentPassword],
                decoration: const InputDecoration(labelText: 'Senha atual', prefixIcon: Icon(Icons.lock_outline)),
                validator: _validateCurrentPassword,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _newPasswordController,
                enabled: !_busy,
                obscureText: true,
                autofillHints: const [AutofillHints.newPassword],
                decoration: const InputDecoration(
                  labelText: 'Nova senha (opcional)',
                  helperText: 'Use pelo menos 8 caracteres para trocar a senha.',
                  prefixIcon: Icon(Icons.password_outlined),
                ),
                validator: _validateNewPassword,
              ),
              if (_message != null) ...[
                const SizedBox(height: 14),
                _StatusMessage(message: _message!, isError: _messageIsError),
              ],
              const SizedBox(height: 18),
              FilledButton.icon(
                onPressed: _busy ? null : _save,
                icon: _busy
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.save_outlined),
                label: Text(_busy ? 'Aguarde…' : 'Salvar dados'),
                style: FilledButton.styleFrom(
                  backgroundColor: BrandPalette.gold,
                  foregroundColor: BrandPalette.forestDeep,
                  minimumSize: const Size.fromHeight(50),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 26),
        const _SectionTitle('Sessão'),
        const SizedBox(height: 8),
        const Text(
          'Sair encerra sua sessão. Seus carimbos e seu progresso continuam vinculados à conta.',
          style: TextStyle(color: BrandPalette.darkMuted, height: 1.45),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: _busy ? null : _logout,
          icon: const Icon(Icons.logout),
          label: const Text('Sair da conta'),
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
        ),
        const SizedBox(height: 26),
        const _SectionTitle('Zona de atenção'),
        const SizedBox(height: 8),
        const Text(
          'A exclusão pode ser permanente e afetar seus dados e conquistas. Você precisará confirmar antes de continuar.',
          style: TextStyle(color: BrandPalette.darkMuted, height: 1.45),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: _busy ? null : _delete,
          icon: const Icon(Icons.delete_outline),
          label: const Text('Excluir conta e dados'),
          style: OutlinedButton.styleFrom(
            foregroundColor: BrandPalette.darkDanger,
            side: const BorderSide(color: BrandPalette.darkDanger),
            minimumSize: const Size.fromHeight(48),
          ),
        ),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title);
  final String title;

  @override
  Widget build(BuildContext context) => Text(
        title,
        style: const TextStyle(color: BrandPalette.cream, fontSize: 17, fontWeight: FontWeight.w800),
      );
}

class _StatusMessage extends StatelessWidget {
  const _StatusMessage({required this.message, required this.isError});
  final String message;
  final bool isError;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isError ? BrandPalette.darkDanger.withValues(alpha: .12) : BrandPalette.darkGreen.withValues(alpha: .16),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isError ? BrandPalette.darkDanger : BrandPalette.darkGreen),
        ),
        child: Text(
          message,
          style: TextStyle(color: isError ? BrandPalette.darkDanger : BrandPalette.cream, height: 1.4),
        ),
      );
}

String _errorText(Object error, String fallback) {
  final text = error.toString().trim();
  return text.isEmpty || text == 'Exception' ? fallback : text.replaceFirst(RegExp(r'^Exception: '), '');
}
