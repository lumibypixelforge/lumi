import urllib.request
import json
import os

def get_token():
    token = os.environ.get('SUPABASE_ACCESS_TOKEN', '')
    if not token and os.path.exists('.env.local'):
        with open('.env.local', 'r', encoding='utf-8') as f:
            for line in f:
                if line.startswith('SUPABASE_ACCESS_TOKEN='):
                    return line.strip().split('=', 1)[1]
    return token

url = 'https://api.supabase.com/v1/projects/lbgtrppdeydbhqolahcr/database/query'
headers = {'Authorization': f'Bearer {get_token()}', 'Content-Type': 'application/json'}

def run(q):
    req = urllib.request.Request(url, data=json.dumps({'query': q}).encode(), headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            print('Success (unexpected!):', resp.read().decode())
    except urllib.error.HTTPError as e:
        print('Expected Rejection:', e.read().decode())

print('Testing UPDATE on audit_log:')
run("UPDATE audit_log SET action = 'tampered' WHERE true;")

print('Testing DELETE on audit_log:')
run("DELETE FROM audit_log WHERE true;")
