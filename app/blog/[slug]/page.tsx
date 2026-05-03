import { Metadata } from 'next';
import { BlogPostPage } from '@/components/pages/BlogPostPage';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Blog Post`,
    description: `Read our latest insights`,
    openGraph: {
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
    }
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  if (!slug) return null;

  return <BlogPostPage slug={slug} />;
}
