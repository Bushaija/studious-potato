// import { Ubuntu } from "@next/font/google";

// import "../styles/globals.css";

// const ubuntu = Ubuntu({
//   variable: "--font-ubuntu",
//   weight: ["400", "500", "700"],
//   subsets: ["latin"],
//   display: "swap",
// });
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}