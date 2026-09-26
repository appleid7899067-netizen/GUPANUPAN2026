import BuilderWorkspace from "@/components/builder/BuilderWorkspace";

export default async function BuildPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <BuilderWorkspace key={projectId} projectId={projectId} />;
}
