#!/bin/bash
set -e

echo "=== Easypanel Unlock Uninstall ==="

systemctl stop patch-easypanel 2>/dev/null || true
systemctl disable patch-easypanel 2>/dev/null || true
rm -f /etc/systemd/system/patch-easypanel.service
rm -f /root/patch-easypanel.sh
rm -f /etc/easypanel/patch.sh
rm -f /etc/easypanel/patch-backend.js
systemctl daemon-reload

echo "Restoring original entrypoint..."
docker service update easypanel --entrypoint "node" --args "backend.js start"

echo "=== Uninstalled ==="
