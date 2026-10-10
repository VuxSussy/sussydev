"""Run a Python file inside the open Blender (Blender MCP addon listening on localhost:9876).

Usage: python3 scripts/blender/send-to-blender.py scripts/blender/build-sussy.py
Without the addon running, use Blender headless instead:
  /Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/blender/build-sussy.py
"""
import json
import socket
import sys

code = open(sys.argv[1]).read()
sock = socket.create_connection(("127.0.0.1", 9876), timeout=600)
sock.sendall(json.dumps({"type": "execute_code", "params": {"code": code}}).encode())
buffer = b""
while True:
    chunk = sock.recv(65536)
    if not chunk:
        break
    buffer += chunk
    try:
        response = json.loads(buffer)
        break
    except ValueError:
        continue
print(response.get("result", {}).get("result", response))
