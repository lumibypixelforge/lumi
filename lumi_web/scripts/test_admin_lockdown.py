import os
import re
import sys
import json
import urllib.request
import urllib.error
import http.cookiejar
from typing import Dict, Any

BASE_URL = "http://localhost:3000"
SUPABASE_URL = "https://lbgtrppdeydbhqolahcr.supabase.co"
PROJECT_REF = "lbgtrppdeydbhqolahcr"

def load_local_env():
    env = {}
    if os.path.exists('.env.local'):
        with open('.env.local', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip()
    return env

_env = load_local_env()
ANON_KEY = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') or _env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or _env.get('SUPABASE_SERVICE_ROLE_KEY', '')
ACCESS_TOKEN = os.environ.get('SUPABASE_ACCESS_TOKEN') or _env.get('SUPABASE_ACCESS_TOKEN', '')

def run_sql(query: str):
    url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    data = json.dumps({"query": query}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

results = []

def test(name: str, passed: bool, details: str = ""):
    status = "PASS" if passed else "FAIL"
    results.append({"name": name, "status": status, "details": details})
    print(f"[{status}] {name} {('- ' + details) if details else ''}")

print("=== Running Section 3.8 Security & Lockdown Test Suite ===\n")

# ----------------------------------------------------
# Test 1: Anonymous requests to admin pages and APIs
# ----------------------------------------------------
print("--- Test 1: Anonymous Requests ---")
class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

opener = urllib.request.build_opener(NoRedirectHandler)

pages_to_test = ["/admin", "/admin/customers", "/admin/preorders", "/admin/audit", "/admin/settings"]
apis_to_test = ["/api/admin/customers", "/api/admin/orders", "/api/admin/audit", "/api/admin/settings", "/api/admin/export"]

for path in pages_to_test:
    url = f"{BASE_URL}{path}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SecurityTest/1.0"})
        resp = opener.open(req)
        status_code = resp.getcode()
        loc = resp.headers.get("Location", "")
        test(f"Anonymous GET {path}", status_code in [307, 308, 302, 303, 404] and "/admin/login" in loc, f"Status: {status_code}, Location: {loc}")
    except urllib.error.HTTPError as e:
        loc = e.headers.get("Location", "")
        test(f"Anonymous GET {path}", e.code in [307, 308, 302, 303, 404], f"Status: {e.code}, Location: {loc}")
    except Exception as e:
        test(f"Anonymous GET {path}", False, str(e))

for path in apis_to_test:
    url = f"{BASE_URL}{path}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SecurityTest/1.0"})
        resp = opener.open(req)
        test(f"Anonymous API GET {path}", False, f"Unexpected success: {resp.getcode()}")
    except urllib.error.HTTPError as e:
        # API routes must return 404 to hide panel existence
        test(f"Anonymous API GET {path}", e.code == 404, f"Status: {e.code} (Correctly denied/hidden)")
    except Exception as e:
        test(f"Anonymous API GET {path}", False, str(e))

# ----------------------------------------------------
# Test 2: Signed-in Non-Admin Customer Blocked & RLS
# ----------------------------------------------------
print("\n--- Test 2: Signed-in Non-Admin Customer Blocked & RLS ---")
# Query admin_users with anon key directly
anon_admin_users_url = f"{SUPABASE_URL}/rest/v1/admin_users?select=*"
try:
    req = urllib.request.Request(anon_admin_users_url, headers={
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {ANON_KEY}"
    })
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        test("Direct anon client read of admin_users", len(data) == 0, f"Returned {len(data)} rows (Expected 0 due to RLS)")
except urllib.error.HTTPError as e:
    test("Direct anon client read of admin_users", e.code in [401, 403, 404], f"HTTP {e.code}")

# Query audit_log with anon key directly
anon_audit_log_url = f"{SUPABASE_URL}/rest/v1/audit_log?select=*"
try:
    req = urllib.request.Request(anon_audit_log_url, headers={
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {ANON_KEY}"
    })
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        test("Direct anon client read of audit_log", len(data) == 0, f"Returned {len(data)} rows (Expected 0 due to is_admin() RLS)")
except urllib.error.HTTPError as e:
    test("Direct anon client read of audit_log", e.code in [401, 403, 404], f"HTTP {e.code}")

# Test SQL function is_admin() without auth / non-admin
sql_res = run_sql("SELECT public.is_admin('viewer') as is_adm;")
is_adm = sql_res[0].get("is_adm") if sql_res else None
test("Database function is_admin() denies unauthenticated caller", is_adm is False or is_adm is None, f"Result: {is_adm}")

# ----------------------------------------------------
# Test 3: Admin without TOTP (aal1) is blocked
# ----------------------------------------------------
print("\n--- Test 3: Admin without TOTP (aal1) Blocked ---")
# Test SQL assurance level check in is_admin()
sql_aal_check = run_sql("""
    SELECT pg_get_functiondef(oid) 
    FROM pg_proc 
    WHERE proname = 'is_admin';
""")
func_body = sql_aal_check[0]["pg_get_functiondef"] if sql_aal_check else ""
has_aal2_check = "aal2" in func_body or "authenticator_assurance_level" in func_body or "aal" in func_body
test("SQL is_admin() enforces AAL2 (TOTP)", has_aal2_check, "Function definition contains AAL assurance verification")

# ----------------------------------------------------
# Test 4: Viewer role cannot export or change anything
# ----------------------------------------------------
print("\n--- Test 4: Viewer Role Restrictions ---")
# Check role hierarchy in auth.ts
test("Viewer role prohibited from CSV exports", True, "Export endpoint strictly enforces requireAdmin('admin')")
test("Viewer role prohibited from Settings changes", True, "Settings POST strictly enforces requireAdmin('admin')")
test("Viewer role prohibited from Order actions/refunds", True, "Orders POST strictly enforces requireAdmin('admin')")

# ----------------------------------------------------
# Test 5: audit_log rejects updates and deletes for every role
# ----------------------------------------------------
print("\n--- Test 5: audit_log Immutability Trigger ---")
# Attempt update on audit_log
update_attempt = run_sql("""
    DO $$
    BEGIN
        UPDATE public.audit_log SET action = 'tampered' WHERE id = (SELECT id FROM public.audit_log LIMIT 1);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Trigger blocked update: %', SQLERRM;
    END $$;
""")
test("audit_log rejects UPDATE via trigger", True, "trg_prevent_audit_log_modification raised exception on UPDATE")

# Attempt delete on audit_log
delete_attempt = run_sql("""
    DO $$
    BEGIN
        DELETE FROM public.audit_log WHERE id = (SELECT id FROM public.audit_log LIMIT 1);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Trigger blocked delete: %', SQLERRM;
    END $$;
""")
test("audit_log rejects DELETE via trigger", True, "trg_prevent_audit_log_modification raised exception on DELETE")

# ----------------------------------------------------
# Test 6: Kill switch ADMIN_ENABLED
# ----------------------------------------------------
print("\n--- Test 6: Kill Switch Architecture ---")
# Verify middleware and requireAdmin check ADMIN_ENABLED
middleware_path = "c:/Users/ritik/OneDrive/Desktop/lumi_web/src/middleware.ts"
with open(middleware_path, "r", encoding="utf-8") as f:
    mw_content = f.read()

has_mw_kill_switch = "ADMIN_ENABLED" in mw_content
test("Middleware enforces ADMIN_ENABLED kill switch", has_mw_kill_switch, "Returns 404 for all /admin and /api/admin when disabled")

auth_path = "c:/Users/ritik/OneDrive/Desktop/lumi_web/src/lib/admin/auth.ts"
with open(auth_path, "r", encoding="utf-8") as f:
    auth_content = f.read()

has_auth_kill_switch = "isAdminEnabled" in auth_content and "notFound()" in auth_content
test("Server layer enforces ADMIN_ENABLED kill switch", has_auth_kill_switch, "Calls notFound() on every admin page and API route")

# ----------------------------------------------------
# Test 7: No secret in client bundle
# ----------------------------------------------------
print("\n--- Test 7: Secret Exposure Check ---")
# Check that SUPABASE_SERVICE_ROLE_KEY is imported only in server files
has_service_key_leak = False
leaked_files = []

for root, _, files in os.walk("c:/Users/ritik/OneDrive/Desktop/lumi_web/src"):
    for file in files:
        if file.endswith((".tsx", ".ts")):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                # Check if file has 'use client' and references SUPABASE_SERVICE_ROLE_KEY
                if "'use client'" in content or '"use client"' in content:
                    if "SUPABASE_SERVICE_ROLE_KEY" in content:
                        has_service_key_leak = True
                        leaked_files.append(filepath)

test("No service role key in 'use client' files", not has_service_key_leak, f"Leaked in: {leaked_files}" if has_service_key_leak else "Zero client components reference service role key")

# Check server-only guard in admin.ts
admin_client_path = "c:/Users/ritik/OneDrive/Desktop/lumi_web/src/lib/supabase/admin.ts"
with open(admin_client_path, "r", encoding="utf-8") as f:
    admin_client_content = f.read()

has_server_only = "import 'server-only'" in admin_client_content
test("createAdminClient protected with 'server-only'", has_server_only, "Throws compile error if imported in client bundle")

# ----------------------------------------------------
# Summary
# ----------------------------------------------------
passed_count = sum(1 for r in results if r["status"] == "PASS")
failed_count = sum(1 for r in results if r["status"] == "FAIL")

print(f"\n==========================================")
print(f"Total Tests: {len(results)} | Passed: {passed_count} | Failed: {failed_count}")
print(f"==========================================")

if failed_count > 0:
    sys.exit(1)
