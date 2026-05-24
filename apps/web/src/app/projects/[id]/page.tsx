import { ComicEditor } from "../../../components/editor/ComicEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Dynamic project detail route page component.
 * Resolves the dynamic id path parameter asynchronously and mounts the workspace editor.
 * 
 * @component
 * @param props - Component properties.
 * @param props.params - Promise resolving to the dynamic route path parameters containing the target project id.
 * @returns Promise resolving to a React.Element editor instance.
 */
export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <ComicEditor projectId={id} />;
}
