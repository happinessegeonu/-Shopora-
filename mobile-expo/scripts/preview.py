"""Loopback-only preview of the exported React Native web bundle.
Uses the live Shopora public API; user checkout requests create real orders.
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
import mimetypes

ROOT = Path(__file__).resolve().parents[1] / 'dist'
SITE = 'https://shopora-amber.vercel.app'
LOCAL = 'http://localhost:8083'

class Preview(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def relay(self):
        path = urlsplit(self.path).path
        allowed = path in ('/api/mobile/config', '/api/orders') or path.startswith('/products/')
        if not allowed or (self.command == 'POST' and path != '/api/orders'):
            self.send_error(404)
            return
        headers = {}
        for name in ('Authorization', 'Content-Type'):
            if self.headers.get(name):
                headers[name] = self.headers[name]
        body = None
        if self.command == 'POST':
            length = int(self.headers.get('Content-Length', 0))
            if length > 100000:
                self.send_error(413)
                return
            body = self.rfile.read(length)
        try:
            try:
                response = urlopen(Request(SITE + self.path, data=body, headers=headers, method=self.command), timeout=25)
            except HTTPError as error:
                response = error
            with response:
                content = response.read()
                self.send_response(response.status)
                self.send_header('Content-Type', response.headers.get('Content-Type', 'application/octet-stream'))
                self.send_header('Cache-Control', 'no-store')
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                self.wfile.write(content)
        except (URLError, TimeoutError):
            self.send_error(502, 'Could not reach Shopora. Please retry.')

    def do_POST(self):
        self.relay()

    def do_GET(self):
        request_path = urlsplit(self.path).path
        if request_path == '/sell':
            self.send_response(302)
            self.send_header('Location', SITE + '/sell')
            self.end_headers()
            return
        if request_path.startswith(('/api/', '/products/')):
            self.relay()
            return
        file = (ROOT / request_path.lstrip('/')).resolve()
        if not file.is_relative_to(ROOT.resolve()):
            self.send_error(403)
            return
        if not file.is_file():
            if file.suffix:
                self.send_error(404)
                return
            file = ROOT / 'index.html'
        content = file.read_bytes()
        if file.suffix == '.js':
            content = content.replace(SITE.encode(), LOCAL.encode())
        self.send_response(200)
        self.send_header('Content-Type', mimetypes.guess_type(file)[0] or 'application/octet-stream')
        self.send_header('Content-Length', str(len(content)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(content)

if __name__ == '__main__':
    print('Shopora React Native preview: ' + LOCAL, flush=True)
    print('Uses the live Shopora catalogue. Checkout submits real orders.', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8083), Preview).serve_forever()
