import { auth, signInWithEmailAndPassword, sendPasswordResetEmail } from '../firebase.js';
import { brand, icon } from '../ui.js';
import { $, toast, setBusy, friendlyError, esc } from '../utils.js';
import { APP } from '../config.js';

export function renderLogin(root) {
  root.innerHTML = `
  <div class="login-wrap">
    <div class="login-art" aria-hidden="true"></div>
    <div class="login-card">
      <div class="login-brand">${brand(52)}</div>
      <p class="login-tag">${esc(APP.tagline)}</p>

      <form id="login-form" class="form" autocomplete="on" novalidate>
        <label class="field">
          <span>E-mail</span>
          <input type="email" name="email" required autocomplete="username" inputmode="email" placeholder="voce@email.com">
        </label>
        <label class="field">
          <span>Senha</span>
          <div class="input-icon">
            <input type="password" name="password" required autocomplete="current-password" placeholder="••••••••">
            <button type="button" class="btn-icon" data-toggle aria-label="Mostrar senha">${icon('fa-eye')}</button>
          </div>
        </label>
        <button class="btn btn-primary btn-block" type="submit">Entrar</button>
        <button class="link-btn" type="button" data-forgot>Esqueci minha senha</button>
      </form>

      <form id="reset-form" class="form" hidden novalidate>
        <p class="muted">Informe seu e-mail. Se ele tiver uma conta, enviaremos um link para criar uma nova senha.</p>
        <label class="field">
          <span>E-mail</span>
          <input type="email" name="email" required autocomplete="username" inputmode="email">
        </label>
        <button class="btn btn-primary btn-block" type="submit">Enviar link</button>
        <button class="link-btn" type="button" data-back>${icon('fa-arrow-left')} Voltar ao login</button>
      </form>
    </div>
  </div>`;

  const login = $('#login-form', root);
  const reset = $('#reset-form', root);

  $('[data-toggle]', root).addEventListener('click', (e) => {
    const inp = login.password;
    inp.type = inp.type === 'password' ? 'text' : 'password';
    e.currentTarget.innerHTML = icon(inp.type === 'password' ? 'fa-eye' : 'fa-eye-slash');
  });

  login.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = login.querySelector('[type=submit]');
    const email = login.email.value.trim();
    const pass = login.password.value;
    if (!email || !pass) return toast('Preencha e-mail e senha.', 'error');
    setBusy(btn, true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      toast(friendlyError(err), 'error');
      setBusy(btn, false);
    }
  });

  $('[data-forgot]', root).addEventListener('click', () => {
    reset.email.value = login.email.value;
    login.hidden = true; reset.hidden = false;
  });
  $('[data-back]', root).addEventListener('click', () => { reset.hidden = true; login.hidden = false; });

  reset.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = reset.querySelector('[type=submit]');
    const email = reset.email.value.trim();
    if (!email) return toast('Informe o e-mail.', 'error');
    setBusy(btn, true);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      // Não revela se o e-mail existe ou não (exceto erros de formato/conexão)
      if (['auth/invalid-email', 'auth/network-request-failed', 'auth/too-many-requests'].includes(err.code)) {
        toast(friendlyError(err), 'error'); setBusy(btn, false); return;
      }
    }
    toast('Se o e-mail estiver cadastrado, o link chegará em instantes. Confira o spam.', 'info');
    setBusy(btn, false);
    reset.hidden = true; login.hidden = false;
  });
}
