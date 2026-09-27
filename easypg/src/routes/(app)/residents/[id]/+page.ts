import { loadView } from '$lib/api/load';
import type { PageLoad } from './$types';
export const load:PageLoad = async({parent,params,fetch})=>{
  await parent();
  return loadView('/residents/:id',{id:params.id},fetch);
};
