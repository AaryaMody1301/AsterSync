import {createEnquiryGateway} from '../../../lib/enquiry-gateway.ts';
import keyConfig from './key-sha256.json' with {type: 'json'};

Deno.serve(createEnquiryGateway({
  tokenHash: keyConfig.sha256,
  getDatabase: () => ({
    SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
    SUPABASE_SECRET_KEY: JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default,
  }),
}));
