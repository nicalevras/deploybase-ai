interface CategoryDetails {
  name: string;
  description: string;
}

interface CategoryArticle {
  slug: string;
  title: string;
}

export function buildCategoryCollectionJsonLd(
  category: CategoryDetails,
  slug: string,
  articles: CategoryArticle[],
) {
  const itemListElement = articles.slice(0, 50).map((article, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `https://deploybase.ai/articles/${article.slug}`,
    name: article.title,
  }));

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} Articles`,
    description: category.description,
    url: `https://deploybase.ai/articles/category/${slug}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: articles.length,
      itemListElement,
    },
  };
}
