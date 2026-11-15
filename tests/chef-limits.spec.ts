import {test,expect} from '@playwright/test';
import {beginChefRequest} from '../lib/chef-limits';

test('chef limits concurrent requests and allows only twelve per window',()=>{
  const request=new Request('http://127.0.0.1:3000/api/chef',{headers:{'x-forwarded-for':'192.0.2.45'}});
  const release=beginChefRequest(request);
  expect(()=>beginChefRequest(request)).toThrow('already answering');release();
  for(let i=1;i<12;i++)beginChefRequest(request)();
  expect(()=>beginChefRequest(request)).toThrow('12 chef questions');
});
