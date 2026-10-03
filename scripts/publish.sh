#!/bin/sh
# 최초 1회: GitHub 공개 저장소 생성 → 코드 push → gh-pages 배포 → Pages 활성화
# git이 macOS 키체인에 저장해 둔 GitHub 로그인(repo 권한)을 그대로 사용한다.
set -e
cd "$(dirname "$0")/.."
REPO=pmp-prep
TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential-osxkeychain get | sed -n 's/^password=//p')
API=https://api.github.com
auth="Authorization: Bearer $TOKEN"

USER=$(curl -s -H "$auth" $API/user | python3 -c 'import sys,json;print(json.load(sys.stdin)["login"])')
code=$(curl -s -o /dev/null -w '%{http_code}' -H "$auth" $API/repos/$USER/$REPO)
if [ "$code" = 404 ]; then
  curl -s -H "$auth" -X POST $API/user/repos \
    -d "{\"name\":\"$REPO\",\"description\":\"PMP 기출 유형 반복 학습 (PMBOK 8판, 간격 반복, 오답노트)\",\"private\":false}" >/dev/null
  echo "저장소 생성: https://github.com/$USER/$REPO"
fi
git remote get-url origin >/dev/null 2>&1 || git remote add origin https://github.com/$USER/$REPO.git
git push -q -u origin main
npm run deploy
curl -s -H "$auth" -X POST $API/repos/$USER/$REPO/pages -d '{"source":{"branch":"gh-pages","path":"/"}}' >/dev/null || true
echo "완료. 1~2분 뒤 열림: https://$USER.github.io/$REPO/"
