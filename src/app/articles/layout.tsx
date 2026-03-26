import { ArticlesHeader } from "./_components/articles-header";

export default function ArticlesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ArticlesHeader />
      {children}
    </>
  );
}
