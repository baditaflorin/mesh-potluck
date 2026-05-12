import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-potluck",
  description: "Who's bringing what — live de-dupe so you don't end up with 6 salads",
  accentHex: "#e08a3c",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
