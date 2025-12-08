# Configuração de Email Real

Para que o sistema envie emails reais (para a tua caixa de correio) em vez de usar o sistema de teste, precisas de configurar as variáveis de ambiente no ficheiro `server/.env`.

## 1. Gmail (Recomendado)

O Gmail requer uma "App Password" (Palavra-passe de Aplicação) porque a tua palavra-passe normal não funciona diretamente por razões de segurança.

### Passo a Passo:
1.  Acede à tua conta Google: [https://myaccount.google.com/](https://myaccount.google.com/)
2.  Vai a **Segurança** (Security).
3.  Ativa a **Validação em dois passos** (2-Step Verification) se ainda não estiver ativa.
4.  Na barra de pesquisa no topo, escreve "App passwords" (Palavras-passe de aplicações) e clica no resultado.
5.  Dá um nome à aplicação (ex: "Ticket System") e clica em **Criar**.
6.  Copia a palavra-passe de 16 caracteres que aparece (sem espaços).

### No ficheiro `server/.env`:
Adiciona estas linhas ao final do ficheiro:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=o_teu_email@gmail.com
SMTP_PASS=a_tua_app_password_de_16_caracteres
```

---

## 2. Outlook / Hotmail

### No ficheiro `server/.env`:

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=o_teu_email@outlook.com
SMTP_PASS=a_tua_password_normal
```
*Nota: Pode ser necessário autorizar o acesso a aplicações menos seguras nas definições da Microsoft.*

---

## 3. Outros (Sapo, Zon, Empresa)

Se usares outro fornecedor, precisas dos dados de SMTP deles.

```env
SMTP_HOST=smtp.exemplo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=teu_user
SMTP_PASS=tua_pass
```

## Como Testar

1.  Guarda o ficheiro `.env`.
2.  Reinicia o servidor (`Ctrl+C` e depois `npm start`).
3.  Cria um novo ticket na aplicação.
4.  Verifica se recebeste o email na conta configurada (ou na conta do utilizador que criou o ticket).
