'use client';

import {useState} from 'react';

const clean=(raw:string)=>Math.max(0,Number(raw)||0);
const won=(n:number)=>new Intl.NumberFormat('ko-KR',{maximumFractionDigits:0}).format(Math.round(n))+'원';

/** Scenario planning, not an observed retention or conversion metric. */
export default function PartnerROICalculator(){
  const [monthlyReturns,setMonthlyReturns]=useState('0');
  const [sizeShare,setSizeShare]=useState('0');
  const [costPerReturn,setCostPerReturn]=useState('0');
  const [assumedDrop,setAssumedDrop]=useState('0');
  const base=clean(monthlyReturns);
  const share=Math.min(100,clean(sizeShare))/100;
  const cost=clean(costPerReturn);
  const reduction=Math.min(100,clean(assumedDrop))/100;
  const affected=base*share;
  const expectedAvoided=affected*reduction;
  const estimatedSavings=expectedAvoided*cost;
  const subscription=150000;
  const net=estimatedSavings-subscription;
  const fields=[
    {label:'월 교환·반품 건수',value:monthlyReturns,set:setMonthlyReturns,max:100000,unit:'건'},
    {label:'사이즈 문제 비중',value:sizeShare,set:setSizeShare,max:100,unit:'%'},
    {label:'1건당 평균 처리비',value:costPerReturn,set:setCostPerReturn,max:10000000,unit:'원'},
    {label:'가정한 감소율',value:assumedDrop,set:setAssumedDrop,max:100,unit:'%'}
  ];
  return <section className="panel" style={{padding:24,margin:'0 0 24px'}}>
    <p className="sectionLabel">SCENARIO TOOL · NOT OBSERVED</p>
    <h3 style={{margin:'6px 0 8px'}}>반품 처리비 절감 시나리오 계산기</h3>
    <p style={{color:'#668071',fontSize:12,lineHeight:1.7}}>
      쇼핑몰에서 직접 입력한 가정으로 월 15만 원 구독 대비 비용 효과를 추산합니다.
      실제 FIT ID 도입 성과나 인과효과를 입증하는 지표가 아닙니다.
    </p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',gap:12,marginTop:17}}>
      {fields.map(field=><label key={field.label} style={{fontSize:12,fontWeight:700,color:'#456a54'}}>
        {field.label}
        <div style={{display:'flex',alignItems:'center',gap:8,marginTop:5}}>
          <input type="number" min={0} max={field.max} step="1" value={field.value}
            onChange={e=>field.set(e.target.value)}
            style={{minWidth:0,width:'100%',padding:10,border:'1px solid #d4e4d9',borderRadius:8}}/>
          <span>{field.unit}</span>
        </div>
      </label>)}
    </div>
    <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:18}}>
      <div style={{flex:'1 1 150px',padding:15,borderRadius:10,background:'#f2f9f4'}}>
        <div style={{fontSize:12}}>가정상 감소 건수</div><strong style={{fontSize:22}}>{expectedAvoided.toFixed(1)}건</strong>
      </div>
      <div style={{flex:'1 1 150px',padding:15,borderRadius:10,background:'#f2f9f4'}}>
        <div style={{fontSize:12}}>예상 처리비 절감</div><strong style={{fontSize:22}}>{won(estimatedSavings)}</strong>
      </div>
      <div style={{flex:'1 1 150px',padding:15,borderRadius:10,background:'#f2f9f4'}}>
        <div style={{fontSize:12}}>구독료 제외 차액</div><strong style={{fontSize:22}}>{won(net)}</strong>
      </div>
    </div>
    <p style={{fontSize:11,color:'#6b7b71',marginTop:14}}>
      계산식: 월 반품 건수 × 사이즈 관련 비중 × 가정 감소율 × 건당 처리비 − 월 구독료 150,000원.
      배송비·상품 손실·인건비 등 실제 비용 중복을 피해서 입력해야 합니다.
    </p>
  </section>;
}
