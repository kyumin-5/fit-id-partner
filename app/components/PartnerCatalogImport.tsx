'use client';

import {useMemo,useState} from 'react';
import {
  EXAMPLE_CSV,parseCatalogCSV,readCatalogFile,
  type ImportPreview,type ImportProduct
} from '../lib/catalogCsvImport';

type Mapping={merchant_product_id:string;code:string;name:string;catalog_status:string};
type Outcome={created:number;drafts:number;completed:number;skipped:number;total:number};
type Props={supabase:any;shopId:string;onDone:()=>Promise<void>};
const card={padding:22,border:'1px solid #d9e7dd',borderRadius:16,background:'#fff',margin:'18px 0'} as const;
const btn={padding:'12px 16px',borderRadius:10,background:'#105b3f',color:'#fff',border:0,fontWeight:700,cursor:'pointer'} as const;
const info={fontSize:13,lineHeight:1.8,color:'#4a6655'} as const;

function download(content:string,name:string){
  const blob=new Blob([content],{type:'text/csv;charset=utf-8'});
  const uri=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=uri;link.download=name;document.body.appendChild(link);
  link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(uri),200);
}
const quote=(s:string)=>'"'+String(s??'').replace(/"/g,'""')+'"';

export default function PartnerCatalogImport({supabase,shopId,onDone}:Props){
  const [preview,setPreview]=useState<ImportPreview|null>(null);
  const [busy,setBusy]=useState(false);
  const [filename,setFilename]=useState('');
  const [notice,setNotice]=useState('');
  const [outcome,setOutcome]=useState<Outcome|null>(null);
  const [mapping,setMapping]=useState<Mapping[]>([]);
  const errors=useMemo(()=>preview?.issues.filter(i=>i.severity==='error')||[],[preview]);
  const warnings=useMemo(()=>preview?.issues.filter(i=>i.severity==='warning')||[],[preview]);
  const ready=!!(shopId&&supabase&&preview&&preview.products.length&&!errors.length&&!busy);

  async function load(file:File|null){
    setPreview(null);setOutcome(null);setMapping([]);setNotice('');
    setFilename(file?.name||'');
    if(!file)return;
    try{
      const content=await readCatalogFile(file);
      const next=parseCatalogCSV(content);
      setPreview(next);
      setNotice(next.issues.some(i=>i.severity==='error')
        ?'파일 내 오류를 확인해 수정한 다음 다시 가져오세요.'
        :'파일 분석 완료. 등록 전에 상품과 초안 건수를 확인하세요.');
    }catch(err){
      setNotice('파일 분석 실패: '+(err instanceof Error?err.message:String(err)));
    }
  }

  async function importProducts(){
    if(!ready||!preview||!supabase)return;
    if(!window.confirm(
      preview.products.length+'개 상품을 내 쇼핑몰에 등록할까요?\n'+
      '실측정보가 없는 '+preview.draftCount+'개 상품은 초안으로 저장되며 FIT CHECK 준비 대상입니다.\n'+
      '기존 등록 상품은 덮어쓰지 않습니다.'
    ))return;
    setBusy(true);setOutcome(null);setMapping([]);
    let count:Outcome={created:0,drafts:0,completed:0,skipped:0,total:preview.products.length};
    try{
      for(let i=0;i<preview.products.length;i+=100){
        const part=preview.products.slice(i,i+100);
        const {data,error}=await supabase.rpc('partner_bulk_import_catalog_v2',{
          p_shop_id:shopId,p_items:part
        });
        if(error)throw new Error(error.message||String(error));
        if(!data?.ok)throw new Error('일괄 등록 서버에서 오류가 발생했습니다.');
        count={...count,created:count.created+Number(data.created||0),
          drafts:count.drafts+Number(data.drafts||0),
          completed:count.completed+Number(data.completed||0),
          skipped:count.skipped+Number(data.skipped||0)};
        setNotice('상품 저장 중: '+Math.min(i+part.length,preview.products.length)+' / '+preview.products.length);
      }
      setOutcome(count);
      const records:Mapping[]=[];
      const ids=preview.products.map(p=>p.merchant_product_id);
      for(let i=0;i<ids.length;i+=100){
        const {data,error}=await supabase.from('products')
          .select('merchant_product_id,code,name,catalog_status')
          .eq('shop_id',shopId)
          .in('merchant_product_id',ids.slice(i,i+100));
        if(error)throw new Error('등록 완료, 매핑 조회 실패: '+error.message);
        for(const row of data||[])records.push(row as Mapping);
      }
      setMapping(records);
      await onDone();
      setNotice('등록 완료. 실측 정보가 없는 초안 상품은 먼저 실측을 추가하고, 사진을 등록한 후 FIT ID 버튼을 설치하세요.');
    }catch(err){
      setNotice('일괄 등록 중단: '+(err instanceof Error?err.message:String(err))+
        ' · 이미 성공한 상품은 재업로드해도 덮어쓰지 않습니다.');
    }finally{setBusy(false);}
  }

  function exportMapping(){
    const lines=['쇼핑몰상품번호,FIT_ID상품코드,상품명,등록상태'];
    for(const p of mapping)lines.push(
      [p.merchant_product_id,p.code,p.name,p.catalog_status].map(quote).join(',')
    );
    download('\uFEFF'+lines.join('\r\n'),'FIT_ID_상품코드_매핑.csv');
  }

  return <section style={card} aria-labelledby="catalog-import-title">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}>
      <div>
        <p style={{fontSize:11,fontWeight:800,color:'#168055',letterSpacing:2}}>POC · CATALOG IMPORT V2</p>
        <h2 id="catalog-import-title" style={{margin:'4px 0'}}>기존 쇼핑몰 상품 자동 등록</h2>
        <p style={info}>카페24·자체몰 등에서 받은 상품 목록 CSV를 분석해 여러 상품을 한 번에 가져옵니다.</p>
      </div>
      <button type="button" style={{...btn,background:'#e2f3e9',color:'#105b3f'}}
        onClick={()=>download(EXAMPLE_CSV,'FIT_ID_상품등록_예제.csv')}>CSV 예제 다운로드</button>
    </div>

    <div style={{padding:14,borderRadius:12,background:'#ecf6ef',marginBottom:18}}>
      <p style={{...info,margin:0}}>
        <b>사용 순서</b> · 쇼핑몰 관리자에서 상품 목록 CSV 다운로드 → 여기에서 파일 선택 →
        등록 전 오류·초안 확인 → 일괄 등록 → 상품번호 매핑 내려받기.
        <br/><b>실측이 없는 상품도 초안으로 가져옵니다.</b> 단, 실측이 없으면 FIT CHECK를 사용할 수 없습니다.
        의류 사진은 아직 별도로 등록해야 합니다.
      </p>
    </div>
    <label htmlFor="catalog-file" style={{fontWeight:700,fontSize:13,display:'block',marginBottom:8}}>
      상품 CSV 선택 (UTF-8/CP949 · 최대 5MB · 최대 5,000행)
    </label>
    <input id="catalog-file" type="file" accept=".csv,text/csv"
      disabled={busy}
      onChange={e=>void load(e.currentTarget.files?.[0]||null)}
      style={{width:'100%',padding:12,border:'1px dashed #91b39f',borderRadius:10}}/>
    <p style={{...info,margin:'7px 0 12px'}}>
      상품번호·상품명은 필수입니다. 같은 상품번호의 사이즈별 행은 하나로 묶습니다.
      자동 분류가 불확실한 상품은 CSV의 대분류·세부분류를 보완해야 합니다.
    </p>

    {!!notice&&<p role="status" aria-live="polite"
      style={{padding:12,background:'#eff7f2',borderRadius:10,fontSize:13,color:'#235139'}}>{notice}</p>}
    {preview&&<>
      <div style={{display:'flex',flexWrap:'wrap',gap:14,fontSize:13,margin:'20px 0 12px'}}>
        <span>파일 <b>{filename}</b></span>
        <span>상품 <b>{preview.products.length}</b>개</span>
        <span>실측 준비 <b>{preview.readyCount}</b>개</span>
        <span>초안 <b>{preview.draftCount}</b>개</span>
        <span>오류 <b style={{color:errors.length?'#bd3232':'#18754c'}}>{errors.length}</b>건</span>
      </div>
      <div style={{overflowX:'auto',maxHeight:340,overflowY:'auto',border:'1px solid #e5ede7',borderRadius:10}}>
        <table style={{borderCollapse:'collapse',width:'100%',fontSize:12}}>
          <thead><tr style={{background:'#ecf5ef'}}>
            {['상품번호','상품명','분류','사이즈','상태'].map(v=>
              <th key={v} style={{padding:10,textAlign:'left'}}>{v}</th>)}
          </tr></thead>
          <tbody>{preview.products.slice(0,40).map((p:ImportProduct)=>
            <tr key={p.merchant_product_id} style={{borderBottom:'1px solid #e5ede7'}}>
              <td style={{padding:10}}>{p.merchant_product_id}</td>
              <td style={{padding:10}}>{p.name}</td>
              <td style={{padding:10}}>{p.major_category} / {p.sub_category}</td>
              <td style={{padding:10}}>{p.sizes.map(v=>v.label).join(', ')||'—'}</td>
              <td style={{padding:10,color:p.sizes.length?'#176844':'#906b18'}}>{p.sizes.length?'실측 준비':'초안'}</td>
            </tr>)}</tbody>
        </table>
      </div>
      {preview.products.length>40&&<p style={info}>처음 40개만 미리보기로 표시하며 등록 시에는 전체 상품을 처리합니다.</p>}
      {!!preview.issues.length&&<div style={{maxHeight:170,overflowY:'auto',marginTop:12}}>
        {[...errors,...warnings].slice(0,30).map((i,index)=>
          <p key={index} style={{margin:'5px 0',fontSize:12,color:i.severity==='error'?'#ac2525':'#80651e'}}>
            {i.severity==='error'?'오류':'주의'} {i.row}행: {i.message}
          </p>)}
      </div>}
      <button style={{...btn,marginTop:16,opacity:ready?1:.5}} disabled={!ready}
        onClick={()=>void importProducts()} type="button">
        {busy?'상품 등록 중...':preview.products.length+'개 상품 일괄 등록'}
      </button>
      <p style={info}>기존 상품은 수정하지 않고 건너뜁니다. 실측표가 추가된 초안 상품은 READY로 승격됩니다.</p>
    </>}
    {outcome&&<div style={{background:'#e8f6ec',borderRadius:12,padding:16,marginTop:18}}>
      <h3 style={{margin:'0 0 8px'}}>상품 등록 결과</h3>
      <p style={info}>신규 등록 {outcome.created}개 · 초안 {outcome.drafts}개 · 초안 완성 {outcome.completed}개 · 중복 건너뜀 {outcome.skipped}개</p>
      {mapping.length>0&&<button style={{...btn,background:'#177d57'}} type="button" onClick={exportMapping}>
        FIT ID 상품번호 매핑 CSV 다운로드
      </button>}
    </div>}
  </section>;
}
