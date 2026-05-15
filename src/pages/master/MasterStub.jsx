export default function MasterStub({ label, title, children }) {
  return (
    <div className="crown-page-view">
      <div className="crown-ticker">
        <span>{label}</span>
      </div>
      <section className="crown-hero crown-hero--page">
        <p className="crown-muted">{label}</p>
        <h1>{title}</h1>
      </section>
      {children ? <div className="crown-page-body">{children}</div> : null}
    </div>
  )
}
