import { SIZE_CHART } from "@/lib/products";

export function SizeTable({ highlight }: { highlight?: string }) {
  return (
    <div className="sizes">
      <table className="sizes__table">
        <thead>
          <tr className="mono">
            <th>Size</th>
            <th>Chest</th>
            <th>Length</th>
            <th>Shoulder</th>
            <th>Sleeve</th>
          </tr>
        </thead>
        <tbody>
          {SIZE_CHART.map((r) => (
            <tr key={r.size} className={r.size === highlight ? "is-on" : ""}>
              <td className="mono">{r.size}</td>
              <td>{r.chest}</td>
              <td>{r.length}</td>
              <td>{r.shoulder}</td>
              <td>{r.sleeve}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mono ash sizes__note">Garment measurements in cm, laid flat ×2 for chest. Oversized fit — size down for a regular fit.</p>
      <div className="sizes__how">
        <div>
          <p className="mono ember">Chest</p>
          <p className="ash">Measure across the fullest part of your chest, under the arms. Add 20–26 cm for the intended AURE drape.</p>
        </div>
        <div>
          <p className="mono ember">Length</p>
          <p className="ash">From the highest point of the shoulder down to the hem.</p>
        </div>
        <div>
          <p className="mono ember">Between sizes?</p>
          <p className="ash">Go up for the full oversized silhouette, down for a cleaner fit.</p>
        </div>
      </div>
    </div>
  );
}
