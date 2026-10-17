import urllib.request
import urllib.parse
import http.cookiejar
import json
import base64
import hashlib
import hmac
import time
import struct

def base32_decode(s):
    alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    bits = ''
    for c in s.upper():
        val = alphabet.find(c)
        if val >= 0:
            bits += f'{val:05b}'
    bytes_arr = bytearray()
    for i in range(0, len(bits) - 7, 8):
        bytes_arr.append(int(bits[i:i+8], 2))
    return bytes(bytes_arr)

def get_totp(secret):
    key = base32_decode(secret)
    counter = struct.pack('>Q', int(time.time() // 30))
    mac = hmac.new(key, counter, hashlib.sha1).digest()
    offset = mac[-1] & 0x0f
    binary = struct.unpack('>I', mac[offset:offset+4])[0] & 0x7fffffff
    return f'{binary % 1000000:06d}'

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# 1. Login
login_url = "http://localhost:3000/api/admin/auth/login"
data = json.dumps({
    "email": "lumibypixelforge@gmail.com",
    "password": "AdminPassword123!"
}).encode()

req = urllib.request.Request(login_url, data=data, headers={"Content-Type": "application/json"})
resp = opener.open(req)
login_res = json.loads(resp.read().decode())
print("Login result:", json.dumps({k: v for k, v in login_res.items() if k != 'qrCode'}, indent=2))

factor_id = login_res.get("factorId")
secret = login_res.get("secret", "5DY3HR7SKU6FFINVHQBOWJCGXN2L7IQ4")
totp_code = get_totp(secret)
print(f"Generated TOTP code: {totp_code} for factor {factor_id}")

# 2. Verify MFA
verify_url = "http://localhost:3000/api/admin/auth/verify-mfa"
vdata = json.dumps({
    "factorId": factor_id,
    "code": totp_code,
    "email": "lumibypixelforge@gmail.com"
}).encode()

vreq = urllib.request.Request(verify_url, data=vdata, headers={"Content-Type": "application/json"})
vresp = opener.open(vreq)
print("MFA Verify result:", vresp.read().decode())

# Print all cookies
cookie_list = []
for c in cj:
    cookie_list.append({
        "name": c.name,
        "value": c.value,
        "domain": "localhost",
        "path": c.path or "/"
    })

with open("scripts/admin_cookies.json", "w", encoding="utf-8") as f:
    json.dump(cookie_list, f, indent=2)

print(f"Saved {len(cookie_list)} authenticated cookies to scripts/admin_cookies.json")
