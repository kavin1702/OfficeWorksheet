export default function AdminPage() {
  return (
    <iframe
      src="/admin.html"
      title="WorkPulse Admin Portal"
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
