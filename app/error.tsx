"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main id="main" className="wrap recovery-page">
    <p className="eyebrow">PLEASE TRY AGAIN</p>
    <h1>This page couldn’t load.</h1>
    <p>Please try again, or return to the homepage.</p>
    <div className="recovery-actions">
      <button className="button" onClick={reset}>Try again</button>
      <a href="/" className="button button-outline">Back to home</a>
    </div>
  </main>;
}
