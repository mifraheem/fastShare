import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default [
  // src/components/wensity: vendored Wensity UI components (MIT), kept close to upstream
  { ignores: [".next", "next-env.d.ts", "src/components/wensity/**"] },
  ...nextVitals,
  ...nextTs,
  { rules: { "@typescript-eslint/no-unused-vars": "off" } },
];
