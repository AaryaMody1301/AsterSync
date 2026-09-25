import type {MetadataRoute} from 'next';
export default function sitemap():MetadataRoute.Sitemap{return ['/','/services','/work','/about','/contact','/privacy'].map(path=>({url:new URL(path,'https://astersync.project-keys-0949.chatgpt.site').href}));}
