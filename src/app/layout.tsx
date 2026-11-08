import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NATURAL_WB, PHOTO_FILTER_WB_ID } from "@/lib/image/photo-filter";

export const metadata: Metadata = {
  title: "Wedding Photobooth — Virtual Wedding Photobooth",
  description: "Photobooth dan guest book digital untuk hari istimewa.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const removeExtensionAttributes = (root) => {
                  const elements = root.querySelectorAll ? root.querySelectorAll("*") : [];
                  for (const element of [root, ...elements]) {
                    for (const attribute of [...element.attributes]) {
                      if (attribute.name === "bis_skin_checked" || attribute.name.startsWith("__processed_")) {
                        element.removeAttribute(attribute.name);
                      }
                    }
                  }
                };
                removeExtensionAttributes(document.documentElement);
                new MutationObserver((mutations) => {
                  for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                      if (node.nodeType === 1) removeExtensionAttributes(node);
                    }
                    if (mutation.type === "attributes" && mutation.target.nodeType === 1) {
                      removeExtensionAttributes(mutation.target);
                    }
                  }
                }).observe(document.documentElement, { subtree: true, childList: true, attributes: true });
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen" suppressHydrationWarning>
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
          <filter id={PHOTO_FILTER_WB_ID} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={`${NATURAL_WB[0]} 0 0 0 0  0 ${NATURAL_WB[1]} 0 0 0  0 0 ${NATURAL_WB[2]} 0 0  0 0 0 1 0`} />
          </filter>
        </svg>
        {children}
      </body>
    </html>
  );
}
