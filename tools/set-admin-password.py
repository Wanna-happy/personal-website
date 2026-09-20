"""Run locally in a terminal. getpass never echoes the password."""
import getpass, hashlib, json, os, secrets
from pathlib import Path

def main():
    path=Path(os.environ['LOCALAPPDATA'])/'RuanStudio'/'admin-auth.json'
    if path.exists():
        old=json.loads(path.read_text(encoding='utf-8'))
        password=getpass.getpass('Current admin password: ')
        actual=hashlib.pbkdf2_hmac('sha256',password.encode(),bytes.fromhex(old['salt']),old['iterations']).hex()
        if not secrets.compare_digest(actual,old['hash']): raise ValueError('Current password is incorrect.')
    password=getpass.getpass('New admin password (at least 8 characters): ')
    if len(password)<8 or len(password)>256: raise ValueError('Use 8 to 256 characters.')
    if password!=getpass.getpass('Repeat password: '): raise ValueError('Passwords do not match.')
    salt=secrets.token_bytes(32);iterations=600000
    value={'salt':salt.hex(),'iterations':iterations,'hash':hashlib.pbkdf2_hmac('sha256',password.encode(),salt,iterations).hex()}
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(value),encoding='utf-8');os.replace(tmp,path)
    print('Saved. Open http://127.0.0.1:8765/admin.html to sign in.')

if __name__=='__main__':
    try: main()
    except (ValueError,EOFError,KeyboardInterrupt) as e: print(str(e) or 'Cancelled.')
    input('Press Enter to close...')
