import { error, redirect } from '@sveltejs/kit';
import { api } from '$lib/api/client';
import type { LayoutLoad } from './$types';
export const load:LayoutLoad = async({url,depends,fetch})=>{
  depends('api:session');
  let session;
  try {session=await api.getSession(fetch);}
  catch(cause){error(503,cause instanceof Error?cause.message:'API unavailable');}
  if(!session)redirect(307,`/login?redirectTo=${encodeURIComponent(url.pathname)}`);
  return session;
};
