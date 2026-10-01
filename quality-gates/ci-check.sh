#!/usr/bin/env bash
set -euo pipefail

kit_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(cd "${kit_dir}/.." && pwd)"

npm test --prefix "${kit_dir}"
node "${kit_dir}/bin/check-docs.mjs" "${repo_dir}"
node "${kit_dir}/bin/check-boundaries.mjs" "${repo_dir}"
node "${kit_dir}/bin/check-unit-tests.mjs" "${repo_dir}"
