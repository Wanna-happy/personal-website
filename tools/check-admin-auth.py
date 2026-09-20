import importlib.util, tempfile, secrets, hashlib, json
from pathlib import Path
spec=importlib.util.spec_from_file_location('auth',Path(__file__).with_name('admin-auth.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def config(path,password):
    salt=secrets.token_bytes(32);iterations=600000
    path.write_text(json.dumps({'salt':salt.hex(),'iterations':iterations,'hash':hashlib.pbkdf2_hmac('sha256',password.encode(),salt,iterations).hex()}),encoding='utf-8')
def rejects(fn):
    try: fn()
    except ValueError: return
    raise AssertionError('Expected rejection')
with tempfile.TemporaryDirectory() as tmp:
    path=Path(tmp)/'auth.json';now=[1000];auth=m.PasswordAuth(path,clock=lambda:now[0]);password=secrets.token_urlsafe(24)
    assert not auth.configured
    rejects(lambda:auth.verify(password));config(path,password)
    for _ in range(5): rejects(lambda:auth.verify('incorrect'))
    rejects(lambda:auth.verify(password));now[0]+=901
    token=auth.verify(password);assert auth.valid(token) and not auth.valid('forged')
    auth.logout(token);assert not auth.valid(token)
    token=auth.verify(password);now[0]+=3601;assert not auth.valid(token)
    token=auth.verify(password);config(path,secrets.token_urlsafe(24));assert not auth.valid(token)
print('PASS missing configuration, salted hash verification, lockout, expiry, logout, password rotation.')
