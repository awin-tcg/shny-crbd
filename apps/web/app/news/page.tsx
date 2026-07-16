export default function NewsPage() {
  return (
    <>
      <p className="eyebrow">Roadmap</p>
      <h1>Signals, with sources.</h1>
      <p className="lead">
        News, release dates, videos, and community sentiment will live here
        after source rights and manipulation defenses are complete.
      </p>
      <article className="panel roadmap-card">
        <h2>Designed before ingestion</h2>
        <ul>
          <li>Every item will show source, timestamp, and attribution.</li>
          <li>Sentiment will include sample size and observation window.</li>
          <li>External content will be treated as untrusted input.</li>
          <li>AI summaries will cite evidence and disclose uncertainty.</li>
        </ul>
      </article>
    </>
  );
}
