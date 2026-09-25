import {enquirySchema} from '@/lib/enquiries';
import {enquiryDb} from '@/db/binding';
import {env} from 'cloudflare:workers';
import {saveToSupabase} from '@/db/supabase';
export async function POST(request:Request){
 try{
  if(request.headers.get('sec-fetch-site')==='cross-site')return Response.json({error:'Please submit through our contact page.'},{status:403});
  if(!request.headers.get('content-type')?.includes('application/json'))return Response.json({error:'Invalid request format.'},{status:415});
  if(Number(request.headers.get('content-length')||0)>16000)return Response.json({error:'Your message is too long.'},{status:413});
  const raw=await request.text();if(raw.length>16000)return Response.json({error:'Your message is too long.'},{status:413});
  let body:unknown;try{body=JSON.parse(raw)}catch{return Response.json({error:'Invalid request format.'},{status:400})}
  const parsed=enquirySchema.safeParse(body);if(!parsed.success)return Response.json({error:parsed.error.issues[0].message},{status:400});
  const e=parsed.data;if(e.website)return Response.json({error:'We couldn’t accept this submission. Please try again.'},{status:400});
  if(env.ENQUIRY_STORAGE==='supabase'){
   const result=await saveToSupabase(e,env);
   if(result.status==='rate_limited')return Response.json({error:'You’ve sent several enquiries recently. Please try again in an hour.'},{status:429});
   if(result.status==='conflict')return Response.json({error:'This reference has already been used. Refresh the page before sending a new enquiry.'},{status:409});
   return Response.json({id:result.id,received:true},{status:result.status==='created'?201:200});
  }
  if(env.ENQUIRY_STORAGE && env.ENQUIRY_STORAGE!=='d1')throw new Error('Unknown enquiry storage provider');
  const db=enquiryDb();const existing=await db.prepare('SELECT id FROM enquiries WHERE id = ?').bind(e.id).first();if(existing)return Response.json({id:e.id,received:true});
  const email=e.email.toLowerCase();const recent=await db.prepare('SELECT COUNT(*) AS count FROM enquiries WHERE email = ? AND created_at > ?').bind(email,Date.now()-3600000).first<{count:number}>();
  if((recent?.count||0)>=5)return Response.json({error:'You’ve sent several enquiries recently. Please try again in an hour.'},{status:429});
  await db.prepare('INSERT INTO enquiries (id,name,email,company,service,budget,timeline,message,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(e.id,e.name,email,e.company,e.service,e.budget,e.timeline,e.message,Date.now()).run();
  return Response.json({id:e.id,received:true},{status:201});
 }catch(error){console.error('Enquiry submission failed',error instanceof Error?error.message:'Unknown error');return Response.json({error:'We couldn’t save your enquiry just now. Your details are still here — please try again.'},{status:503})}
}
