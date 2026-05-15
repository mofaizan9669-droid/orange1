export default function CricketDemoTable({ columns, rows, empty }) {
  if (!rows?.length) {
    return empty ? <p className="crown-cricket-table-empty">{empty}</p> : null
  }
  return (
    <div className="crown-cricket-table-wrap">
      <table className="crown-cricket-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? row.client ?? i}>
              {columns.map((c) => (
                <td key={c.key}>{row[c.key] ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
