'use client';

import {useEffect,useState} from 'react';

type Shop={id:string;name:string};
type Props={
  db:any;authUserId:string;shopId:string;
  onSwitch:(shop:Shop)=>Promise<void>;
};
export default function PartnerShopSwitcher({db,authUserId,shopId,onSwitch}:Props){
  const [shops,setShops]=useState<Shop[]>([]);
  const [newName,setNewName]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  async function refresh(){
    if(!db||!authUserId)return;
    const {data,error}=await db.from('shops').select('id,name')
      .eq('owner_user_id',authUserId).order('created_at',{ascending:true});
    if(error){setNotice('쇼핑몰 목록을 불러오지 못했습니다: '+error.message);return;}
    setShops((data||[]) as Shop[]);
  }
  useEffect(()=>{void refresh();},[db,authUserId,shopId]);
  async function switchTo(id:string){
    const shop=shops.find(item=>item.id===id);
    if(!shop||!db||busy)return;
    setBusy(true);setNotice('');
    try{await onSwitch(shop);}catch(e){setNotice('쇼핑몰 전환 실패: '+String(e));}
    finally{setBusy(false);}
  }
  async function add(){
    const name=newName.trim();
    if(!db||!authUserId||busy)return;
    if(name.length<2||name.length>70){setNotice('쇼핑몰명은 2~70자로 입력해주세요.');return;}
    if(shops.some(s=>s.name.toLowerCase()===name.toLowerCase())){
      setNotice('같은 이름의 쇼핑몰이 이미 있습니다.');return;
    }
    if(!window.confirm('새 쇼핑몰 '+name+'을(를) 생성할까요? 쇼핑몰마다 상품과 통계가 분리됩니다.'))return;
    setBusy(true);setNotice('');
    try{
      const {data,error}=await db.from('shops').insert({name,owner_user_id:authUserId}).select('id,name').single();
      if(error)throw error;
      await refresh();
      await onSwitch(data as Shop);
      setNewName('');
      setNotice('새 쇼핑몰을 생성하고 전환했습니다.');
    }catch(e){setNotice('쇼핑몰 추가 실패: '+(e instanceof Error?e.message:String(e)));}
    finally{setBusy(false);}
  }
  return <section className="panel" style={{padding:20,margin:'0 0 24px'}}>
    <p className="sectionLabel">MULTI-SHOP WORKSPACE</p>
    <h3 style={{margin:'6px 0 8px'}}>쇼핑몰·브랜드 전환</h3>
    <p style={{fontSize:12,color:'#688070'}}>각 쇼핑몰의 상품·연동 코드·분석 지표는 별도로 관리됩니다.</p>
    <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
      <select value={shopId} disabled={busy||shops.length===0}
        aria-label="관리할 쇼핑몰 선택"
        onChange={event=>void switchTo(event.target.value)}
        style={{flex:'1 1 190px',padding:11,border:'1px solid #cadbce',borderRadius:10}}>
        {!shops.some(s=>s.id===shopId)&&<option value={shopId}>현재 쇼핑몰</option>}
        {shops.map(shop=><option key={shop.id} value={shop.id}>{shop.name}</option>)}
      </select>
      <input value={newName} disabled={busy} maxLength={70} placeholder="새 쇼핑몰명"
        onChange={event=>setNewName(event.target.value)}
        style={{flex:'1 1 180px',padding:11,border:'1px solid #cadbce',borderRadius:10}}/>
      <button type="button" className="secondaryBtn" disabled={busy||newName.trim().length<2}
        onClick={()=>void add()}>+ 쇼핑몰 추가</button>
    </div>
    {!!notice&&<p role="status" style={{fontSize:12,color:'#476957',margin:'10px 0 0'}}>{notice}</p>}
  </section>;
}
