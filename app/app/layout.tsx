import type { Metadata } from "next";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notes",
  description: "Example service from the project template",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <Theme appearance="light" accentColor="teal" grayColor="sand" radius="medium">
          {children}
        </Theme>
      </body>
    </html>
  );
}
