export default function AdminPage() {
  return null;
}

export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/admin.html',
      permanent: false
    }
  };
}
