import {env} from 'cloudflare:workers';
export {enquiryDb} from './binding';

// Vite selects this module when building the existing Sites / Cloudflare site.
export function enquiryEnvironment() {return env;}
