import { store, memberList } from '../store.js';
import { exportBackup, importBackup, recomputeAll } from '../api.js';
import { auth, signOut, sendPasswordResetEmail } from '../firebase.js';
import { esc, download, toast, friendlyError, setBusy, confirmDialog, todayStr, local } from '../utils.js';
import { icon, pageHead, brand } from '../ui.js';
import { applyTheme } from '../theme.js';
import { APP } from '../config.js';

let busy = false;

export default {
  title: 'Configurações',
  live: false,
  isBusy: () => busy,
  render(root) {
    const theme = document.documentElement.dataset.theme || 'dark';
    const counts = { places: store.places.length, visits: store.visits.length };

    root.innerHTML = `
      ${pageHead('Configurações')}
      <div class="settings">
        <section class="card card-pad">
          <h3 class="card-title">${icon('fa-circle-user')} Conta</h3>
          <p>${esc(store.user.email)}</p>
          <div class="people-avg">${memberList().map(m => `<div class="person-avg" style="--pc:${esc(m.color)}"><span class="pa-name"><i></i>${esc(m.name)}</span></div>`).join('')}</div>
          <div class="btn-row mt">
            <button class="btn btn-ghost" data-reset>${icon('fa-key')} Trocar senha por e-mail</button>
            <button class="btn btn-ghost" data-logout>${icon('fa-arrow-right-from-bracket')} Sair</button>
          </div>
        </section>

        <section class="card card-pad">
          <h3 class="card-title">${icon('fa-palette')} Aparência</h3>
          <div class="seg">
            <button data-theme="dark" class="${theme === 'dark' ? 'active' : ''}">${icon('fa-moon')} Escuro</button>
            <button data-theme="light" class="${theme === 'light' ? 'active' : ''}">${icon('fa-sun')} Claro</button>
          </div>
        </section>

        <section class="card card-pad">
          <h3 class="card-title">${icon('fa-cloud-arrow-down')} Backup</h3>
          <p class="muted">${counts.places} lugares · ${counts.visits} registros. Baixe um arquivo .json com tudo e guarde no seu Drive. Depois é só restaurar aqui — inclusive num projeto Firebase novo.</p>
          <label class="check"><input type="checkbox" data-incl checked><span class="check-box">${icon('fa-check')}</span>
            <span>Incluir fotos em tamanho original <small>(arquivo maior; sem isso vão só as miniaturas)</small></span></label>
          <div class="btn-row mt">
            <button class="btn btn-primary" data-export>${icon('fa-download')} Baixar backup</button>
            <label class="btn btn-ghost">${icon('fa-upload')} Restaurar backup<input type="file" accept=".json,application/json" hidden data-import></label>
          </div>
          <p class="hint" data-prog></p>
        </section>

        <section class="card card-pad">
          <h3 class="card-title">${icon('fa-screwdriver-wrench')} Manutenção</h3>
          <p class="muted">Recalcula as médias e totais de todos os lugares. Use se algum número parecer desatualizado.</p>
          <button class="btn btn-ghost" data-recompute>${icon('fa-rotate')} Recalcular estatísticas</button>
        </section>

        <footer class="about">${brand(28)}<p class="faint">Feito com carinho · <a class="link" href="${esc(APP.github)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-github"></i> GitHub</a></p></footer>
      </div>`;

    const prog = root.querySelector('[data-prog]');

    root.querySelectorAll('[data-theme]').forEach(b => b.addEventListener('click', () => {
      applyTheme(b.dataset.theme);
      root.querySelectorAll('[data-theme]').forEach(x => x.classList.toggle('active', x === b));
    }));
    root.querySelector('[data-logout]').addEventListener('click', () => signOut(auth));
    root.querySelector('[data-reset]').addEventListener('click', async (e) => {
      setBusy(e.currentTarget, true);
      try { await sendPasswordResetEmail(auth, store.user.email); toast('Enviamos um link para o seu e-mail.', 'info'); }
      catch (err) { toast(friendlyError(err), 'error'); }
      setBusy(e.currentTarget, false);
    });

    root.querySelector('[data-export]').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      busy = true; setBusy(btn, true, 'Gerando…');
      try {
        const data = await exportBackup(root.querySelector('[data-incl]').checked, (m) => { prog.textContent = m; });
        download(`our-table-backup-${todayStr()}.json`, JSON.stringify(data));
        local.set('ot-last-backup', todayStr());
        prog.textContent = 'Backup gerado.';
        toast('Backup baixado.');
      } catch (err) { toast(friendlyError(err), 'error'); prog.textContent = ''; }
      busy = false; setBusy(btn, false);
    });

    root.querySelector('[data-import]').addEventListener('change', async (e) => {
      const file = e.target.files[0]; e.target.value = '';
      if (!file) return;
      let data;
      try { data = JSON.parse(await file.text()); }
      catch { return toast('Arquivo inválido.', 'error'); }
      if (data?.app !== 'our-table') return toast('Esse arquivo não é um backup do Our Table.', 'error');
      const n = (data.places?.length || 0) + (data.visits?.length || 0);
      const ok = await confirmDialog(`Restaurar ${data.places?.length || 0} lugares e ${data.visits?.length || 0} registros de ${data.exportedAt ? new Date(data.exportedAt).toLocaleDateString('pt-BR') : '?'}? Itens com o mesmo ID serão substituídos pela versão do backup.`, { title: 'Restaurar backup', okText: 'Restaurar' });
      if (!ok || !n) return;
      busy = true;
      try {
        const r = await importBackup(data, (m) => { prog.textContent = m; });
        prog.textContent = `Pronto: ${r.ok} itens restaurados${r.skipped ? `, ${r.skipped} ignorados` : ''}.`;
        toast('Backup restaurado.');
      } catch (err) { toast(friendlyError(err), 'error'); prog.textContent = ''; }
      busy = false;
    });

    root.querySelector('[data-recompute]').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      busy = true; setBusy(btn, true, 'Recalculando…');
      try { await recomputeAll((i, n) => setBusy(btn, true, `${i}/${n}`)); toast('Estatísticas atualizadas.'); }
      catch (err) { toast(friendlyError(err), 'error'); }
      busy = false; setBusy(btn, false);
    });
  }
};
