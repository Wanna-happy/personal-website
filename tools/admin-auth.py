"""Local password verification; credentials live outside the website directory."""
import os, secrets, time, hmac, hashlib, json, threading
from pathlib import Path

class PasswordAuth:
    def __init__(self, path=None, clock=time.time):
        self.path=Path(path or os.getenv('RUAN_ADMIN_AUTH_FILE') or Path(os.getenv('LOCALAPPDATA',str(Path.home()))) / 'RuanStudio' / 'admin-auth.json')
        self.clock=clock; self.lock=threading.Lock(); self.sessions={}; self.failures=[]
    @property
    def configured(self): return self.path.is_file()
    def digest(self, token): return hashlib.sha256(token.encode()).hexdigest()
    def verify(self, password):
        with self.lock:
            if not self.configured: raise ValueError('尚未设置管理员密码，请先运行「设置管理密码.cmd」')
            now=self.clock(); self.failures=[t for t in self.failures if now-t<900]
            if len(self.failures)>=5: raise ValueError('连续输错 5 次，请 15 分钟后再试')
            data=json.loads(self.path.read_text(encoding='utf-8'))
            actual=hashlib.pbkdf2_hmac('sha256',str(password).encode(),bytes.fromhex(data['salt']),data['iterations']).hex()
            if not hmac.compare_digest(actual,data['hash']):
                self.failures.append(now); raise ValueError('密码不正确')
            self.failures=[]; token=secrets.token_urlsafe(32)
            self.sessions={k:v for k,v in self.sessions.items() if v['expires']>now}
            self.sessions[self.digest(token)]={'expires':now+3600,'version':data['hash']}
            return token
    def valid(self, token):
        with self.lock:
            entry=self.sessions.get(self.digest(token))
            if not entry or entry['expires']<=self.clock(): return False
            try: return entry['version']==json.loads(self.path.read_text(encoding='utf-8'))['hash']
            except (OSError,ValueError): return False
    def logout(self, token):
        with self.lock: self.sessions.pop(self.digest(token),None)
