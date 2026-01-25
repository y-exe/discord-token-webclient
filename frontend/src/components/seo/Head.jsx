import { Helmet } from 'react-helmet-async';

export default function Head({ title, description, path = "" }) {
  const siteName = "Discord Web Token Client | yexe.xyz";
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const baseUrl = "https://discord.yexe.xyz"; 
  const url = `${baseUrl}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />

      <meta property="twitter:card" content="summary" /> 
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />

      <link rel="canonical" href={url} />
    </Helmet>
  );
}