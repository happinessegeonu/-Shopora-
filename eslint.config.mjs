import nextVitals from "eslint-config-next/core-web-vitals";
export default [
 { ignores: [".next/**", "node_modules/**", "mobile-*/**", "artifacts/**"] },
 ...nextVitals,
 { rules: {
   // Normal document navigations intentionally re-check HttpOnly sessions.
   "@next/next/no-html-link-for-pages": "off",
   // Initial form/session setup and loading flags are intentional effects.
   "react-hooks/set-state-in-effect": "off",
 } },
];
