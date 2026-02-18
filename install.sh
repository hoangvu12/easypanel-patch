#!/bin/bash
set -e

REPO="https://raw.githubusercontent.com/hoangvu12/easypanel-patch/main"

echo "=== Easypanel Full Unlock ==="

# Step 1: Download patcher script
curl -fsSL "$REPO/patch-backend.js" -o /etc/easypanel/patch-backend.js
echo "[1/6] Downloaded patch-backend.js"

# Step 2: Create wrapper entrypoint
printf '#!/bin/sh\nnode /etc/easypanel/patch-backend.js\nexec node backend.js "$@"\n' > /etc/easypanel/patch.sh
chmod +x /etc/easypanel/patch.sh
echo "[2/6] Created patch.sh"

# Step 3: Create watcher script (re-applies entrypoint after self-updates)
cat > /root/patch-easypanel.sh << 'SCRIPT'
#!/bin/bash
sleep 15
CURRENT=$(docker service inspect easypanel --format '{{.Spec.TaskTemplate.ContainerSpec.Command}}')
if echo "$CURRENT" | grep -q "patch.sh"; then
  echo "Entrypoint already patched"
  exit 0
fi
echo "Re-applying patched entrypoint..."
docker service update easypanel --entrypoint "/etc/easypanel/patch.sh" --args "start"
SCRIPT
chmod +x /root/patch-easypanel.sh
echo "[3/6] Created watcher script"

# Step 4: Create systemd service (auto-patches on every Easypanel update)
cat > /etc/systemd/system/patch-easypanel.service << 'EOF'
[Unit]
Description=Auto-patch Easypanel entrypoint on container start
After=docker.service
Requires=docker.service

[Service]
Type=simple
ExecStart=/bin/bash -c 'docker events --filter "image=easypanel/easypanel" --filter "event=start" --format "{{.ID}}" | while read id; do sleep 10 && echo "Easypanel started, checking patch..." && /root/patch-easypanel.sh; done'
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
echo "[4/6] Created systemd service"

# Step 5: Enable and start watcher
systemctl daemon-reload
systemctl enable patch-easypanel
systemctl restart patch-easypanel
echo "[5/6] Enabled systemd watcher"

# Step 6: Apply patch now
echo "[6/6] Applying patch (panel will restart in ~15s)..."
docker service update easypanel \
  --entrypoint "/etc/easypanel/patch.sh" \
  --args "start" \
  --force

echo ""
echo "=== Done! ==="
echo "Wait ~15 seconds, then check:"
echo '  docker logs $(docker ps --filter "name=easypanel.1" --format "{{.ID}}" | head -1) 2>&1 | head -10'
