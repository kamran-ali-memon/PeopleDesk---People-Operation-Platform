import "./globals.css";

export const metadata = {
  title: "PeopleDesk — People, made simple",
  description: "A secure, multi-tenant people operations workspace.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{document.documentElement.classList.toggle('dark',localStorage.getItem('hcm_theme')==='dark')}catch(_){ }` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
