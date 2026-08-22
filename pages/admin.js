import fs from 'fs';
import path from 'path';

export default function AdminPage({ htmlContent }) {
  return (
    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
  );
}

export async function getStaticProps() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'admin.html');
    const htmlContent = fs.readFileSync(filePath, 'utf8');
    return {
      props: {
        htmlContent
      }
    };
  } catch (e) {
    return {
      props: {
        htmlContent: '<p>Loading Admin Portal...</p>'
      }
    };
  }
}
