#!/bin/sh
# GitHub Pages 배포: 앱 화면은 GitHub, 비공개 문항·학습 기록은 Render API(로그인)에서 가져온다.
set -e
cd "$(dirname "$0")/.."
VITE_API_BASE=https://pmp-prep-d1iu.onrender.com npm run build
cd dist
touch .nojekyll
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -q -m "deploy $(date '+%Y-%m-%d %H:%M')"
git push -q -f "$(git -C .. remote get-url origin)" gh-pages
rm -rf .git
echo "배포 완료: https://sson82.github.io/pmp-prep/"
