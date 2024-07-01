import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
//import { WalletWrapper } from "./wallet";

import dynamic from 'next/dynamic'
 
const WalletWrapper = dynamic(() => import('./wallet'), { ssr: false });

import WalletConnection from "./walletConnection";
import { Box, Typography } from "@mui/material";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Web3 subscribe service",
  description: "Autopayments in EVM blockchain systems with low commissions"
};

export const viewport: Viewport = {
  width: 'device-width',
  viewportFit: 'cover',
  userScalable: false,
  initialScale: 1
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Box textAlign='center' marginTop='100px'><Typography variant='h1' {...inter.style} fontSize='64px' style={{ textShadow: '0px 4px 4px rgb(0 0 0 / 40%)' }}>Payments<span className="badge">Web3</span></Typography></Box>
        <Box textAlign='center'><Typography variant='h2' {...inter.style} fontSize='24px' style={{ textShadow: '0px 4px 4px rgb(0 0 0 / 40%)', padding: '0px 10px' }}>guarantee recurrent payments for any token</Typography></Box>
        <WalletWrapper>
          <WalletConnection />
          <Box display='flex' flexDirection='column' alignItems='center' justifyContent='flex-start'>
            {children}
          </Box>
        </WalletWrapper>
        <Script type="text/javascript">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
          m[i].l=1*new Date();
          for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
          k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
          (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

          ym(97712486, "init", {
                clickmap:true,
                trackLinks:true,
                accurateTrackBounce:true,
                webvisor:true
          });`}
        </Script>
        <noscript><div><img src="https://mc.yandex.ru/watch/97712486" style={{ position: 'absolute', left: '-9999px' }} alt="" /></div></noscript>
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-HNCKZX4ESJ"></Script>
        <Script>
          {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'G-HNCKZX4ESJ');`}
        </Script>
      </body>
    </html>
  );
}
