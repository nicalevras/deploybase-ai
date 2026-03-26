import Link from "next/link";
import type { AnchorHTMLAttributes, TableHTMLAttributes } from "react";

function MdxLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { href, children, ...rest } = props;
  if (href && (href.startsWith("/") || href.startsWith("#"))) {
    return (
      <Link href={href} prefetch={false} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}

function MdxTable(props: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table {...props} />
    </div>
  );
}

export const mdxComponents = {
  a: MdxLink,
  table: MdxTable,
};
