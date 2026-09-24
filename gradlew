#!/usr/bin/env bash

set -e

if command -v gradle >/dev/null 2>&1; then
  exec gradle "$@"
else
  echo "Gradle is not installed or not on PATH."
  echo "Install Gradle or use Android Studio's bundled Gradle." 
  exit 1
fi
