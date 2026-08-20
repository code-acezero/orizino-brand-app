import DynamicContentPage from "@/_pages/DynamicContentPage";

export default async function DynamicCmsRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <DynamicContentPage slug={slug} />;
}
