import { loadView } from '$lib/api/load';
import type { PageLoad } from './$types';
export const load:PageLoad = async({parent,url,fetch})=>{
  await parent();
  return loadView('/payments',Object.fromEntries(url.searchParams),fetch);
};
