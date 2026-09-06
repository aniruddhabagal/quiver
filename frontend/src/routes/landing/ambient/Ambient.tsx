/**
 * Page-level ornaments that sit under the sections: two aurora blobs that
 * morph slowly behind the middle of the page, and rails at the edges with
 * packets travelling down them, the same idea as the wires in the hero.
 */
export function Ambient() {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="aurora aurora--a" />
      <div className="aurora aurora--b" />
      <div className="rail rail--l">
        <span className="packet" style={{ animationDuration: '9s', animationDelay: '0s' }} />
        <span className="packet" style={{ animationDuration: '13s', animationDelay: '4s' }} />
        <span className="packet packet--ion" style={{ animationDuration: '11s', animationDelay: '7s' }} />
      </div>
      <div className="rail rail--r">
        <span className="packet" style={{ animationDuration: '12s', animationDelay: '2s' }} />
        <span className="packet packet--ion" style={{ animationDuration: '8s', animationDelay: '5.5s' }} />
        <span className="packet" style={{ animationDuration: '14s', animationDelay: '9s' }} />
      </div>
    </div>
  )
}
