export default function VendorPage() {
  return (
    <>
      <p className="eyebrow">Separate workspace · Roadmap</p>
      <h1>Run the booth, not a spreadsheet.</h1>
      <p className="lead">
        Show inventory and realized profit/loss will remain separate from your
        personal portfolio, with explicit transfers between them.
      </p>
      <article className="panel roadmap-card">
        <h2>Vendor workspace boundary</h2>
        <ul>
          <li>Opening stock, purchases, sales, fees, and show expenses</li>
          <li>Cash and payment-method reconciliation</li>
          <li>Auditable personal-to-vendor inventory transfers</li>
          <li>Offline workflows and conflict handling for show floors</li>
        </ul>
        <p className="subtle">
          This tab intentionally contains no MVP portfolio data or mutation
          controls.
        </p>
      </article>
    </>
  );
}
