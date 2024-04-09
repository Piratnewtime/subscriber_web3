import type { Metadata } from "next";
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
  description: "Autopayments in EVM blockchain systems with low commissions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Box textAlign='center' marginTop='100px'><Typography variant='h1' {...inter.style} fontSize='64px' style={{ textShadow: '0px 4px 4px rgb(0 0 0 / 40%)' }}>Subscriptions <span className="badge">Web3</span></Typography></Box>
        <Box textAlign='center'><Typography variant='h2' {...inter.style} fontSize='24px' style={{ textShadow: '0px 4px 4px rgb(0 0 0 / 40%)' }}>guarantee recurrent payments for any token</Typography></Box>
        <WalletWrapper>
          <WalletConnection />
          <Box display='flex' flexDirection='column' alignItems='center' justifyContent='flex-start'>
            {children}
          </Box>
        </WalletWrapper>
      </body>
    </html>
  );
}
