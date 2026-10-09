/**
 * FIT ID merchant catalog CSV adapter (PoC v2).
 * Parsing is client-only. No remote requests, credentials, or fit-algorithm changes.
 * "DRAFT" imports intentionally contain NO measurements; they must not be treated
 * as size-recommendable products until a later size-table import completes them.
 */
export type MajorCategory='TOP'|'BOTTOM'|'OUTER'|'DRESS';
export type Dimension=
  'CHEST_WIDTH'|'SHOULDER_WIDTH'|'SLEEVE_LENGTH'|'BODY_LENGTH'|'HEM_WIDTH'|
  'WAIST_WIDTH'|'HIP_WIDTH'|'THIGH_WIDTH'|'RISE'|'OUTSEAM_LENGTH';
export type ImportSize={label:string;measurements:Partial<Record<Dimension,number>>};
export type ImportProduct={
  merchant_product_id:string;name:string;major_category:MajorCategory;sub_category:string;
  material:string;stretch:string;sizes:ImportSize[];
};
export type Issue={row:number;severity:'error'|'warning';message:string};
export type ImportPreview={
  products:ImportProduct[];issues:Issue[];rows:number;
  draftCount:number;readyCount:number;headers:string[];
};
export const SIZE_DIMENSIONS:Record<MajorCategory,Dimension[]>={
  TOP:['CHEST_WIDTH','SHOULDER_WIDTH','SLEEVE_LENGTH','BODY_LENGTH','HEM_WIDTH'],
  BOTTOM:['WAIST_WIDTH','HIP_WIDTH','THIGH_WIDTH','RISE','OUTSEAM_LENGTH','HEM_WIDTH'],
  OUTER:['CHEST_WIDTH','SHOULDER_WIDTH','SLEEVE_LENGTH','BODY_LENGTH','HEM_WIDTH'],
  DRESS:['CHEST_WIDTH','WAIST_WIDTH','HIP_WIDTH','SHOULDER_WIDTH','SLEEVE_LENGTH','BODY_LENGTH']
};
export const SUBCATEGORIES:Record<MajorCategory,readonly string[]>={
  TOP:['TSHIRT','SHIRT','BLOUSE','KNIT','SWEATSHIRT','HOODIE','SLEEVELESS'],
  BOTTOM:['PANTS','SLACKS','DENIM','JOGGER','WIDE_PANTS','SHORTS','SKIRT','LEGGINGS'],
  OUTER:['JACKET','COAT','PADDING','CARDIGAN','WINDBREAKER','VEST'],
  DRESS:['MINI_DRESS','MIDI_DRESS','LONG_DRESS']
};
const ALIASES:Record<string,string[]>={
  id:['상품번호','상품코드','상품관리코드','상품관리번호','판매자상품코드','판매자관리코드','자체상품코드','productid','product_id','productno','merchantproductid','merchant_product_id','id'],
  name:['상품명','제품명','등록상품명','productname','product_name','name'],
  major:['대분류','카테고리','상품분류','fit대분류','majorcategory','major_category'],
  sub:['세부분류','세부카테고리','상품소분류','subcategory','sub_category'],
  label:['사이즈','사이즈명','옵션사이즈','옵션값','size','sizelabel','size_label'],
  material:['소재','재질','원단','material'],stretch:['신축성','stretch'],
  CHEST_WIDTH:['가슴단면','가슴너비','chestwidth','chest_width'],
  SHOULDER_WIDTH:['어깨너비','어깨단면','어깨','shoulderwidth','shoulder_width'],
  SLEEVE_LENGTH:['소매길이','소매기장','sleevelength','sleeve_length'],
  BODY_LENGTH:['상의총장','상의기장','bodylength','body_length'],
  HEM_WIDTH:['밑단단면','밑단너비','hemwidth','hem_width'],
  WAIST_WIDTH:['허리단면','허리너비','waistwidth','waist_width'],
  HIP_WIDTH:['힙단면','엉덩이단면','엉덩이너비','hipwidth','hip_width'],
  THIGH_WIDTH:['허벅지단면','허벅지너비','thighwidth','thigh_width'],
  RISE:['밑위','밑위길이','rise'],
  OUTSEAM_LENGTH:['하의총장','바지총장','바지기장','outseamlength','outseam_length'],
  length:['총장','기장','길이']
};
function norm(s:string){return s.replace(/^\uFEFF/,'').toLowerCase().replace(/[\s()[\]{}._\-\/㎝]|cm$/gi,'');}
const A=Object.fromEntries(Object.entries(ALIASES).map(([k,v])=>[k,v.map(norm)])) as Record<string,string[]>;
function val(row:string[],head:string[],key:string){
  const idx=head.findIndex(h=>A[key]?.includes(h));
  return idx<0?'':String(row[idx]||'').trim();
}
export function tokenizeCSV(raw:string):string[][]{
  const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
  const input=raw.replace(/^\uFEFF/,'');
  for(let i=0;i<input.length;i++){
    const ch=input[i];
    if(quoted){
      if(ch==='"'&&input[i+1]==='"'){cell+='"';i++;}
      else if(ch==='"')quoted=false;
      else cell+=ch;
    }else if(ch==='"'&&cell===''){quoted=true;}
    else if(ch===','){row.push(cell);cell='';}
    else if(ch==='\n'||ch==='\r'){
      if(ch==='\r'&&input[i+1]==='\n')i++;
      row.push(cell);cell='';
      if(row.some(x=>x.trim().length>0))rows.push(row);
      row=[];
    }else cell+=ch;
  }
  if(quoted)throw Error('CSV 파일의 따옴표가 닫히지 않았습니다.');
  row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
  return rows;
}
function majorCategory(raw:string,name:string):MajorCategory|null{
  const x=raw.trim().toUpperCase();
  const explicit:Record<string,MajorCategory>={
    TOP:'TOP',상의:'TOP',BOTTOM:'BOTTOM',하의:'BOTTOM',OUTER:'OUTER',아우터:'OUTER',
    DRESS:'DRESS',원피스:'DRESS',드레스:'DRESS'
  };
  if(explicit[x])return explicit[x];
  const text=(raw+' '+name).toUpperCase();
  if(/DRESS|원피스|드레스/.test(text))return 'DRESS';
  if(/OUTER|아우터|코트|재킷|자켓|패딩|점퍼|가디건|JACKET|COAT|PUFFER|CARDIGAN/.test(text))return 'OUTER';
  if(/BOTTOM|하의|바지|팬츠|슬랙스|청바지|데님|스커트|치마|JEANS|DENIM|PANTS|SLACKS|SKIRT|CARGO/.test(text))return 'BOTTOM';
  if(/TOP|상의|셔츠|니트|맨투맨|후드|블라우스|티셔츠|SHIRT|HOODIE|TEE|KNIT|BLOUSE|SWEATSHIRT/.test(text))return 'TOP';
  return null;
}
function subCategory(raw:string,name:string,major:MajorCategory):string|null{
  const value=raw.trim().toUpperCase();
  if(SUBCATEGORIES[major].includes(value))return value;
  const text=(raw+' '+name).toUpperCase();
  const tests:Record<MajorCategory,Array<[RegExp,string]>>={
    TOP:[[/SLEEVELESS|민소매|나시/,'SLEEVELESS'],[/HOODIE|후드/,'HOODIE'],[/SWEATSHIRT|맨투맨/,'SWEATSHIRT'],[/BLOUSE|블라우스/,'BLOUSE'],[/KNIT|니트/,'KNIT'],[/TSHIRT|T-SHIRT|TEE|티셔츠/,'TSHIRT'],[/SHIRT|셔츠/,'SHIRT']],
    BOTTOM:[[/SLACKS|슬랙스/,'SLACKS'],[/DENIM|JEANS|데님|청바지/,'DENIM'],[/SKIRT|스커트|치마/,'SKIRT'],[/SHORTS|반바지/,'SHORTS'],[/JOGGER|조거/,'JOGGER'],[/LEGGINGS|레깅스/,'LEGGINGS'],[/WIDE|와이드|CARGO|카고/,'WIDE_PANTS'],[/PANTS|바지|팬츠/,'PANTS']],
    OUTER:[[/PADDING|PUFFER|패딩/,'PADDING'],[/COAT|코트/,'COAT'],[/CARDIGAN|가디건/,'CARDIGAN'],[/WINDBREAKER|바람막이/,'WINDBREAKER'],[/VEST|조끼/,'VEST'],[/JACKET|자켓|재킷|점퍼/,'JACKET']],
    DRESS:[[/MINI|미니/,'MINI_DRESS'],[/LONG|롱|맥시/,'LONG_DRESS'],[/MIDI|미디|원피스|드레스|DRESS/,'MIDI_DRESS']]
  };
  return tests[major].find(([re])=>re.test(text))?.[1]||null;
}
function positiveCM(value:string):number|null{
  if(!value)return null;
  const source=value.replace(/cm$/i,'').trim();
  if(!/^\d+(?:\.\d{1,3})?$/.test(source))return NaN;
  const n=Number(source);return n>0&&n<=400?n:NaN;
}
/**
 * Generic store export without size table => DRAFT. A size-table CSV with at
 * least 2 physical garment axes per size => READY. Partial sizing => DRAFT.
 */
export function parseCatalogCSV(input:string):ImportPreview{
  const rows=tokenizeCSV(input);
  const issues:Issue[]=[];
  if(rows.length<2)return{products:[],issues:[{row:1,severity:'error',message:'헤더와 상품 데이터 행이 필요합니다.'}],rows:0,draftCount:0,readyCount:0,headers:rows[0]||[]};
  if(rows.length>5001)issues.push({row:1,severity:'error',message:'한 파일은 최대 5,000행까지 업로드할 수 있습니다.'});
  const head=rows[0].map(norm);
  for(const key of ['id','name']){
    if(!head.some(h=>A[key].includes(h)))issues.push({row:1,severity:'error',message:'필수 열이 없습니다: '+(key==='id'?'상품번호':'상품명')});
  }
  if(issues.length)return{products:[],issues,rows:rows.length-1,draftCount:0,readyCount:0,headers:rows[0]};
  const byId=new Map<string,ImportProduct>();
  const sizeProblems=new Set<string>();
  const badRows=new Set<string>();
  for(let i=1;i<rows.length;i++){
    const r=rows[i],line=i+1;
    const id=val(r,head,'id'),name=val(r,head,'name'),sizeLabel=val(r,head,'label').toUpperCase();
    if(!id||!name||id.length>120||name.length>250){
      issues.push({row:line,severity:'error',message:'상품번호/상품명이 없거나 너무 깁니다.'});continue;
    }
    const major=majorCategory(val(r,head,'major'),name);
    const sub=major?subCategory(val(r,head,'sub'),name,major):null;
    if(!major||!sub){
      issues.push({row:line,severity:'error',message:'분류를 알 수 없습니다. 대분류(상의/하의/아우터/원피스)와 세부분류 열을 추가하세요: '+name});continue;
    }
    if(!byId.has(id))byId.set(id,{merchant_product_id:id,name,major_category:major,sub_category:sub,material:val(r,head,'material'),stretch:val(r,head,'stretch')||'조금',sizes:[]});
    const item=byId.get(id)!;
    if(item.name!==name||item.major_category!==major||item.sub_category!==sub){
      issues.push({row:line,severity:'error',message:'동일 상품번호에 서로 다른 이름/카테고리가 입력되어 있습니다.'});
      badRows.add(id);continue;
    }
    const dims:Partial<Record<Dimension,number>>={};
    let invalid=false;
    for(const key of SIZE_DIMENSIONS[major]){
      let raw=val(r,head,key);
      if(!raw&&key===(major==='BOTTOM'?'OUTSEAM_LENGTH':'BODY_LENGTH'))raw=val(r,head,'length');
      const parsed=positiveCM(raw);
      if(parsed!==null&&!Number.isFinite(parsed)){
        issues.push({row:line,severity:'error',message:'잘못된 실측값 ('+key+'): '+raw});
        invalid=true;continue;
      }
      if(parsed!==null)dims[key]=parsed;
    }
    if(invalid){badRows.add(id);continue;}
    const measureCount=Object.keys(dims).length;
    if(!sizeLabel){
      if(measureCount)issues.push({row:line,severity:'warning',message:'사이즈 표시가 없어 해당 상품은 초안으로 가져옵니다.'});
      sizeProblems.add(id);continue;
    }
    if(sizeLabel.length>30||item.sizes.some(s=>s.label===sizeLabel)){
      issues.push({row:line,severity:'error',message:'사이즈명이 너무 길거나 중복되어 있습니다: '+sizeLabel});
      badRows.add(id);continue;
    }
    if(measureCount<2){
      sizeProblems.add(id);
      continue;
    }
    item.sizes.push({label:sizeLabel,measurements:dims});
  }
  for(const [id,p] of byId){
    if(sizeProblems.has(id)){
      if(p.sizes.length)issues.push({row:1,severity:'warning',message:p.name+'의 일부 사이즈 실측이 없어 상품을 초안으로 가져옵니다.'});
      p.sizes=[];
    }
    if(badRows.has(id))p.sizes=[];
  }
  const products=[...byId.values()];
  const draftCount=products.filter(p=>p.sizes.length===0).length;
  if(draftCount)issues.push({row:1,severity:'warning',message:draftCount+'개 상품은 실측표가 없어 초안(DRAFT)으로 등록됩니다. FIT CHECK 버튼은 실측 등록 후 사용해야 합니다.'});
  return{products,issues,rows:rows.length-1,draftCount,readyCount:products.length-draftCount,headers:rows[0]};
}
export async function readCatalogFile(file:File):Promise<string>{
  if(file.size>5*1024*1024)throw Error('CSV 파일은 최대 5MB입니다.');
  if(!/\.csv$/i.test(file.name))throw Error('CSV 파일만 지원합니다. 엑셀은 CSV로 저장하세요.');
  const bytes=await file.arrayBuffer();
  let value=new TextDecoder('utf-8').decode(bytes);
  if(value.includes('\uFFFD'))value=new TextDecoder('euc-kr').decode(bytes);
  return value;
}
export const EXAMPLE_CSV='\uFEFF'+[
  '상품번호,상품명,대분류,세부분류,소재,신축성,사이즈,가슴단면,어깨너비,소매길이,총장,허리단면,힙단면,허벅지단면,밑위,밑단단면',
  'A-001,오버핏 옥스퍼드 셔츠,상의,셔츠,면,조금,S,54,45,60,72,,,,,53',
  'A-001,오버핏 옥스퍼드 셔츠,상의,셔츠,면,조금,M,56,47,61,74,,,,,55',
  'B-002,와이드 슬랙스,하의,슬랙스,폴리에스터,없음,M,,,,103,37,50,29,30,22',
  'C-003,시그니처 니트,상의,니트,울,조금,,,,,,,,,,'
].join('\r\n')+'\r\n';
