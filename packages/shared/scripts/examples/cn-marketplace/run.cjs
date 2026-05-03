// eslint-disable-next-line turbo/no-undeclared-env-vars
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: "CommonJS",
  moduleResolution: "Node",
});

require("ts-node/register/transpile-only");
require("./init.ts");
