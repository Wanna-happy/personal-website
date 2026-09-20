"""Local-only authoring service. Writes portable static content, never deploys."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse, base64, hashlib, json, os, secrets, threading, time, importlib.util
spec=importlib.util.spec_from_file_location("admin_auth",Path(__file__).with_name("admin-auth.py"))
auth_module=importlib.util.module_from_spec(spec);spec.loader.exec_module(auth_module)
AUTH=auth_module.PasswordAuth()

parser = argparse.ArgumentParser()
parser.add_argument('--root', default=str(Path(__file__).resolve().parents[1]))
parser.add_argument('--port', type=int, default=8766)
args = parser.parse_args()
ROOT = Path(args.root).resolve()
LOCK = threading.Lock()
ORIGINS = {'http://127.0.0.1:8765', 'http://localhost:8765'}
def revision():
    return hashlib.sha256((ROOT / 'content.json').read_bytes()).hexdigest()
def atomic(path, text):
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(text, encoding='utf-8')
    os.replace(temp, path)
def validate(data):
    assert data.get('version') == 1 and isinstance(data.get('profile'), dict), '内容格式不正确'
    profile=data['profile']
    assert all(isinstance(profile.get(k),str) for k in ['welcome','intro','email']), '简介格式不正确'
    assert isinstance(profile.get('education'),list), '教育背景格式不正确'
    for record in profile['education']:
        assert all(isinstance(record.get(k),str) for k in ['label','title','detail']), '教育背景格式不正确'
    for name in ['projects', 'experiences']:
        records = data.get(name)
        assert isinstance(records, list) and len(records) <= 100, '条目过多或格式不正确'
        ids = [r.get('id', '') for r in records]
        assert len(set(ids)) == len(ids) and all(isinstance(i,str) and i and all(c.isalnum() or c in '-_' for c in i) for i in ids), '条目 ID 不正确'
    def walk(value):
        if isinstance(value, str): assert len(value) < 100000, '文字过长'
        elif isinstance(value, list):
            for v in value: walk(v)
        elif isinstance(value, dict):
            for v in value.values(): walk(v)
        else: assert value is None or isinstance(value,(bool,int,float)), '格式不支持'
    walk(data)
    for p in data['projects']:
        assert all(isinstance(p.get(k),str) for k in ['id','title','type','year','headline','description','problem','process','result','narration','link','cover','pdf']), '项目字段不完整'
        assert isinstance(p.get('slides'),list), '展示图片格式不正确'
        assert p.get('title','').strip(), '项目标题不能为空'
        assert not p.get('link') or p['link'].startswith(('https://','http://')), '项目链接需要 http 或 https'
        for path in [p.get('cover',''),p.get('pdf',''),*p.get('slides',[])]:
            assert not path or (path.startswith('assets/') and '..' not in path and '\\' not in path), '附件路径不正确'
    for e in data['experiences']:
        assert e.get('title','').strip(), '经历标题不能为空'
        assert all(isinstance(e.get(k),str) for k in ['title','date','company','description','highlight','narration']), '经历字段不完整'
        assert isinstance(e.get('tags'),list) and all(isinstance(t,str) for t in e['tags']), '标签格式不正确'
    if 'photos' in data:
        assert isinstance(data['photos'],list) and len(data['photos'])<=500, '照片数量或格式不正确'
        for photo in data['photos']:
            assert all(isinstance(photo.get(k),str) for k in ['id','src','caption']), '照片格式不正确'
            assert photo['src'].startswith('assets/') and '..' not in photo['src'] and '\\' not in photo['src'], '照片路径不正确'

class Handler(BaseHTTPRequestHandler):
    def allowed(self):
        return self.headers.get('Origin') in ORIGINS and self.headers.get('Host') in {f'127.0.0.1:{args.port}',f'localhost:{args.port}'}
    def reply(self, status, data):
        raw=json.dumps(data,ensure_ascii=False).encode()
        self.send_response(status)
        if self.allowed(): self.send_header('Access-Control-Allow-Origin',self.headers['Origin'])
        self.send_header('Vary','Origin')
        self.send_header('Cache-Control','no-store')
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(raw)))
        self.end_headers(); self.wfile.write(raw)
    def do_OPTIONS(self):
        if not self.allowed(): return self.reply(403,{'error':'仅允许本机管理页'})
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin',self.headers['Origin'])
        self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers','Content-Type, X-Admin-Token')
        self.end_headers()
    def do_GET(self):
        if not self.allowed(): return self.reply(403,{'error':'仅允许本机管理页'})
        if self.path == '/status': return self.reply(200,{'configured':AUTH.configured})
        if self.path != '/session': return self.reply(404,{})
        if not AUTH.valid(self.headers.get('X-Admin-Token','')): return self.reply(401,{'error':'请先输入管理员密码登录'})
        with LOCK: self.reply(200,{'revision':revision(),'content':json.loads((ROOT/'content.json').read_text(encoding='utf-8'))})
    def do_POST(self):
        if not self.allowed(): return self.reply(403,{'error':'仅允许本机管理页'})
        if self.path not in ['/login'] and not AUTH.valid(self.headers.get('X-Admin-Token','')): return self.reply(401,{'error':'登录已过期，请重新输入管理员密码'})
        if self.path == '/logout':
            AUTH.logout(self.headers.get('X-Admin-Token',''));return self.reply(200,{'ok':True})
        try:
            size=int(self.headers.get('Content-Length','0'))
            if not 0 < size <= (4096 if self.path in ['/login'] else 28*1024*1024): return self.reply(413,{'error':'文件太大，请控制在 20 MB 内'})
            data=json.loads(self.rfile.read(size))
            if self.path == '/login':
                return self.reply(200,{'token':AUTH.verify(data.get('password',''))})
            if self.path == '/upload':
                raw=base64.b64decode(data['base64'],validate=True)
                assert len(raw)<=20*1024*1024, '文件不能超过 20 MB'
                ext=None
                if raw.startswith(b'\x89PNG\r\n\x1a\n'): ext='png'
                elif raw.startswith(b'\xff\xd8\xff'): ext='jpg'
                elif raw[:4]==b'RIFF' and raw[8:12]==b'WEBP': ext='webp'
                elif raw.startswith(b'%PDF-'): ext='pdf'
                assert ext, '仅支持 JPG、PNG、WebP 和 PDF'
                folder=ROOT/'assets'/'uploads';folder.mkdir(parents=True,exist_ok=True)
                name=hashlib.sha256(raw).hexdigest()+'.'+ext
                (folder/name).write_bytes(raw)
                return self.reply(200,{'path':'assets/uploads/'+name})
            if self.path != '/save': return self.reply(404,{})
            content=data['content'];validate(content)
            with LOCK:
                if data.get('revision')!=revision(): return self.reply(409,{'error':'另一个窗口已保存修改，请导出当前草稿后刷新，避免覆盖'})
                backup=ROOT.parent/'drafts'/'content-history';backup.mkdir(parents=True,exist_ok=True)
                (backup/(str(time.time_ns())+'.json')).write_bytes((ROOT/'content.json').read_bytes())
                raw=json.dumps(content,ensure_ascii=False,indent=2)
                atomic(ROOT/'content.json',raw)
                atomic(ROOT/'content-data.js','window.PORTFOLIO_CONTENT = '+raw+';\n')
                self.reply(200,{'revision':revision()})
        except (ValueError,KeyError,AssertionError,TypeError) as e: self.reply(400,{'error':str(e) or '内容格式不正确'})
        except Exception: self.reply(500,{'error':'保存失败，请保留草稿后重试'})

print(f'Local authoring API on http://127.0.0.1:{args.port}',flush=True)
ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
