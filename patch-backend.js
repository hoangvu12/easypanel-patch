const fs = require("fs");
let code = fs.readFileSync("/app/backend.js", "utf-8");
let patches = 0;

// Patch 1: Unlimited projects (removes 3-project limit on free plan)
const projectLimit = "return e?.valid||t?!0:r.length<3}";
if (code.includes(projectLimit)) {
  code = code.replace(projectLimit, "return!0}");
  patches++;
  console.log("[patch] Removed project limit");
}

// Patch 2: Fake lemonLicenseManager.licensePayload on all property reads
// Negative lookahead (?!=(?![=])) ensures we only patch reads, not assignments
// This makes ALL server-side license checks pass since they use portalCheck || lemonCheck
const fake = '({valid:!0,meta:{product_id:108143},license_key:"patched"})';
const before2 = code.length;
code = code.replace(/lemonLicenseManager\.licensePayload(?!=(?![=]))/g, fake);
if (code.length !== before2) {
  patches++;
  console.log("[patch] Faked lemonLicenseManager.licensePayload reads");
}

// Patch 3: Fake the lemon tRPC getLicensePayload response
// The handler returns ({...await ng(),license_key:void 0}) — replace with our fake
const lemonHandler = "({...await ng(),license_key:void 0})";
if (code.includes(lemonHandler)) {
  code = code.replace(lemonHandler, fake);
  patches++;
  console.log("[patch] Faked lemon tRPC getLicensePayload response");
}

// Patch 4: Fake the portal tRPC getLicensePayload response
// The handler returns br() — replace with fake portal license with all options enabled
const portalFake = '({plan:{options:{advanced_monitoring:!0,notifications:!0,branding:!0,mutiple_users:!0,access_control:!0,cluster:!0}}})';
const portalHandler = "getLicensePayload:xt.query(async()=>br())";
if (code.includes(portalHandler)) {
  code = code.replace(portalHandler, "getLicensePayload:xt.query(async()=>" + portalFake + ")");
  patches++;
  console.log("[patch] Faked portal tRPC getLicensePayload response");
}

fs.writeFileSync("/app/backend.js", code);
console.log("[patch] Done. Applied " + patches + " patches.");
