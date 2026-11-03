type DenialPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DenialPage({ params }: DenialPageProps) {
  const { id } = await params;

  return (
    <section>
      <h1 className="text-xl font-semibold">Denial {id}</h1>
      <p className="mt-2 text-sm text-gray-600">
        Code meanings, suggested action, draft and decision. Not built yet.
      </p>
    </section>
  );
}
