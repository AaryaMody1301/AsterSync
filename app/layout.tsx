import type { Metadata } from "next";
import { Header, Footer } from "@/components/site-shell";
import "./globals.css";
export const metadata: Metadata = {metadataBase:new URL("https://astersync.project-keys-0949.chatgpt.site"),title:{default:"AsterSync — Software that makes work flow.",template:"%s | AsterSync"},description:"AsterSync is an independent technology studio in Surat. Websites, business applications, automation, and data reporting built around your business.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><head><link rel="preload" href="/manrope.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/></head><body><a href="#main" className="skip-link">Skip to content</a><Header/>{children}<Footer/></body></html>}
