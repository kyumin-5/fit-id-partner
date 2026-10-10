'use client';
import {useEffect,useState} from 'react';
import {validMerchantProductId} from '../lib/sdkInstall';

type Props={
  db:any;
  shopId:string;
  productId:string;
  productName:string;
  currentMerchantId:string;
  onSaved:()=>Promise<void>;
};
export default function PartnerMerchantMapping({
  db,shopId,productId,productName,currentMerchantId,onSaved
}:Props){
  const [value,setValue]=useState(currentMerchantId||'');
  const [editing,setEditing]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  useEffect(()=>{setValue(currentMerchantId||'');},[currentMerchantId,productId]);
  async function save(next:string|null){
    if(!db||!shopId||!productId||busy)return;
    if(next!==null&&!validMerchantProductId(next)){
      setMessage('쇼핑몰 상품번호는 1~120자이며 줄바꿈을 사용할 수 없습니다.');
      return;
    }
    setBusy(true);setMessage('');
    try{
      const {data,error}=await db.from('products')
        .update({merchant_product_id:next})
        .eq('id',productId).eq('shop_id',shopId)
        .select('merchant_product_id').single();
      if(error)throw error;
      if((data?.merchant_product_id||null)!==next)throw Error('저장 확인에 실패했습니다.');
      await onSaved();
      setEditing(false);
      setMessage(next?'쇼핑몰 상품번호 연결 완료':'상품번호 연결 해제 완료');
    }catch(e){
      setMessage('연결 실패: '+(e instanceof Error?e.message:String(e))+
        ' · 다른 상품에서 이미 사용 중인 번호인지 확인해 주세요.');
    }finally{setBusy(false);}
  }
  return <div style={{border:'1px solid #dbe7df',borderRadius:12,padding:12,marginTop:9}}>
    <div style={{fontSize:11,fontWeight:800,color:'#27553b'}}>쇼핑몰 상품번호</div>
    {!editing?(
      <div style={{display:'flex',alignItems:'center',gap:9,flexWrap:'wrap',marginTop:5}}>
        <strong style={{fontSize:12,color:currentMerchantId?'#18593d':'#946b1d',wordBreak:'break-all'}}>
          {currentMerchantId||'미연결'}
        </strong>
        <button type="button" disabled={busy} onClick={()=>setEditing(true)}
          style={{border:0,background:'#e9f5ec',color:'#136240',borderRadius:8,padding:'6px 10px',fontSize:11,cursor:'pointer'}}>
          {currentMerchantId?'변경':'번호 연결'}
        </button>
      </div>
    ):(
      <div style={{marginTop:7}}>
        <label htmlFor={'merchant-id-'+productId} style={{display:'block',fontSize:11,color:'#637c68',marginBottom:5}}>
          {productName}의 쇼핑몰 관리자 상품번호를 입력하세요.
        </label>
        <input id={'merchant-id-'+productId} value={value} maxLength={120}
          onChange={e=>setValue(e.target.value)}
          placeholder="예: 12345 또는 SKU-2026-01"
          style={{padding:9,width:'100%',border:'1px solid #c7dacd',borderRadius:8,fontSize:12}}/>
        <div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:8}}>
          <button type="button" disabled={busy||!validMerchantProductId(value.trim())}
            onClick={()=>void save(value.trim())} style={{padding:'8px 11px',background:'#0a5336',color:'#fff',border:0,borderRadius:8,fontSize:11,cursor:'pointer'}}>저장</button>
          <button type="button" disabled={busy} onClick={()=>{setValue(currentMerchantId||'');setEditing(false);}}
            style={{padding:'8px 11px',background:'#e8f0eb',border:0,borderRadius:8,fontSize:11,cursor:'pointer'}}>취소</button>
          {!!currentMerchantId&&<button type="button" disabled={busy} onClick={()=>{
            if(window.confirm('쇼핑몰 상품번호 연결을 해제할까요? 기존 FIT ID와 상품 데이터는 유지됩니다.'))void save(null);
          }} style={{padding:'8px 11px',background:'transparent',border:'1px solid #d8a7a7',color:'#9a3636',borderRadius:8,fontSize:11,cursor:'pointer'}}>연결 해제</button>}
        </div>
      </div>
    )}
    {!!message&&<p role="status" style={{fontSize:11,margin:'7px 0 0',color:message.startsWith('연결 실패')?'#ac3434':'#28724c'}}>{message}</p>}
  </div>;
}
