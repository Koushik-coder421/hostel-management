import { config } from '$lib/api/config';
export const load = () => ({mode:config.mode,user:null,scope:null});
