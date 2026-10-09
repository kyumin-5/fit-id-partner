'use client';
import {useEffect,useState} from 'react';
import {inspectProductImage} from '../lib/productImage';

type Dimension='CHEST_WIDTH'|'SHOULDER_WIDTH'|'SLEEVE_LENGTH'|'BODY_LENGTH'|'HEM_WIDTH'|
  'WAIST_WIDTH'|'HIP_WIDTH'|'THIGH_WIDTH'|'RISE'|'OUTSEAM_LENGTH';
type Size={label:string;measurements:Partial<Record<Dimension,string>>};
type AIResult={
  success:boolean;
  sizes:Array<{label:string;measurements:Partial<Record<Dimension,number>>}>;
  confidence:'LOW'|'MEDIUM'|'HIGH';
  warnings:string[];
  quotaRemaining:number|null;
  reviewRequired:boolean;
};
type Props={
  db:any;shopId:string;majorCategory:'TOP'|'BOTTOM'|'OUTER'|'DRESS';
  subCategory:string;onApply:(sizes:Size[])=>void;
};
const labels:Record<Dimension,string>={
  CHEST_WIDTH:'가슴 단면',SHOULDER_WIDTH:'어깨 너비',
  SLEEVE_LENGTH:'소매 길이',BODY_LENGTH:'총장(상의)',HEM_WIDTH:'밑단 단면',
  WAIST_WIDTH:'허리 단면',HIP_WIDTH:'힙 단면',THIGH_WIDTH:'허벅지 단면',
  RISE:'밑위',OUTSEAM_LENGTH:'총장(하의)'
};
export default function PartnerSizeChartReader({
  db,shopId,majorCategory,subCategory,onApply
}:Props){
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState('');
  const [consent,setConsent]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [analysis,setAnalysis]=useState<AIResult|null>(null);
  useEffect(()=>{
    if(!file){setPreview('');return;}
    const url=URL.createObjectURL(file);
    setPreview(url);return()=>URL.revokeObjectURL(url);
  },[file]);
  useEffect(()=>{setAnalysis(null);setError('');},[majorCategory,subCategory]);
  const reader=(f:File)=>new Promise<string>((resolve,reject)=>{
    const fr=new FileReader();
    fr.onload=()=>typeof fr.result==='string'?resolve(fr.result):reject(new Error('파일 변환 실패'));
    fr.onerror=()=>reject(new Error('이미지를 읽을 수 없습니다.'));
    fr.readAsDataURL(f);
  });
  async function analyze(){
    if(!file||!consent||!db||!shopId||busy)return;
    setBusy(true);setAnalysis(null);setError('');
    try{
      await inspectProductImage(file);
      const imageDataUrl=await reader(file);
      const {data,error:invokeError}=await db.functions.invoke('partner-size-chart-read-v1',{
        body:{shopId,majorCategory,subCategory,imageDataUrl}
      });
      if(invokeError||!data?.success){
        throw new Error(data?.message||data?.error||invokeError?.message||'분석 결과를 불러오지 못했습니다.');
      }
      if(!Array.isArray(data.sizes))throw new Error('분석 데이터가 올바르지 않습니다.');
      setAnalysis(data as AIResult);
    }catch(err){
      setError(err instanceof Error?err.message:String(err));
    }finally{setBusy(false);}
  }
  const fieldCount=analysis?.sizes.reduce((a,s)=>a+Object.keys(s.measurements||{}).length,0)||0;
  function apply(){
    if(!analysis?.sizes.length||fieldCount===0)return;
    const all=analysis.sizes.map(x=>({
      label:x.label,
      measurements:Object.fromEntries(Object.entries(x.measurements||{})
        .filter(([,v])=>Number.isFinite(v)).map(([k,v])=>[k,String(v)])) as Size['measurements']
    }));
    if(!window.confirm('AI 분석값을 아래 사이즈 실측 입력칸에 반영할까요?\n확인 후 실제 상품 사이즈표와 대조하고 저장해 주세요.'))return;
    onApply(all);
    setError('');
  }
  return <section style={{background:'#f0f8f3',border:'1px solid #cce7d6',borderRadius:14,padding:16,marginBottom:18}}>
    <h4 style={{margin:'0 0 7px',color:'#184f35'}}>📷 사이즈표 캡처로 자동 입력</h4>
    <p style={{fontSize:12,color:'#536e5e',margin:'0 0 12px'}}>
      쇼핑몰의 상품 상세 페이지에 있는 사이즈표를 캡처하여 올리세요.
      AI가 사이즈와 cm 실측정보를 추출합니다. <b>확인·수정한 뒤에만 상품 정보로 저장</b>됩니다.
    </p>
    <input type="file" accept="image/jpeg,image/png,image/webp"
      aria-label="의류 상품 사이즈표 캡처 이미지"
      disabled={busy}
      style={{display:'block',width:'100%',marginBottom:9}}
      onChange={async e=>{
        const chosen=e.currentTarget.files?.[0]||null;
        setAnalysis(null);setError('');setFile(null);
        if(!chosen)return;
        try{await inspectProductImage(chosen);setFile(chosen);}
        catch(err){setError(err instanceof Error?err.message:String(err));}
      }}/>
    {preview&&<img src={preview} alt="사이즈표 캡처 미리보기"
      style={{maxWidth:'100%',maxHeight:260,objectFit:'contain',display:'block',margin:'8px 0',border:'1px solid #d9e6dc',borderRadius:9}}/>}
    <label style={{fontSize:12,display:'flex',alignItems:'flex-start',gap:8,margin:'10px 0',color:'#435e4d'}}>
      <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} style={{marginTop:3}}/>
      <span>이미지 내 상품 정보가 외부 AI 분석 서비스로 전송되는 것에 동의합니다. 이미지는 이 기능에서 별도 보관하지 않습니다.</span>
    </label>
    <button type="button" className="secondaryBtn" disabled={!file||!consent||busy||!shopId}
      onClick={()=>void analyze()} style={{marginBottom:8}}>
      {busy?'사이즈표 읽는 중...':'AI로 사이즈표 읽기'}
    </button>
    <p style={{fontSize:11,color:'#607c69'}}>JPG·PNG·WebP · 최대 5MB · 단면/둘레 및 단위가 명확하지 않은 숫자는 자동 입력하지 않습니다.</p>
    {!!error&&<p role="alert" style={{color:'#a72b2b',fontSize:12}}>{error}</p>}
    {analysis&&<div role="status" style={{marginTop:12}}>
      <p style={{fontSize:12,fontWeight:700}}>
        인식 결과 {analysis.sizes.length}개 사이즈 · {fieldCount}개 실측값 · 신뢰도 {analysis.confidence}
        {analysis.quotaRemaining!=null?' · 잔여 분석 '+analysis.quotaRemaining+'회':''}
      </p>
      <div style={{overflowX:'auto',maxHeight:300,overflowY:'auto'}}>
        <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
          <thead><tr><th style={{textAlign:'left',padding:5}}>사이즈</th><th style={{textAlign:'left',padding:5}}>인식된 cm 값</th></tr></thead>
          <tbody>{analysis.sizes.map((row,i)=><tr key={i}>
            <td style={{padding:5,verticalAlign:'top'}}><b>{row.label}</b></td>
            <td style={{padding:5}}>{Object.entries(row.measurements||{}).map(([k,v])=>labels[k as Dimension]+' '+v).join(' · ')||'확인 필요'}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {!!analysis.warnings?.length&&<div style={{fontSize:12,color:'#9a6314',marginTop:10}}>
        {analysis.warnings.map((w,i)=><p key={i} style={{margin:'4px 0'}}>⚠ {w}</p>)}
      </div>}
      <button type="button" className="primaryBtn" disabled={!fieldCount||busy}
        style={{marginTop:12}} onClick={apply}>
        아래 사이즈 입력칸에 반영
      </button>
      <p style={{fontSize:11,color:'#476755'}}>AI 결과는 자동 저장되지 않습니다. 비어 있는 항목은 직접 확인해 입력하고 상품 저장 버튼을 누르세요.</p>
    </div>}
  </section>;
}
