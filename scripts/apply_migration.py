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
headers = {
    'Authorization': f'Bearer {get_token()}',
    'Content-Type': 'application/json'
}

with open('supabase/migrations/002_admin_lockdown.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

print("Applying migration...")
req = urllib.request.Request(url, data=json.dumps({'query': sql}).encode(), headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read().decode())
        print("Migration applied successfully!")
        print(result)
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.read().decode())
