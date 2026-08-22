import fs from 'fs';
import path from 'path';

export default function Home({ htmlContent }) {
  return (
    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
  );
}

export async function getStaticProps() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'app-standalone.html');
    const htmlContent = fs.readFileSync(filePath, 'utf8');
    return {
      props: {
        htmlContent
      }
    };
  } catch (e) {
    return {
      props: {
        htmlContent: '<p>Loading WorkPulse...</p>'
      }
    };
  }
}
