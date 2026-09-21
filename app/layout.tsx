import type { Metadata } from "next";
import "./globals.css";
import "./sensoria.css";
export const metadata:Metadata={title:"Sensoria | Bienestar sensorial",description:"Instrumentos de bienestar visual, táctil y sonoro pensados para la relajación adulta.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="es"><body>{children}</body></html>}
