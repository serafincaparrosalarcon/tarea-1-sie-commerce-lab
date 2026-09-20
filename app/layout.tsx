import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Commerce Lab | Prototipo académico",description:"Canal digital de venta con catálogo, carrito, pago simulado, pedidos y trazabilidad.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="es"><body>{children}</body></html>}
