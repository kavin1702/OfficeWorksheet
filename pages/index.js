export default function Home() {
  return (
    <iframe
      src="/app-standalone.html"
      title="WorkPulse Office Daily Worksheet"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        border: 'none',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        zIndex: 999999
      }}
    />
  );
}
