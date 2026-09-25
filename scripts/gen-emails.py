# Genera i modelli email di Supabase Auth con il marchio Social Planner.
# Uso: python scripts/gen-emails.py  ->  supabase/templates/*.html
import os

APP = 'https://social-planner-two.vercel.app'
LOGO = f'{APP}/icon-192.png'

BASE = '''<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
<div style="display:none;max-height:0;overflow:hidden;">{preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1fb;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
      <tr><td align="center" style="padding-bottom:20px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="padding-right:10px;"><img src="{logo}" width="44" height="44" alt="" style="display:block;border-radius:12px;"></td>
          <td style="font-size:20px;font-weight:800;letter-spacing:-0.3px;color:#1c1917;">Social <span style="color:#c026d3;">Planner</span></td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 30px rgba(88,28,135,0.10);">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="height:6px;background:#8b5cf6;background-image:linear-gradient(90deg,#8b5cf6,#d946ef,#fb7185);font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td align="center" style="padding:36px 32px 8px;">
            <div style="font-size:44px;line-height:1;">{emoji}</div>
            <h1 style="margin:16px 0 8px;font-size:24px;line-height:1.25;font-weight:800;color:#1c1917;">{heading}</h1>
            <p style="margin:0;font-size:16px;line-height:1.6;color:#57534e;">{intro}</p>
          </td></tr>
          <tr><td align="center" style="padding:28px 32px 8px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td align="center" style="border-radius:14px;background:#7c3aed;background-image:linear-gradient(90deg,#7c3aed,#c026d3);">
                <a href="{{{{ .ConfirmationURL }}}}" target="_blank" style="display:inline-block;padding:16px 34px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:14px;">{button}</a>
              </td>
            </tr></table>
          </td></tr>
          <tr><td align="center" style="padding:14px 32px 32px;">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#a8a29e;">{note}</p>
          </td></tr>
          <tr><td style="padding:0 32px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8ff;border-radius:14px;">
              <tr><td style="padding:14px 16px;font-size:12px;line-height:1.5;color:#78716c;">
                Il pulsante non funziona? Copia e incolla questo indirizzo nel browser:<br>
                <a href="{{{{ .ConfirmationURL }}}}" style="color:#7c3aed;word-break:break-all;">{{{{ .ConfirmationURL }}}}</a>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:22px 12px 0;font-size:12px;line-height:1.6;color:#a8a29e;">
        Hai ricevuto questa email per il tuo account Social Planner ({{{{ .Email }}}}).<br>
        Se non sei stato tu, puoi ignorarla in tutta tranquillità.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
'''

HELLO = '{{ if .Data.full_name }}Ciao {{ .Data.full_name }}!{{ else }}Ciao!{{ end }}'

TEMPLATES = {
    'conferma-registrazione': dict(
        subject='Conferma il tuo account Social Planner ✨',
        title='Conferma il tuo account',
        preheader='Un tocco e sei dentro: conferma la tua email.',
        emoji='🎉',
        heading=HELLO + ' Benvenuto in Social Planner',
        intro='Manca un solo passaggio: conferma la tua email e inizia a organizzare clienti, calendari e contenuti in un unico posto.',
        button='Conferma e inizia',
        note='Il link è valido per 24 ore.',
    ),
    'recupero-password': dict(
        subject='Reimposta la password di Social Planner',
        title='Reimposta la password',
        preheader='Scegli una nuova password in pochi secondi.',
        emoji='🔑',
        heading='Nuova password in arrivo',
        intro='Abbiamo ricevuto una richiesta per reimpostare la password del tuo account. Tocca il pulsante e scegline una nuova.',
        button='Scegli una nuova password',
        note='Se non l’hai chiesto tu, ignora questa email: la tua password resta quella di prima.',
    ),
    'cambio-email': dict(
        subject='Conferma il nuovo indirizzo email',
        title='Conferma il nuovo indirizzo',
        preheader='Conferma il cambio di email del tuo account.',
        emoji='📬',
        heading='Confermi il nuovo indirizzo?',
        intro='Hai chiesto di usare questo indirizzo email per il tuo account Social Planner ({{ .NewEmail }}). Conferma per completare il cambio.',
        button='Conferma il nuovo indirizzo',
        note='Se non sei stato tu, ignora questa email: il tuo account non cambia.',
    ),
    'accesso-rapido': dict(
        subject='Il tuo link di accesso a Social Planner',
        title='Accedi a Social Planner',
        preheader='Accedi con un tocco, senza password.',
        emoji='✨',
        heading='Ecco il tuo accesso rapido',
        intro='Tocca il pulsante per entrare subito in Social Planner, senza password.',
        button='Accedi a Social Planner',
        note='Il link si può usare una sola volta e scade a breve.',
    ),
    'invito': dict(
        subject='Sei stato invitato su Social Planner',
        title='Invito a Social Planner',
        preheader='Accetta l’invito e inizia a collaborare.',
        emoji='💌',
        heading='Hai un invito!',
        intro='Qualcuno ti ha invitato a usare Social Planner, l’app per gestire clienti, calendari e contenuti social. Accetta e crea la tua password.',
        button='Accetta l’invito',
        note='Se non ti aspettavi questo invito, puoi ignorare questa email.',
    ),
}

out = os.path.join(os.path.dirname(__file__), '..', 'supabase', 'templates')
os.makedirs(out, exist_ok=True)
subjects = []
for name, t in TEMPLATES.items():
    html = BASE.format(logo=LOGO, **{k: v for k, v in t.items() if k != 'subject'})
    open(os.path.join(out, f'{name}.html'), 'w', encoding='utf-8').write(html)
    subjects.append(f'{name}: {t["subject"]}')
open(os.path.join(out, 'OGGETTI.txt'), 'w', encoding='utf-8').write('\n'.join(subjects) + '\n')
print('\n'.join(subjects))
