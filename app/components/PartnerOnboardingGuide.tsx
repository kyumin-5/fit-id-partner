'use client';

import {useEffect,useState} from 'react';

const steps=[
  {name:'쇼핑몰 상품 등록 또는 CSV 일괄 등록',detail:'상품번호·카테고리·사이즈를 먼저 등록합니다.',tab:'products'},
  {name:'실측표와 상품 사진 확인',detail:'사이즈표 AI 추출값은 실제 표와 대조하고, 가상피팅 사진을 등록합니다.',tab:'products'},
  {name:'쇼핑몰 상품번호 매핑 확인',detail:'상품번호 연결을 확인한 뒤 SDK 설치 코드를 생성합니다.',tab:'integration'},
  {name:'상품 상세페이지에 FIT ID 버튼 설치',detail:'설치 코드를 테스트 상품 페이지에 넣고 버튼 디자인을 확인합니다.',tab:'integration'},
  {name:'실제 클릭·FIT CHECK 테스트',detail:'기본 추천 흐름을 검증하고 실데이터 대시보드를 확인합니다.',tab:'analytics'}
] as const;
export default function PartnerOnboardingGuide({
  shopId,onNavigate
}:{shopId:string;onNavigate:(tab:'products'|'integration'|'analytics')=>void}){
  const [checked,setChecked]=useState<number[]>([]);
  useEffect(()=>{
    if(!shopId){setChecked([]);return;}
    try{
      const parsed=JSON.parse(localStorage.getItem('fitid-onboarding:'+shopId)||'[]');
      setChecked(Array.isArray(parsed)?parsed.filter((v):v is number=>Number.isInteger(v)&&v>=0&&v<steps.length):[]);
    }catch{setChecked([]);}
  },[shopId]);
  const toggle=(i:number)=>{
    const next=checked.includes(i)?checked.filter(x=>x!==i):[...checked,i];
    setChecked(next);
    try{localStorage.setItem('fitid-onboarding:'+shopId,JSON.stringify(next));}catch{}
  };
  return <section className="panel" style={{padding:24,marginBottom:22}}>
    <div className="panelHeader">
      <div>
        <p className="sectionLabel">PARTNER ONBOARDING</p>
        <h3>쇼핑몰 연동 시작 가이드</h3>
        <p style={{fontSize:12,color:'#648171',margin:'7px 0 0'}}>
          작업 완료 여부는 현재 브라우저에만 저장됩니다. 기능 사용 가능 여부는 상품별 연동 준비도에서 별도 확인해주세요.
        </p>
      </div>
      <strong style={{color:'#0c6842'}}>{checked.length} / {steps.length} 완료</strong>
    </div>
    <div style={{display:'grid',gap:10,marginTop:16}}>
      {steps.map((step,i)=><div key={step.name}
        style={{border:'1px solid #e2eee5',borderRadius:10,padding:14,display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <label style={{display:'flex',gap:10,flex:'1 1 240px',alignItems:'flex-start',cursor:'pointer'}}>
          <input type="checkbox" checked={checked.includes(i)} onChange={()=>toggle(i)}
            aria-label={step.name+' 완료 표시'} style={{marginTop:4}}/>
          <span><strong style={{display:'block',fontSize:13}}>{i+1}. {step.name}</strong>
            <small style={{color:'#6c8275'}}>{step.detail}</small></span>
        </label>
        <button type="button" className="secondaryBtn" style={{fontSize:12,padding:'8px 10px'}}
          onClick={()=>onNavigate(step.tab)}>이동 ↗</button>
      </div>)}
    </div>
  </section>;
}
