import type {MetadataRoute} from 'next';
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',allow:'/',disallow:'/api/'},sitemap:'https://astersync.project-keys-0949.chatgpt.site/sitemap.xml'};}
