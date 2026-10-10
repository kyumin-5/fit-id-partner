'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';

type PocProduct={
  product_code:string;
  product_name:string;
  merchant_product_id:string|null;
  catalog_status:string;
  size_count:number;
  fit_check_ready:boolean;
  virtual_tryon_ready:boolean;
  merchant_mapping_ready:boolean;
  issues:string[];
};
type PocReport={
  shop_id:string;
  checked_at:string;
  product_count:number;
  fit_check_ready:number;
  virtual_tryon_ready:number;
  merchant_mapping_ready:number;
  fully_ready:number;
  products:PocProduct[];
};
type Props={
  db:any;
  shopId:string;
  onManageProduct:(productCode:string)=>void;
};
const MESSAGES:Record<string,string>={
  DRAFT_PRODUCT:'초안 상품',
  MISSING_CATEGORY:'카테고리 정보 누락',
  MISSING_SIZE_TABLE:'사이즈 실측표 없음',
  INVALID_SIZE_MEASUREMENTS:'사이즈 실측값 검증 필요',
  MISSING_PRODUCT_IMAGE:'대표사진 없음',
  IMAGE_FILE_NOT_FOUND:'저장된 이미지 파일을 찾을 수 없음',
  NO_MERCHANT_PRODUCT_ID:'쇼핑몰 상품번호 연결 필요'
};
const shell:React.CSSProperties={
  padding:24,background:'#fff',border:'1px solid #dbe9df',
  borderRadius:18,boxShadow:'0 10px 32px rgba(4,54,29,.045)',
  marginBottom:24
};
const muted:React.CSSProperties={fontSize:12,color:'#62746a',lineHeight:1.65};
const action:React.CSSProperties={
  background:'#103f2b',color:'#fff',border:'0',borderRadius:9,
  padding:'10px 13px',fontSize:12,fontWeight:700,cursor:'pointer'
};
function Metric({label,value,total,description}:{
  label:string;value:number;total:number;description:string;
}){
  return <div style={{padding:17,border:'1px solid #e0eee4',borderRadius:13,background:'#f8fcf9',flex:'1 1 180px'}}>
    <div style={{fontSize:12,color:'#476c56',fontWeight:700}}>{label}</div>
    <div style={{display:'flex',gap:6,alignItems:'baseline',margin:'7px 0'}}>
      <strong style={{fontSize:27,lineHeight:1.1,color:'#103f2b'}}>{value}</strong>
      <span style={{color:'#718378',fontSize:13}}> / {total}개</span>
    </div>
    <div style={{height:5,background:'#e5eee9',borderRadius:20,overflow:'hidden',marginBottom:9}}>
      <div style={{height:'100%',width:total?Math.max(0,Math.min(100,value/total*100))+'%':'0%',background:'#12a976',borderRadius:20}}/>
    </div>
    <div style={muted}>{description}</div>
  </div>;
}
export default function PartnerPocPreflight({db,shopId,onManageProduct}:Props){
  const [report,setReport]=useState<PocReport|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [filter,setFilter]=useState<'all'|'needs-work'|'fit-ready'>('needs-work');

  const refresh=useCallback(async()=>{
    if(!db||!shopId){setReport(null);return;}
    setBusy(true);setError('');
    try{
      const {data,error:rpcError}=await db.rpc('partner_poc_preflight_v1',{p_shop_id:shopId});
      if(rpcError)throw new Error(rpcError.message||'서버 조회 실패');
      if(!data||data.shop_id!==shopId||!Array.isArray(data.products))throw new Error('상품 준비도 응답 형식이 올바르지 않습니다.');
      setReport(data as PocReport);
    }catch(e){
      setError(e instanceof Error?e.message:String(e));
      setReport(null);
    }finally{setBusy(false);}
  },[db,shopId]);

  useEffect(()=>{void refresh();},[refresh]);
  const rows=useMemo(()=>{
    const products=report?.products||[];
    if(filter==='needs-work')return products.filter(p=>!p.fit_check_ready||!p.virtual_tryon_ready||!p.merchant_mapping_ready);
    if(filter==='fit-ready')return products.filter(p=>p.fit_check_ready);
    return products;
  },[filter,report]);

  return <section style={shell} aria-labelledby="poc-check-title">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,flexWrap:'wrap'}}>
      <div>
        <p style={{fontSize:11,fontWeight:800,color:'#099d65',letterSpacing:1.7,margin:'0 0 8px'}}>POC READINESS · PARTNER</p>
        <h3 id="poc-check-title" style={{fontSize:21,color:'#0c2c20',margin:'0 0 7px'}}>상품별 FIT ID 연동 준비도</h3>
        <p style={{...muted,margin:0}}>어떤 상품을 바로 테스트할 수 있고 무엇을 보완해야 하는지 자동 확인합니다.</p>
      </div>
      <button type="button" onClick={()=>void refresh()} disabled={busy||!shopId}
        style={{...action,opacity:busy?.55:1}}>{busy?'검사 중...':'↻ 다시 검사'}</button>
    </div>

    {!!error&&<p role="alert" style={{marginTop:16,padding:12,background:'#fff3f0',color:'#a5282b',borderRadius:10}}>
      준비도 조회 실패: {error}. 로그인·쇼핑몰 소유권을 확인하고 다시 시도해 주세요.
    </p>}
    {busy&&!report&&<p style={muted}>등록 상품과 실제 저장된 이미지·실측 데이터를 확인하고 있습니다.</p>}

    {report&&<>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',margin:'20px 0 13px'}}>
        <Metric label="FIT CHECK 준비" value={report.fit_check_ready} total={report.product_count} description="상품 카테고리·사이즈 실측 확인"/>
        <Metric label="가상피팅 데이터 준비" value={report.virtual_tryon_ready} total={report.product_count} description="FIT CHECK 데이터 + 실제 상품 사진 확인"/>
        <Metric label="쇼핑몰 상품번호 연결" value={report.merchant_mapping_ready} total={report.product_count} description="외부 쇼핑몰 상품번호 매핑 확인"/>
      </div>
      <p style={{...muted,margin:'0 0 16px'}}>
        * 가상피팅 데이터 준비는 AI 이미지 생성 성공을 의미하지 않습니다. 
        쇼핑몰 상품번호가 없어도 상품별 FIT ID 코드를 수동 연결할 수 있지만 자동 연동 전에는 매핑이 필요합니다.
      </p>
      <div style={{display:'flex',gap:9,alignItems:'center',flexWrap:'wrap',margin:'8px 0 14px'}}>
        {([
          ['needs-work','보완할 상품'],
          ['all','전체'],
          ['fit-ready','FIT CHECK 가능']
        ] as const).map(([value,label])=>
          <button key={value} type="button" aria-pressed={filter===value}
            onClick={()=>setFilter(value)}
            style={{border:'1px solid '+(filter===value?'#23b781':'#d8e3da'),
              borderRadius:20,padding:'8px 13px',fontSize:12,fontWeight:700,
              background:filter===value?'#ddf8e9':'#fff',
              color:filter===value?'#075939':'#5d7365',cursor:'pointer'}}>{label}</button>
        )}
        <span style={{marginLeft:'auto',fontSize:12,color:'#64796a'}}>{rows.length}개 표시</span>
      </div>
      <div style={{overflowX:'auto',border:'1px solid #e0ebe3',borderRadius:12}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:650,fontSize:12}}>
          <thead style={{background:'#f3f8f4'}}>
            <tr>
              {['상품명 · FIT ID 코드','FIT CHECK','가상피팅','쇼핑몰 연동','필요한 작업'].map(label=>
                <th key={label} scope="col" style={{textAlign:'left',padding:'12px 10px',color:'#486251',fontWeight:800}}>{label}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map(p=><tr key={p.product_code} style={{borderTop:'1px solid #edf3ef'}}>
              <td style={{padding:'13px 10px',minWidth:155,verticalAlign:'top'}}>
                <strong style={{display:'block',color:'#153d2b'}}>{p.product_name}</strong>
                <span style={{color:'#789087',fontSize:11}}>{p.product_code}</span>
              </td>
              <td style={{padding:'13px 10px',verticalAlign:'top'}}>
                <span style={{color:p.fit_check_ready?'#0a9260':'#b47718',fontWeight:700}}>{p.fit_check_ready?'● 가능':'○ 보완'}</span>
              </td>
              <td style={{padding:'13px 10px',verticalAlign:'top'}}>
                <span style={{color:p.virtual_tryon_ready?'#0a9260':'#b47718',fontWeight:700}}>{p.virtual_tryon_ready?'● 데이터 준비':'○ 보완'}</span>
              </td>
              <td style={{padding:'13px 10px',verticalAlign:'top'}}>
                <span style={{color:p.merchant_mapping_ready?'#0a9260':'#b47718',fontWeight:700}}>{p.merchant_mapping_ready?'● 연결됨':'○ 매핑 필요'}</span>
              </td>
              <td style={{padding:'10px',maxWidth:255,verticalAlign:'top'}}>
                {p.issues.length?
                  <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                    {p.issues.map(code=><span key={code} style={{background:'#fff7ea',color:'#865b1c',borderRadius:6,padding:'3px 6px',fontSize:11}}>
                      {MESSAGES[code]||code}
                    </span>)}
                  </div>:
                  <strong style={{color:'#0b9761'}}>필수 데이터 준비됨</strong>}
                <button type="button" onClick={()=>onManageProduct(p.product_code)}
                  style={{display:'block',border:0,padding:'8px 0 0',background:'transparent',
                    color:'#14774e',fontWeight:700,fontSize:12,cursor:'pointer'}}>
                  상품 관리에서 확인 ↗
                </button>
              </td>
            </tr>)}
          </tbody>
        </table>
        {rows.length===0&&<p style={{...muted,textAlign:'center',padding:20}}>
          {report.product_count?'이 조건에 해당하는 상품이 없습니다.':'아직 등록한 상품이 없습니다. 상품 관리에서 상품을 등록해 주세요.'}
        </p>}
      </div>
      <p style={{...muted,margin:'11px 0 0'}}>
        최종 확인: {report.checked_at?new Date(report.checked_at).toLocaleString('ko-KR'):'알 수 없음'} · 현재 로그인한 파트너가 소유한 쇼핑몰만 조회합니다.
      </p>
    </>}
  </section>;
}

