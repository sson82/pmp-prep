#!/bin/sh
# dist/를 gh-pages 브랜치로 push → GitHub Pages가 자동 반영 (1~2분)
set -e
cd dist
touch .nojekyll
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -q -m "deploy $(date '+%Y-%m-%d %H:%M')"
git push -q -f "$(git -C .. remote get-url origin)" gh-pages
rm -rf .git
echo "배포 완료: https://sson82.github.io/pmp-prep/"
