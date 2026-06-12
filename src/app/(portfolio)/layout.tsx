/**
 * Portfolio route group layout.
 * Wraps all public-facing portfolio pages: /, /projects, /about, etc.
 * Add shared portfolio chrome here (nav, footer) when ready.
 */
export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
