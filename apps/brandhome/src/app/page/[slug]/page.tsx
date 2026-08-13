import CmsPage from "@/_pages/CmsPage";

export default async function DynamicCmsRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CmsPage slug={slug} />;
}
