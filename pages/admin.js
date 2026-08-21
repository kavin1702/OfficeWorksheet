import fs from 'fs';
import path from 'path';

export default function AdminPage() {
  return null;
}

export async function getServerSideProps({ res }) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'admin.html');
    const html = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.write(html);
    res.end();
  } catch (e) {
    res.writeHead(302, { Location: '/admin.html' });
    res.end();
  }
  return { props: {} };
}
