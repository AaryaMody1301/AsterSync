import type {MetadataRoute} from 'next';
import {siteUrl} from '@/lib/site-url';
export default function sitemap():MetadataRoute.Sitemap{return ['/','/services','/work','/about','/contact','/privacy'].map(path=>({url:new URL(path,siteUrl).href}));}
