'use client';

import {useEffect,useState} from 'react';

type ProductMetric={
  product_id:string;product_code:string;product_name:string;
  link_open:number;fit_check_view:number;fit_check_save:number;
  recommended_sizes:Record<string,number>;
};
type Dashboard={
  summary:{link_open:number;fit_check_view:number;fit_check_save:number};
  products:ProductMetric[];
};
type TryonStats={total:number;succeeded:number;failed:number;running:number};
type Props={db:any;shopId:string;shopName:string};
const percent=(a:number,b:number)=>b?Math.round(a/b*1000)/10:0;
const n=(value:unknown)=>Number(value)||0;
const csvValue=(value:unknown)=>'"'+String(value??'').replace(/"/g,'""').replace(/^[=+@\-]/,'\u0027$&')+'"';
function downloadCsv(filename:string,lines:string[][]){
  const csv='\uFEFF'+lines.map(row=>row.map(csvValue).join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),500);
}

export default function PartnerGrowthAnalytics({db,shopId,shopName}:Props){
  const [dashboard,setDashboard]=useState<Dashboard|null>(null);
  const [tryons,setTryons]=useState<TryonStats|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    let live=true;
    setDashboard(null);setTryons(null);setError('');
    if(!db||!shopId)return;
    setLoading(true);
    void Promise.all([
      db.rpc('get_partner_poc_dashboard',{p_shop_id:shopId}),
      db.rpc('get_partner_virtual_tryon_stats_v1',{p_shop_id:shopId})
    ]).then(([metrics,virtual]:[any,any])=>{
      if(!live)return;
      if(metrics.error)throw metrics.error;
      setDashboard(metrics.data as Dashboard);
      // Older deployments without the new RPC must still show the existing metrics.
      if(!virtual.error&&virtual.data)setTryons(virtual.data as TryonStats);
    }).catch((e:unknown)=>{if(live)setError(e instanceof Error?e.message:String(e));})
      .finally(()=>{if(live)setLoading(false);});
    return ()=>{live=false;};
  },[db,shopId]);

  const products=dashboard?.products||[];
  const summary=dashboard?.summary;
  const byViews=[...products].sort((a,b)=>n(b.fit_check_view)-n(a.fit_check_view));
  const withViews=byViews.filter(p=>n(p.fit_check_view)>0);
  const weakSaves=withViews.filter(p=>n(p.fit_check_view)>=5&&percent(n(p.fit_check_save),n(p.fit_check_view))<20);
  const sizeDist:Record<string,number>={};
  for(const p of products)for(const [size,count] of Object.entries(p.recommended_sizes||{})){
    sizeDist[size]=(sizeDist[size]||0)+n(count);
  }

  const exportReport=()=>{
    if(!dashboard)return;
    const headers=['상품코드','상품명','링크 방문','핏체크 조회','결과 저장','조회율(%)','저장률(%)','추천 사이즈 분포'];
    const rows=products.map(p=>[
      p.product_code,p.product_name,String(n(p.link_open)),String(n(p.fit_check_view)),
      String(n(p.fit_check_save)),String(percent(n(p.fit_check_view),n(p.link_open))),
      String(percent(n(p.fit_check_save),n(p.fit_check_view))),
      Object.entries(p.recommended_sizes||{}).map(([s,c])=>s+':'+c).join(' / ')
    ]);
    const safeShop=shopName.replace(/[^a-zA-Z0-9가-힣_-]/g,'_').slice(0,40);
    downloadCsv('FIT_ID_'+safeShop+'_성과.csv',[headers,...rows]);
  };

  return <section className="panel" style={{padding:24,marginBottom:24}}>
    <div className="panelHeader">
      <div>
        <p className="sectionLabel">LIVE FIT ANALYTICS · B2B</p>
        <h3>실제 이용 기록과 상품별 운영 리포트</h3>
        <p style={{fontSize:12,color:'#60776a',margin:'8px 0 0'}}>
          현재 쇼핑몰의 실제 FIT CHECK 이벤트를 집계합니다. 아래 지표는 구매 전환·반품 감소를 의미하지 않습니다.
        </p>
      </div>
      <button type="button" className="secondaryBtn" disabled={!dashboard||loading} onClick={exportReport}>
        CSV 리포트 저장
      </button>
    </div>
    {!!error&&<p role="alert" style={{color:'#b42318'}}>분석 조회 실패: {error}</p>}
    {loading&&<p>이용 데이터를 확인하고 있습니다.</p>}
    {!!dashboard&&<>
      <div style={{display:'flex',gap:12,flexWrap:'wrap',margin:'18px 0'}}>
        {[
          ['링크 유입',n(summary?.link_open)],
          ['FIT CHECK 조회',n(summary?.fit_check_view)],
          ['결과 저장',n(summary?.fit_check_save)],
          ['조회 전환율',percent(n(summary?.fit_check_view),n(summary?.link_open))+'%'],
          ['저장 전환율',percent(n(summary?.fit_check_save),n(summary?.fit_check_view))+'%']
        ].map(([label,value])=>
          <div key={label} style={{flex:'1 1 145px',padding:15,border:'1px solid #dce8df',borderRadius:12,background:'#f7fbf8'}}>
            <div style={{fontSize:12,color:'#52745f'}}>{label}</div>
            <strong style={{display:'block',fontSize:23,marginTop:6}}>{value}</strong>
          </div>
        )}
      </div>
      <div style={{display:'flex',gap:14,flexWrap:'wrap',margin:'8px 0 18px'}}>
        <div style={{flex:'1 1 235px',border:'1px solid #e0e9e2',borderRadius:12,padding:16}}>
          <h4 style={{margin:'0 0 8px'}}>AI 가상피팅 이용 현황</h4>
          {tryons?<p style={{fontSize:13,lineHeight:1.9,margin:0}}>
            전체 요청 <b>{n(tryons.total)}</b>건 · 완료 <b>{n(tryons.succeeded)}</b>건
            · 실패 <b>{n(tryons.failed)}</b>건 · 진행 중 <b>{n(tryons.running)}</b>건
          </p>:<p style={{fontSize:12,color:'#71877a'}}>가상피팅 집계 RPC 미설치 또는 조회 권한 미확인</p>}
        </div>
        <div style={{flex:'1 1 235px',border:'1px solid #e0e9e2',borderRadius:12,padding:16}}>
          <h4 style={{margin:'0 0 8px'}}>추천 사이즈 분포</h4>
          <p style={{fontSize:13,lineHeight:1.9,margin:0}}>
            {Object.entries(sizeDist).length
              ?Object.entries(sizeDist).sort((a,b)=>b[1]-a[1]).map(([s,c])=>s+' '+c+'건').join(' · ')
              :'아직 사이즈 추천 저장 기록이 없습니다.'}
          </p>
        </div>
      </div>
      <h4 style={{margin:'0 0 12px'}}>상품 운영 인사이트</h4>
      <p style={{fontSize:13,lineHeight:1.8}}>
        {withViews.length? '가장 많이 FIT CHECK를 조회한 상품: '+byViews.slice(0,3).map(p=>p.product_name+' ('+p.fit_check_view+'회)').join(', '):'아직 상품별 FIT CHECK 이용 기록이 없습니다.'}
      </p>
      {weakSaves.length>0&&<p style={{fontSize:13,color:'#885e2d',lineHeight:1.7}}>
        조회 5회 이상 대비 저장률이 20% 미만인 상품: {weakSaves.slice(0,5).map(p=>p.product_name).join(', ')}.
        실측 정보와 상품 설명을 점검할 후보입니다. 낮은 저장률만으로 판매 부진을 단정할 수는 없습니다.
      </p>}
      <p style={{fontSize:11,color:'#708578',marginTop:14}}>
        개인정보가 포함된 개별 고객 로그·신체 치수는 내려받지 않습니다. 원시 이벤트가 아닌 상품 단위 집계만 제공됩니다.
      </p>
    </>}
  </section>;
}
