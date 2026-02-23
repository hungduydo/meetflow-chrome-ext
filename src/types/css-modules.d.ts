// src/types/css-modules.d.ts
// Tells TypeScript that *.module.css files export a string-keyed class map.
declare module "*.module.css" {
    const styles: { readonly [className: string]: string };
    export default styles;
}
