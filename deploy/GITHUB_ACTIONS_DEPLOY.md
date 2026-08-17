# Deploy automático via GitHub Actions (SSH sobre Tailscale)

Este guia configura um workflow que, a cada push na branch `main`, conecta
o runner do GitHub Actions ao seu tailnet (sem expor nenhuma porta SSH na
internet) e roda o deploy no servidor com um usuário dedicado de
privilégios mínimos — em vez de `root`.

Pré-requisito: o SYSVEX já publicado numa LXC/servidor seguindo
[`PROXMOX_LXC_SETUP.md`](PROXMOX_LXC_SETUP.md), com Tailscale instalado
(seção 9 daquele guia).

## 1. Criar um OAuth client do Tailscale para o GitHub Actions

No [admin console do Tailscale](https://login.tailscale.com/admin/settings/oauth):

1. **Settings → OAuth clients → Generate OAuth client**.
2. Escopo: `Devices` com permissão de **escrita** (para o runner conseguir
   entrar no tailnet como um nó efêmero).
3. Em **Tags**, adicione `tag:ci` — o nó do runner vai entrar no tailnet já
   com essa tag, o que permite restringir o acesso dele via ACL (próximo
   passo) em vez de deixá-lo enxergar a rede inteira.
4. Guarde o **Client ID** e o **Client Secret** gerados — vão virar secrets
   do GitHub (passo 4).

### Restringir a tag `tag:ci` só ao necessário (ACL)

`tag:ci` precisa existir em `tagOwners` **antes** de aparecer como opção na
tela de criação do OAuth client — se a tag ainda não existir, edite a ACL
primeiro (este passo), salve, e só depois volte para criar o OAuth client.

A ACL padrão do Tailscale hoje em dia usa o formato `grants` (não o
`acls` mais antigo). Em **Access controls**, mescle isto na política
existente — mantendo o resto do que já estiver lá (comentários, `ssh`,
etc.):

```jsonc
{
  "tagOwners": {
    "tag:ci":            ["autogroup:admin"],
    "tag:sysvex-server":  ["autogroup:admin"],
  },

  "grants": [
    // Sua regra "allow all" existente provavelmente continua aqui:
    {"src": ["*"], "dst": ["*"], "ip": ["*"]},

    // Escopo pretendido para o runner do GitHub Actions:
    {"src": ["tag:ci"], "dst": ["tag:sysvex-server"], "ip": ["tcp:22"]},
  ],
}
```

Marque o servidor com `tailscale up --advertise-tags=tag:sysvex-server`
(ou aplique a tag pela UI) para a tag existir de fato num dispositivo.

> **TODO / pendência conhecida:** enquanto o grant `{"src": ["*"], "dst":
> ["*"], "ip": ["*"]}` (allow all) continuar na política, a regra de
> `tag:ci` acima **não restringe nada de verdade** — `tag:ci` já teria
> acesso a tudo por causa do allow-all. A defesa real hoje é o
> forced-command na chave SSH do usuário `deploy` (seção 3 abaixo): mesmo
> com acesso de rede amplo, a chave só executa `remote-deploy.sh`. Se
> quiser reforçar isso no nível de rede depois, é preciso substituir o
> allow-all por grants explícitos cobrindo os outros dispositivos do
> tailnet (pessoais) e remover a regra `{"src": ["*"], ...}` — mudança
> maior, adiada por ora.

> **Desligue o Tailscale SSH no servidor.** Se o `tailscale up` do servidor
> foi rodado com `--ssh` (Tailscale SSH ligado), toda conexão na porta 22
> vindo de dentro do tailnet passa a ser interceptada pelo Tailscale SSH
> *antes* de chegar no OpenSSH normal. Como o runner do GitHub Actions
> entra como nó com tag (`tag:ci`), não como um usuário logado, ele nunca
> bate com a regra padrão `"src": ["autogroup:member"]` do bloco `"ssh"` da
> ACL — a conexão é recusada com `tailnet policy does not permit you to SSH
> to this node`, mesmo com a chave e o forced-command corretos. Como este
> guia usa SSH normal (chave + forced-command), não o Tailscale SSH, a
> solução é desligá-lo no servidor:
> ```bash
> sudo tailscale up --reset --advertise-tags=tag:sysvex-server
> ```
> `--reset` volta os flags booleanos (incluindo `--ssh`) para o padrão
> (desligado), mantendo só o que for passado explicitamente.

## 2. Criar o usuário dedicado `deploy` no servidor

Dentro do servidor (LXC), como root:

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy      # necessário para rodar "docker compose" sem sudo
chown -R deploy:deploy /opt/sysvex
```

> O grupo `docker` equivale a root em termos de acesso à máquina (quem
> controla o daemon Docker controla o host). Por isso a chave SSH deste
> usuário é restrita a um **forced command** no próximo passo: mesmo que a
> chave privada vaze, ela só consegue rodar o script de deploy, nada além
> disso — nenhum shell interativo, nenhum outro comando.

## 3. Gerar o par de chaves SSH e restringir o acesso

Ainda no servidor, como `deploy` (ou como root, ajustando dono depois):

```bash
sudo -u deploy mkdir -p /home/deploy/.ssh
sudo -u deploy ssh-keygen -t ed25519 -f /tmp/sysvex-deploy-key -N "" -C "github-actions-sysvex"
```

Isso gera `/tmp/sysvex-deploy-key` (privada — vai para o secret do GitHub,
passo 4) e `/tmp/sysvex-deploy-key.pub` (pública — fica no servidor).

Configure o `authorized_keys` do `deploy` **com forced command**, para que
essa chave só consiga executar `deploy/remote-deploy.sh`, nunca um comando
arbitrário:

```bash
KEY="$(cat /tmp/sysvex-deploy-key.pub)"
echo "command=\"/opt/sysvex/deploy/remote-deploy.sh\",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty $KEY" \
  | sudo -u deploy tee /home/deploy/.ssh/authorized_keys > /dev/null
sudo -u deploy chmod 700 /home/deploy/.ssh
sudo -u deploy chmod 600 /home/deploy/.ssh/authorized_keys
rm /tmp/sysvex-deploy-key.pub
```

Confirme que `/opt/sysvex/deploy/remote-deploy.sh` é executável
(`chmod +x`, já vem assim neste repositório) e que `/opt/sysvex` pertence
ao usuário `deploy` (passo 2).

## 4. Configurar os secrets no GitHub

No repositório: **Settings → Secrets and variables → Actions → New
repository secret**. Crie:

| Secret               | Valor                                                              |
|-----------------------|---------------------------------------------------------------------|
| `TS_OAUTH_CLIENT_ID`  | Client ID gerado no passo 1                                        |
| `TS_OAUTH_SECRET`     | Client Secret gerado no passo 1                                    |
| `DEPLOY_SSH_KEY`      | Conteúdo de `/tmp/sysvex-deploy-key` (a chave **privada**)         |
| `DEPLOY_HOST`         | Nome do servidor no tailnet (MagicDNS, ex.: `sysvex.tailXXXX.ts.net`) ou o IP `100.x.y.z` dele |

Depois de copiar `/tmp/sysvex-deploy-key` para o secret, apague-o do
servidor: `rm /tmp/sysvex-deploy-key`.

Recomendado: crie um **Environment** chamado `production` (Settings →
Environments) e exija aprovação manual antes do deploy rodar, se quiser
uma revisão humana a cada push em `main`.

## 5. Como funciona o workflow

[`​.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) roda a
cada push em `main` (ou manualmente via **Actions → Deploy → Run
workflow**):

1. Entra no tailnet como nó efêmero com a tag `tag:ci`.
2. Carrega a chave privada do `deploy` e faz `ssh-keyscan` do servidor
   (alcançável só porque o runner está no tailnet).
3. Conecta via SSH em `deploy@$DEPLOY_HOST` — o forced command do
   `authorized_keys` ignora qualquer comando enviado e sempre roda
   [`deploy/remote-deploy.sh`](remote-deploy.sh), que:
   - tira um backup lógico do banco em `/opt/sysvex/backups/`;
   - `git pull --ff-only`;
   - `docker compose up -d --build`;
   - confere se o `backend` subiu (`Up`, sem loop de reinício) e falha o
     workflow (exit code ≠ 0) se não subiu, deixando o log do container
     nos logs do Actions.
4. Remove a chave privada do runner ao final (mesmo se o passo anterior
   falhar).

Se o deploy falhar, o job aparece vermelho no GitHub Actions com o log do
`docker compose logs backend` anexado — trate como descrito na seção 11 do
`PROXMOX_LXC_SETUP.md` (o backup em `/opt/sysvex/backups/` já foi feito
antes do `git pull`, então dá para restaurar com `psql` se precisar).
