import type { Metadata } from "next";
import "@/src/styles/app.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Orizino Admin Panel",
  description: "Orizino enterprise management & control panel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en" className="dark" style={{ backgroundColor: "#0a0a0a", colorScheme: "dark" }}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){if(typeof Node!=='undefined'&&Node.prototype){var origRemoveChild=Node.prototype.removeChild;Node.prototype.removeChild=function(child){if(child.parentNode!==this){if(child.parentNode){return child.parentNode.removeChild(child);}return child;}return origRemoveChild.call(this,child);};var origInsertBefore=Node.prototype.insertBefore;Node.prototype.insertBefore=function(newNode,refNode){if(refNode&&refNode.parentNode!==this){if(refNode.parentNode){return refNode.parentNode.insertBefore(newNode,refNode);}return this.appendChild(newNode);}return origInsertBefore.call(this,newNode,refNode);};}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning className="bg-background text-foreground antialiased selection:bg-primary/20">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
