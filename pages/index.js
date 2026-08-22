export default function Home() {
  return null;
}

export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/app-standalone.html',
      permanent: false
    }
  };
}
