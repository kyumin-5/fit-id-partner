'use client';
import {useEffect,useState} from 'react';
import {inspectProductImage,publicPartnerImageUrl,uploadPartnerProductImage} from '../lib/productImage';

type Props={
  db:any;authUserId:string;shopId:string;
  productId:string;productName:string;imagePath:string;
  onUploaded:()=>Promise<void>;
  compact?:boolean;
};
export default function PartnerProductPhoto({
  db,authUserId,shopId,productId,productName,imagePath,onUploaded,compact=false
}:Props){
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  useEffect(()=>{
    if(!file){setPreview('');return;}
    const objectUrl=URL.createObjectURL(file);
    setPreview(objectUrl);
    return ()=>URL.revokeObjectURL(objectUrl);
  },[file]);
  const currentUrl=publicPartnerImageUrl(db,imagePath);
  const visible=preview||(!compact?currentUrl:'');
  async function save(){
    if(!file||busy||!db)return;
    setBusy(true);setMessage('');
    try{
      const uploaded=await uploadPartnerProductImage({
        db,shopId,authUserId,productId,file
      });
      setFile(null);
      await onUploaded();
      setMessage('상품 사진 저장 완료 · 가상피팅 이미지로 연결되었습니다.');
      if(!uploaded.imagePath)throw Error('Missing saved image path');
    }catch(err){
      setMessage('업로드 실패: '+(err instanceof Error?err.message:String(err)));
    }finally{setBusy(false);}
  }
  return <div style={{padding:'12px 0',display:'grid',gap:10}}>
    {visible?<img src={visible} alt={productName+' 상품 대표사진'}
      style={{display:'block',width:'100%',maxHeight:220,objectFit:'contain',borderRadius:10,background:'#eef4ef'}}/>
      :compact?null:<div style={{padding:16,textAlign:'center',border:'1px dashed #b6c9ba',borderRadius:10,
        color:'#66766d',fontSize:12}}>등록된 상품 사진이 없습니다.</div>}
    <label style={{fontSize:12,fontWeight:700,color:'#224b34'}}>
      {currentUrl?'상품 사진 교체':'상품 사진 등록'}
      <input type="file" accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        style={{display:'block',width:'100%',marginTop:6,fontSize:12}}
        onChange={async e=>{
          setMessage('');
          const next=e.currentTarget.files?.[0]||null;
          if(!next){setFile(null);return;}
          try{await inspectProductImage(next);setFile(next);}
          catch(err){setFile(null);setMessage(err instanceof Error?err.message:String(err));}
        }}/>
    </label>
    <button type="button" className="secondaryBtn" disabled={!file||busy}
      onClick={()=>void save()} style={{width:'100%'}}>
      {busy?'업로드 중...':'선택한 사진 저장'}
    </button>
    {!!message&&<div role="status" style={{color:message.startsWith('업로드 실패')?'#a52b2b':'#167348',fontSize:12}}>{message}</div>}
    <small style={{fontSize:11,color:'#6d7c70'}}>5MB 이하 JPG·PNG·WebP · 상품이 정면으로 보이는 단독 이미지 권장</small>
  </div>;
}
