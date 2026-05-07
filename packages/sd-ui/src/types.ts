export interface SubdomainRow {
  slug: string;
  title: string;
  url: string;
  subdomain: string | null;
  tags: string[] | null;
}

export interface NavLink {
  href: string;
  label: string;
}
