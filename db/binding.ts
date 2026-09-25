import {env} from 'cloudflare:workers';
export function enquiryDb():D1Database{if(!env.DB)throw new Error('Enquiry storage unavailable');return env.DB;}
