import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PuterAuthProvider } from "@/lib/puter-auth";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/builder/theme-provider";
import { BRAND } from "@/lib/brand";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: BRAND.fullName },
      { name: "description", content: BRAND.description },
      { name: "theme-color", content: "#efece6" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="th" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <PuterAuthProvider>
          <AuthProvider>
            <ThemeProvider>
              <TooltipProvider>
                <Outlet />
              </TooltipProvider>
            </ThemeProvider>
          </AuthProvider>
        </PuterAuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
