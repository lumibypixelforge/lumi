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

def query(sql):
    req = urllib.request.Request(url, data=json.dumps({'query': sql}).encode(), headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print("HTTP Error:", e.code, e.read().decode())
        raise

print("Audit log:")
print(json.dumps(query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 5;'), indent=2))

print("\nPreorders:")
print(json.dumps(query('SELECT * FROM preorders;'), indent=2))

print("\nPayments:")
print(json.dumps(query('SELECT * FROM payments;'), indent=2))

print("\nTables:")
print(json.dumps(query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"), indent=2))

print("\nProfiles:")
print(json.dumps(query('SELECT id, email, full_name FROM profiles;'), indent=2))

print("\nAuth Users:")
print(json.dumps(query('SELECT id, email FROM auth.users;'), indent=2))
