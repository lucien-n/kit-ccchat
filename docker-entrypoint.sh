#!/bin/sh
# Starts as root only to make the data dir writable, then hands the server off to
# an unprivileged user. The data dir is a bind mount, so its owner is whatever
# created it on the host - often root, because Docker makes a missing mount
# source as root, which an unprivileged process then cannot write.
set -e

mkdir -p "$DATA_DIR"

# If an operator pinned their own user (compose `user:`), we are not root and
# cannot chown; trust that they made the data dir writable and just run.
if [ "$(id -u)" = "0" ]; then
  chown -R node:node "$DATA_DIR"
  exec gosu node "$@"
fi

exec "$@"
