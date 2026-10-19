/** The brand's logo in the header/rail box; the first letter on the brand colour when there is none. */
export function BrandLogo({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  return (
    <span className="app-header__logo">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- data: URL from brand files, no optimisation needed
        <img src={logoUrl} alt="" />
      ) : (
        <span className="logo-fallback" aria-hidden="true">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );
}
