#!/usr/bin/env bash
# GitHub Pages için statik derleme üretir (out/ dizini).
#
# Kullanım:
#   bash scripts/build-pages.sh                 # depo adıyla basePath (otomatik)
#   PAGES_BASE_PATH="" bash scripts/build-pages.sh      # kullanıcı sayfası (user.github.io)
#   SKIP_FETCH=1 bash scripts/build-pages.sh            # ilan verisini yeniden çekmeden derle
#
# Not: Statik dışa aktarımda API uçları kullanılamaz; bu yüzden src/app/api dizini
# derleme süresince geçici olarak taşınır ve işlem bitince geri konur.
set -euo pipefail

cd "$(dirname "$0")/.."

# basePath verilmediyse GitHub depo adından türet (Actions ortamında otomatik çalışır)
if [[ -z "${PAGES_BASE_PATH+x}" ]]; then
  if [[ -n "${GITHUB_REPOSITORY:-}" ]]; then
    REPO_NAME="${GITHUB_REPOSITORY##*/}"
    # "<kullanici>.github.io" depoları kök alan adında yayınlanır → basePath boş
    if [[ "${REPO_NAME,,}" == *.github.io ]]; then
      PAGES_BASE_PATH=""
    else
      PAGES_BASE_PATH="/${REPO_NAME}"
    fi
  else
    PAGES_BASE_PATH=""
  fi
fi

export DEPLOY_TARGET="github-pages"
export PAGES_BASE_PATH
export NEXT_PUBLIC_BASE_PATH="${PAGES_BASE_PATH}"
export NEXT_TELEMETRY_DISABLED=1

echo "→ GitHub Pages derlemesi (basePath='${PAGES_BASE_PATH}')"

# 1) İlan verisini üret (CI dışında da çalışır; ağ yoksa örnek veri yazılır)
if [[ "${SKIP_FETCH:-0}" != "1" ]]; then
  echo "→ İlan verisi çekiliyor…"
  npx tsx scripts/fetch-ilanlar.ts || echo "  (veri çekilemedi, mevcut/örnek veriyle devam ediliyor)"
fi

# 2) API uçlarını geçici olarak devre dışı bırak
API_DIR="src/app/api"
TMP_DIR=".pages-api-backup"
cleanup() {
  if [[ -d "${TMP_DIR}" ]]; then
    rm -rf "${API_DIR}" 2>/dev/null || true
    mv "${TMP_DIR}" "${API_DIR}"
    echo "→ API uçları geri yüklendi"
  fi
}
trap cleanup EXIT

if [[ -d "${API_DIR}" ]]; then
  rm -rf "${TMP_DIR}"
  mv "${API_DIR}" "${TMP_DIR}"
fi

# 3) Statik derleme
echo "→ next build (output: export)"
npx next build

# 4) GitHub Pages'in alt çizgiyle başlayan dosyaları işlemesini engelle
touch out/.nojekyll

echo "✓ Tamam: out/ dizini hazır ($(find out -type f | wc -l | tr -d ' ') dosya)"
echo "  Yerelde denemek için: npx serve out"
