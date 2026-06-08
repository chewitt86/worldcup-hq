/**
 * Phase 0 placeholder shell — verifies the sticker-album token system renders.
 * Replaced by the real router/app shell in Phase 5.
 */
function App() {
  return (
    <div className="wchq-screen" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="sticker" style={{ padding: '22px 26px', maxWidth: 360 }}>
        <h1 className="head" style={{ fontSize: 30 }}>Leo's World Cup</h1>
        <p style={{ fontWeight: 700, marginTop: 8 }}>
          Sticker-album tokens are live. Build starts here.
        </p>
        <span className="navpill active" style={{ display: 'inline-block', marginTop: 12 }}>
          KICK OFF
        </span>
      </div>
    </div>
  )
}

export default App
