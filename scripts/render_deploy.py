"""Render 수동 배포 트리거 + 완료 대기. private/.env의 RENDER_API_KEY, private/.render-service 사용.
  python3 scripts/render_deploy.py
"""
import json, time, urllib.request

env = dict(l.split('=', 1) for l in open('private/.env').read().splitlines() if '=' in l)
sid = open('private/.render-service').read().strip()
H = {"Authorization": "Bearer " + env["RENDER_API_KEY"], "Content-Type": "application/json", "Accept": "application/json"}


def call(url, data=None, method="GET"):
    req = urllib.request.Request(url, data=data, headers=H, method=method)
    return json.loads(urllib.request.urlopen(req).read().decode(), strict=False)


d = call(f"https://api.render.com/v1/services/{sid}/deploys", b'{"clearCache":"do_not_clear"}', "POST")
print("deploy", d["id"], d.get("commit", {}).get("id", "")[:7])
for _ in range(90):
    st = call(f"https://api.render.com/v1/services/{sid}/deploys/{d['id']}")["status"]
    if st in ("live", "build_failed", "update_failed", "canceled", "deactivated"):
        break
    time.sleep(10)
print("status", st)
