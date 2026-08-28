'use client';
import {useEffect,useState} from 'react';
import {createClient} from '@supabase/supabase-js';

type Size={label:string;waist:string;hip:string;thigh:string;rise:string;length:string};
type Product={id:string;code:string;name:string;material:string;stretch:string;sizes:Size[]};
const seed:Size[]=[{label:'S',waist:'35',hip:'47',thigh:'28',rise:'29',length:'100'},{label:'M',waist:'37',hip:'49',thigh:'29',rise:'30',length:'102'},{label:'L',waist:'39',hip:'51',thigh:'30',rise:'31',length:'104'}];
const blank=():Size=>({label:'',waist:'',hip:'',thigh:'',rise:'',length:''});

const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase=createClient(supabaseUrl,supabaseKey);

export default function Page(){
 const [shop,setShop]=useState('MY SHOP'),[name,setName]=useState(''),[material,setMaterial]=useState(''),[stretch,setStretch]=useState('조금');
 const [sizes,setSizes]=useState<Size[]>(seed),[products,setProducts]=useState<Product[]>([]),[latest,setLatest]=useState<Product|null>(null),[saving,setSaving]=useState(false),[status,setStatus]=useState('');

 useEffect(()=>{void loadProducts()},[]);

 async function loadProducts(){
   if(!supabaseUrl||!supabaseKey){setStatus('Supabase 환경변수가 없습니다. .env.local을 확인해주세요.');return;}
   const {data,error}=await supabase.from('products').select('id,code,name,material,stretch,product_sizes(size_label,waist,hip,thigh,rise,length)').order('created_at',{ascending:false});
   if(error){setStatus('DB 조회 실패: '+error.message);return;}
   const mapped:Product[]=(data??[]).map((p:any)=>({id:p.id,code:p.code,name:p.name,material:p.material??'',stretch:p.stretch??'',sizes:(p.product_sizes??[]).map((s:any)=>({label:s.size_label,waist:String(s.waist??''),hip:String(s.hip??''),thigh:String(s.thigh??''),rise:String(s.rise??''),length:String(s.length??'')}))}));
   setProducts(mapped);setStatus('Supabase 연결됨 · 등록 상품을 불러왔습니다.');
 }

 const change=(i:number,k:keyof Size,v:string)=>setSizes(a=>a.map((r,j)=>j===i?{...r,[k]:v}:r));

 async function add(){
   if(!shop.trim())return alert('쇼핑몰명을 입력해주세요.');
   if(!name.trim())return alert('상품명을 입력해주세요.');
   const validSizes=sizes.filter(x=>x.label.trim());
   if(validSizes.length===0)return alert('사이즈를 하나 이상 입력해주세요.');
   setSaving(true);setStatus('Supabase에 저장 중...');
   try{
     let shopId:string;
     const {data:existing,error:shopFindError}=await supabase.from('shops').select('id').eq('name',shop.trim()).limit(1).maybeSingle();
     if(shopFindError)throw shopFindError;
     if(existing?.id) shopId=existing.id;
     else {
       const {data:newShop,error}=await supabase.from('shops').insert({name:shop.trim()}).select('id').single();
       if(error)throw error; shopId=newShop.id;
     }

     let code=''; let productRow:any=null;
     for(let attempt=0;attempt<5;attempt++){
       code='FIT-'+Math.floor(100000+Math.random()*900000);
       const {data,error}=await supabase.from('products').insert({shop_id:shopId,code,name:name.trim(),material:material.trim(),stretch}).select('id,code,name,material,stretch').single();
       if(!error){productRow=data;break;}
       if(error.code!=='23505')throw error;
     }
     if(!productRow)throw new Error('Product Code 생성에 실패했습니다. 다시 시도해주세요.');

     const rows=validSizes.map(s=>({product_id:productRow.id,size_label:s.label.trim(),waist:num(s.waist),hip:num(s.hip),thigh:num(s.thigh),rise:num(s.rise),length:num(s.length)}));
     const {error:sizeError}=await supabase.from('product_sizes').insert(rows);
     if(sizeError){await supabase.from('products').delete().eq('id',productRow.id);throw sizeError;}

     const p:Product={id:productRow.id,code:productRow.code,name:productRow.name,material:productRow.material??'',stretch:productRow.stretch??'',sizes:validSizes};
     setProducts(old=>[p,...old]);setLatest(p);setName('');setStatus('✓ Supabase 영구 저장 완료');
   }catch(e:any){setStatus('저장 실패: '+(e?.message??'알 수 없는 오류'));}
   finally{setSaving(false);}
 }

 return <main><div className="logo">FIT ID PARTNER</div><h1>상품 FIT DATA를 등록하세요.</h1><p className="sub">쇼핑몰 실측을 FIT ID 공통 규격으로 저장하고 Product Code를 발급하는 Partner MVP입니다.</p>
 {status&&<section className="card"><b>{status}</b></section>}
 <div className="grid"><section className="card"><h2>SHOP / PRODUCT</h2>
 <div className="field"><label>쇼핑몰명</label><input value={shop} onChange={e=>setShop(e.target.value)}/></div>
 <div className="field"><label>상품명</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Wide Denim 02"/></div>
 <div className="field"><label>소재</label><input value={material} onChange={e=>setMaterial(e.target.value)} placeholder="Cotton 98%, Spandex 2%"/></div>
 <div className="field"><label>신축성</label><select value={stretch} onChange={e=>setStretch(e.target.value)}><option>없음</option><option>조금</option><option>많음</option></select></div>
 <div className="standard"><b>FIT DATA STANDARD</b><p className="mini">waist · hip · thigh · rise · length · stretch</p></div></section>
 <section className="card"><div className="row"><h2>사이즈 실측</h2><button className="btn2" onClick={()=>setSizes([...sizes,blank()])}>+ 사이즈</button></div>
 <table><thead><tr><th>SIZE</th><th>허리</th><th>힙</th><th>허벅지</th><th>밑위</th><th>총장</th></tr></thead><tbody>{sizes.map((r,i)=><tr key={i}>{(['label','waist','hip','thigh','rise','length'] as (keyof Size)[]).map(k=><td key={k}><input value={r[k]} onChange={e=>change(i,k,e.target.value)}/></td>)}</tr>)}</tbody></table>
 <p className="mini">단위 cm · 현재는 사업자가 직접 확인한 실측 입력</p><button className="btn" disabled={saving} onClick={add}>{saving?'저장 중...':'FIT DATA 생성 + Product Code 발급'}</button></section></div>
 {latest&&<section className="card"><div className="ok">✓ PRODUCT FIT DATA SAVED TO SUPABASE</div><h2>{latest.name}</h2><div className="code">{latest.code}</div><p className="mini">{shop} · 신축성 {latest.stretch}</p></section>}
 <section className="card"><div className="row"><h2>등록 상품 {products.length}</h2><button className="btn2" onClick={()=>void loadProducts()}>DB 새로고침</button></div>{products.length===0?<p className="mini">아직 등록 상품 없음</p>:products.map(p=><div className="product" key={p.id}><div className="row"><b>{p.name}</b><span className="code" style={{fontSize:16}}>{p.code}</span></div><div className="mini">{p.sizes.map(x=>x.label).join(' / ')} · 신축성 {p.stretch}</div></div>)}</section>
 <section className="card"><h2>AI SIZE TABLE · NEXT</h2><p className="mini">다음 단계: 사이즈표 이미지 → AI 구조화 → FIT DATA STANDARD 변환 → 사업자 확인/수정 → 등록.</p></section></main>
}

function num(v:string){const n=Number(v);return Number.isFinite(n)?n:null;}
