const fs = require("fs");
let code = fs.readFileSync("/app/backend.js", "utf-8");
let patches = 0;

const fake = '({valid:!0,meta:{product_id:108143},license_key:"patched"})';
const portalFake = '({plan:{options:{advanced_monitoring:!0,notifications:!0,branding:!0,mutiple_users:!0,access_control:!0,cluster:!0}}})';

// Patch 1: Unlimited projects (removes 3-project limit on free plan)
const projectLimit = "return e?.valid||t?!0:r.length<3}";
if (code.includes(projectLimit)) {
  code = code.replace(projectLimit, "return!0}");
  patches++;
  console.log("[patch] Removed project limit");
}

// Patch 2: Inject fake licensePayload on lemonLicenseManager at init time
// The minified code does: global.lemonLicenseManager=<varName>
// We append a property assignment so ALL downstream reads (ng(), Is.licensePayload, etc.) get the fake value
// This is version-safe because "global.lemonLicenseManager" is a real property name, never minified
const lemonInitRegex = /global\.lemonLicenseManager=(\w+)/;
const lemonMatch = code.match(lemonInitRegex);
if (lemonMatch) {
  const varName = lemonMatch[1];
  code = code.replace(
    lemonMatch[0],
    `global.lemonLicenseManager=${varName};${varName}.licensePayload=${fake}`
  );
  patches++;
  console.log("[patch] Injected fake licensePayload on lemonLicenseManager (var: " + varName + ")");
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
const portalHandler = "getLicensePayload:xt.query(async()=>br())";
if (code.includes(portalHandler)) {
  code = code.replace(portalHandler, "getLicensePayload:xt.query(async()=>" + portalFake + ")");
  patches++;
  console.log("[patch] Faked portal tRPC getLicensePayload response");
}

// Patch 5: Remove white-labeling license checks in branding routes (4 mutations)
// setErrorPageSettings, setLogoSettings, setCustomCodeSettings, setLinksSettings
const whitelabelThrow = 'throw new se({code:"BAD_REQUEST",message:"You need a license that supports white-labeling."})';
if (code.includes(whitelabelThrow)) {
  const count = code.split(whitelabelThrow).length - 1;
  code = code.replaceAll(whitelabelThrow, "void 0");
  patches++;
  console.log("[patch] Removed " + count + " white-labeling license checks");
}

// Patch 6: Remove custom service domain license check
const customDomainThrow = 'throw new se({code:"BAD_REQUEST",message:"Custom service domain feature requires a valid license"})';
if (code.includes(customDomainThrow)) {
  code = code.replaceAll(customDomainThrow, "void 0");
  patches++;
  console.log("[patch] Removed custom service domain license check");
}

fs.writeFileSync("/app/backend.js", code);
console.log("[patch] Done. Applied " + patches + " patches.");
