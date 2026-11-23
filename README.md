<p align="center">
  <img src="assets/logo.svg" alt="Our Table" width="320">
</p>

<p align="center"><em>Nosso diário gastronômico particular.</em></p>

---

**Our Table** é um site privado para um casal registrar os restaurantes e deliveries que conheceu: cada ida vira um registro com data, fotos, ocasião e a **nota individual de cada um**, e o site calcula a média do casal, os rankings e as estatísticas.

Ele é 100% gratuito: HTML, CSS e JavaScript puros hospedados no **GitHub Pages**, com banco de dados e login no plano gratuito (Spark) do **Firebase**. Não precisa de servidor nem de build.

## Sumário

- [Funcionalidades](#funcionalidades)
- [Como os dados são organizados](#como-os-dados-são-organizados)
- [Passo a passo para usar (ou fazer fork)](#passo-a-passo-para-usar-ou-fazer-fork)
- [Personalização](#personalização)
- [Backup e restauração](#backup-e-restauração)
- [Segurança](#segurança)
- [Limites do plano gratuito](#limites-do-plano-gratuito)
- [Problemas comuns](#problemas-comuns)
- [Estrutura do projeto](#estrutura-do-projeto)

## Funcionalidades

- **Início**: sugestões do dia (uma para sair e outra para pedir), avisos de notas pendentes, lembranças do tipo "nesta época, anos atrás" e a grade de lugares no estilo Instagram, com a foto e o nome embaixo.
- **Registro em duas etapas**: um dos dois cadastra o lugar (ou mais uma visita a um lugar já conhecido) com data, ocasião, o que pediram, quanto gastaram, observações e fotos. Depois, cada um entra e dá a própria nota.
- **Nota às cegas**: a nota do outro só aparece depois que você avalia, para um não influenciar o outro.
- **Critérios de 0 a 10**, com a opção "não se aplica":
  - Restaurante: sabor, atendimento, ambiente, apresentação e custo-benefício.
  - Delivery: sabor, apresentação, embalagem, tempo de entrega e custo-benefício.
  - Para cada um, ainda dá para marcar "voltaria?" e deixar um comentário.
- **Médias automáticas**: de cada pessoa, do casal por visita e do lugar no histórico todo.
- **Vários registros por lugar**: se voltarem anos depois, a visita nova entra no mesmo restaurante.
- **Lugares**: busca, filtro por tipo (restaurante ou delivery), categoria e cidade, e ordenação por nota, data, número de visitas ou nome. Dá para ver em grade ou em lista.
- **Lista de desejos** ("Quero ir" / "Quero pedir"): é só marcar a caixinha na hora de cadastrar.
- **Sorteador**: sorteia entre os lugares onde vocês já foram, com filtro por tipo, nota mínima, categoria, cidade, "não repetir os últimos X dias" e a opção de ignorar os que "não voltaria".
- **Hall da Fama**: o top 10 com pódio, o favorito de cada um, os campeões por critério e o melhor de cada tipo de comida.
- **Painel**: estatísticas por ano, média de cada um, quem é mais exigente, o quanto as notas de vocês concordam, gastos, tipos de comida, ocasiões, cidades e distribuição das notas.
- **Galeria** com todas as fotos e filtro por tipo (lugar, prato, nós).
- **Linha do tempo** com todas as experiências em ordem.
- **Mapa** com Leaflet + OpenStreetMap, ambos gratuitos.
- **Endereço automático** (opcional) pela busca do OpenStreetMap, sem chave nem cartão.
- **Ocasiões**: dia comum, encontro, aniversário, aniversário de namoro, Dia dos Namorados, viagem e outras.
- **Backup** em arquivo `.json` (baixar e restaurar).
- **Tema escuro e claro**, responsivo para celular e computador. Dá para instalar na tela inicial do celular.
- **Login com e-mail e senha** e recuperação de senha por e-mail.

## Como os dados são organizados

```
members/{uid}       → quem tem acesso (criado à mão no Console)
places/{id}         → um documento por restaurante/delivery (+ totais: média, nº de visitas, última visita…)
visits/{id}         → cada ida/pedido: data, ocasião, gasto, observações e ratings { uid: nota }
photos/{id}         → miniatura da foto (base64, ~20–40 KB)
photoData/{id}      → foto em tamanho original (base64, até ~900 KB)
```

As fotos ficam no próprio Firestore em **base64**, comprimidas no navegador antes do envio. Isso evita o Cloud Storage, que hoje exige o plano pago (Blaze) do Firebase.

Os totais de cada lugar (média, quantidade de visitas, última visita, média por critério e por pessoa) ficam gravados no próprio documento do lugar. Assim, ordenar e filtrar não exige ler todas as visitas.

## Passo a passo para usar (ou fazer fork)

### 1. Copie o repositório

Clique em **Fork** no GitHub, ou crie um repositório novo e envie estes arquivos.

### 2. Crie o projeto no Firebase

1. Acesse <https://console.firebase.google.com> e clique em **Adicionar projeto**.
2. Dê um nome (ex.: `our-table`). O Google Analytics é opcional e pode ficar desligado.
3. O projeto começa no plano **Spark** (gratuito, sem cartão). Não precisa mudar.

### 3. Ative o login por e-mail e senha

1. Vá em **Build → Authentication → Começar**.
2. Na aba **Sign-in method**, ative **E-mail/senha** e salve.
3. *(Recomendado)* Em **Settings → User actions**, se a opção aparecer, desmarque **Enable create (sign-up)**. Assim ninguém consegue criar conta pelo app. Mesmo sem isso, contas criadas por terceiros não acessam nada, porque não estão em `members`.

### 4. Crie os usuários

1. Em **Authentication → Users → Adicionar usuário**, crie uma conta para cada pessoa, com e-mail e senha.
2. Copie o **UID** de cada usuário (a coluna "User UID"). Você vai precisar dele no passo 6.

### 5. Crie o banco Firestore

1. Vá em **Build → Firestore Database → Criar banco de dados**.
2. Escolha **modo de produção** e a localização `southamerica-east1 (São Paulo)`, que deixa tudo mais rápido no Brasil. A localização não pode ser alterada depois.

### 6. Cadastre quem tem acesso (coleção `members`)

Ainda no Firestore, clique em **Iniciar coleção**:

- **ID da coleção**: `members`
- **ID do documento**: cole o **UID** da primeira pessoa
- **Campos**:
  - `name` (string): o nome que aparece no site, ex.: `Vitória`
  - `color` (string, opcional): a cor da pessoa nos gráficos, ex.: `#c9a96e`

Repita para a segunda pessoa (**Adicionar documento**, com ID = UID dela). Sugestão de segunda cor: `#c07a86`.

> Só quem tem um documento em `members` consegue ler ou gravar qualquer coisa.

### 7. Publique as regras de segurança

1. Em **Firestore → Regras**, apague o conteúdo atual.
2. Cole todo o conteúdo do arquivo [`firestore.rules`](firestore.rules) e clique em **Publicar**.

### 8. Conecte o site ao Firebase

1. No Firebase, abra **⚙️ Configurações do projeto → Geral → Seus apps** e clique no ícone **`</>`** (Web).
2. Registre o app com um apelido qualquer. Não precisa marcar Firebase Hosting.
3. Copie o objeto `firebaseConfig` e cole em [`js/firebase-config.js`](js/firebase-config.js), substituindo os valores de exemplo.

> Essas chaves **não são secretas**: elas apenas identificam o projeto, e quem protege os dados são as regras do passo 7. Pode commitar normalmente.

### 9. Publique no GitHub Pages

1. No repositório, vá em **Settings → Pages**.
2. Em **Source**, escolha **Deploy from a branch**, depois a branch `main` e a pasta `/ (root)`, e salve.
3. Em 1 ou 2 minutos o site estará em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

### 10. Autorize o domínio no Firebase

Em **Authentication → Settings → Authorized domains**, clique em **Add domain** e adicione `SEU-USUARIO.github.io`.

### 11. Proteja a chave da API (recomendado)

1. Abra o [Google Cloud Console → Credenciais](https://console.cloud.google.com/apis/credentials) com o mesmo projeto selecionado.
2. Clique na chave **Browser key (auto created by Firebase)**.
3. Em **Restrições de aplicativo**, escolha **Sites** e adicione:
   - `https://SEU-USUARIO.github.io/*`
   - `http://localhost/*` (opcional, para testar no computador)
4. Salve.

### 12. E-mail de redefinição de senha em português (opcional)

Em **Authentication → Templates → Redefinição de senha**, troque o idioma do modelo para **Português (Brasil)** e personalize o texto, se quiser.

Pronto! Acesse o site, entre com o e-mail e a senha criados no passo 4 e registrem o primeiro lugar. 🍣

### Testar no computador antes de publicar

Os módulos JavaScript precisam de um servidor local (abrir o `index.html` direto não funciona):

```bash
# na pasta do projeto
python -m http.server 8000
# abra http://localhost:8000
```

Se a página ficar presa no login, adicione `localhost` em **Authorized domains** (passo 10).

## Personalização

Tudo fica em [`js/config.js`](js/config.js):

| O quê | Onde |
|---|---|
| Cidade, estado e país padrão do cadastro | `APP.defaultCity` / `defaultState` / `defaultCountry` |
| Centro do mapa | `APP.mapCenter` |
| Link do repositório no rodapé | `APP.github` |
| Tipos de comida (com ícone) | `CATEGORIES` |
| Ocasiões | `OCCASIONS` |
| Critérios avaliados | `CRITERIA.restaurante` / `CRITERIA.delivery` |

Os ícones são do [Font Awesome Free](https://fontawesome.com/search?o=r&m=free) (use o nome `fa-...`). As cores e as fontes ficam no topo de [`css/style.css`](css/style.css).

> Se mudar a `key` de um critério ou categoria que já tem dados, os registros antigos deixam de aparecer naquele item. Prefira mudar só o `label`.

## Backup e restauração

Em **Configurações → Backup**:

- **Baixar backup** gera um `.json` com lugares, registros e fotos (com ou sem os originais). Guarde no Google Drive.
- **Restaurar backup** grava os dados do arquivo de volta. Funciona também num **projeto Firebase novo**: basta seguir o passo a passo, criar os `members` com os **mesmos UIDs** e restaurar.
- Itens com o mesmo ID são substituídos. Por segurança, as regras só deixam cada pessoa alterar a própria nota. Por isso, num banco que já tem notas diferentes das do backup, alguns registros podem ser ignorados (o site avisa quantos). Num banco vazio, tudo é restaurado.

Sugestão: fazer um backup por mês.

## Segurança

- **Só os membros acessam**: as regras do Firestore exigem login **e** um documento em `members/{uid}`. Esse documento só pode ser criado pelo Console, nunca pelo site.
- **Cada pessoa só edita a própria nota**: a regra `onlyOwnRating` impede que um altere a avaliação do outro.
- **Sem conteúdo externo vindo do banco**: só são exibidas imagens embutidas (`data:image/...`), e todo texto digitado é escapado antes de ir para a tela (proteção contra XSS).
- **Content Security Policy** no `index.html`: só carrega scripts do próprio site, do Firebase e do Leaflet.
- **Recuperação de senha** sem revelar se um e-mail existe ou não.
- **Robôs de busca** são orientados a não indexar o site (`noindex`).

> Lembrete: o GitHub Pages publica o **código** do site. Os **dados** (lugares, notas, fotos) ficam no Firebase e só aparecem depois do login.

## Limites do plano gratuito

| Firestore (Spark) | Cota gratuita |
|---|---|
| Armazenamento | 1 GiB |
| Leituras | 50 mil/dia |
| Gravações | 20 mil/dia |
| Exclusões | 20 mil/dia |

Uma foto ocupa em média 200 a 400 KB (original + miniatura), então cabem **milhares** de fotos. O site usa cache local (IndexedDB), o que reduz bastante as leituras. Se algum limite for atingido, o Firebase simplesmente pausa até o dia seguinte. **No plano Spark nunca há cobrança.**

## Problemas comuns

| Sintoma | Solução |
|---|---|
| "Quase lá — configure o Firebase" | Faltou colar a configuração em `js/firebase-config.js` (passo 8). |
| "Esta conta não tem acesso" | O UID do usuário não está na coleção `members`, ou o ID do documento foi digitado errado (passo 6). |
| "Sem permissão" ao salvar | As regras não foram publicadas (passo 7). |
| Login não abre no site publicado | Adicione o domínio `SEU-USUARIO.github.io` (passo 10). |
| E-mail de nova senha não chega | Confira o spam. O remetente é `noreply@SEU-PROJETO.firebaseapp.com`. |
| Lugar não aparece no mapa | Edite o lugar e use o botão de busca de endereço para salvar a localização. |
| Números desatualizados | **Configurações → Recalcular estatísticas.** |

## Estrutura do projeto

```
├── index.html               # página única (SPA)
├── manifest.webmanifest     # instalar como app no celular
├── firestore.rules          # regras de segurança (colar no Console)
├── assets/                  # logo, favicon, ícone
├── css/style.css            # todo o visual (tema escuro/claro, responsivo)
└── js/
    ├── firebase-config.js   # ← sua configuração do Firebase
    ├── config.js            # ← categorias, ocasiões, critérios, local padrão
    ├── app.js               # login, layout e rotas
    ├── firebase.js          # inicialização do SDK (via CDN oficial)
    ├── api.js               # leitura/gravação no Firestore, backup
    ├── store.js             # estado em memória (tempo real)
    ├── stats.js             # cálculo das médias
    ├── router.js            # rotas por hash (#/lugares …)
    ├── ui.js                # componentes visuais
    ├── place-form.js        # campos do lugar + busca no OpenStreetMap
    ├── theme.js             # tema claro/escuro
    ├── utils.js             # formatação, imagens, modais, segurança
    └── pages/               # uma tela por arquivo
```

**Tecnologias:** HTML, CSS e JavaScript (módulos ES, sem build) · Firebase Authentication + Cloud Firestore · Font Awesome · Leaflet + OpenStreetMap · Google Fonts (Cormorant Garamond e Manrope).

---

<p align="center"><sub>Feito com carinho para registrar as nossas mesas favoritas.</sub></p>
