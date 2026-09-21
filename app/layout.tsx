import type { Metadata } from "next";
import "./globals.css";
import "./sensoria.css";
export const metadata:Metadata={title:{default:"Sensoria | Bienestar sensorial",template:"%s | Sensoria"},description:"Instrumentos de bienestar visual, táctil y sonoro para crear rutinas adultas de relajación, concentración y descanso.",keywords:["bienestar sensorial","relajación","lámparas sensoriales","objetos antiestrés","sonido ambiental"],robots:{index:true,follow:true},openGraph:{title:"Sensoria | Bienestar sensorial",description:"Luz, tacto y sonido para crear tu ritual de calma.",type:"website",locale:"es_ES"},icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="es"><body>{children}</body></html>}
