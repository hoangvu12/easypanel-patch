# Easypanel Full Unlock

Fully unlocks all Easypanel Pro features on a self-hosted instance. Server-side only — no browser extensions needed.

**What gets unlocked:**

- Unlimited projects (removes 3-project limit)
- Advanced monitoring charts
- Multi-user support
- Branding customization
- Notifications
- Access control
- Cluster features
- Custom service domains
- Hides "Buy License" button

> **Safe**: This only restarts the Easypanel panel UI — all your running services/containers are unaffected.

## Install

SSH into your server as root, then run:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/hoangvu12/easypanel-patch/main/install.sh)
```

Wait ~15 seconds for the panel to restart, then refresh the page.

## Verify

Check the container logs:

```bash
docker logs $(docker ps --filter "name=easypanel.1" --format "{{.ID}}" | head -1) 2>&1 | head -10
```

Expected output:

```
[patch] Removed project limit
[patch] Faked lemonLicenseManager.licensePayload reads
[patch] Faked lemon tRPC getLicensePayload response
[patch] Faked portal tRPC getLicensePayload response
[patch] Done. Applied 4 patches.
```

## How it works

A wrapper script in `/etc/easypanel/` (bind-mounted into the container) patches `backend.js` at every container startup:

1. **Removes the project creation limit** — `canCreateProject` always returns `true`
2. **Fakes `lemonLicenseManager.licensePayload` reads** — all server-side `portalCheck || lemonCheck` gates pass
3. **Fakes the lemon tRPC response** — client receives a valid Business license
4. **Fakes the portal tRPC response** — client receives all plan options enabled

A systemd watcher service ensures the patch survives Easypanel self-updates.

## Tested on

- Easypanel v2.26.3

## Uninstall

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/hoangvu12/easypanel-patch/main/uninstall.sh)
```

## Troubleshooting

Check if entrypoint is patched:

```bash
docker service inspect easypanel --format '{{.Spec.TaskTemplate.ContainerSpec.Command}}'
# Should show: [/etc/easypanel/patch.sh]
```

Check systemd watcher:

```bash
systemctl status patch-easypanel
```

Force re-apply the patch:

```bash
docker service update easypanel --force
```
