'use client';

import {
  useEffect,
  useState,
  type ReactNode
} from 'react';

import {
  createClient
} from '@supabase/supabase-js';
import PartnerLanding from './PartnerLanding';

const supabaseUrl=
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey=
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase=
  supabaseUrl&&supabaseKey
    ?createClient(supabaseUrl,supabaseKey)
    :null;

export default function PartnerAuthGate({
  children
}:{
  children:(authUserId:string)=>ReactNode;
}){
  const [userId,setUserId]=useState('');
  const [loading,setLoading]=useState(true);
  const [showAuthForm,setShowAuthForm]=useState(false);

  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [mode,setMode]=useState<'login'|'signup'>('login');
  const [message,setMessage]=useState('');
  const [working,setWorking]=useState(false);

  async function registerPartnerProfile(uid:string){
    if(!supabase)return;

    const {error}=await supabase
      .from('partner_profiles')
      .upsert(
        {
          auth_user_id:uid
        },
        {
          onConflict:'auth_user_id'
        }
      );

    if(error){
      console.log(
        'partner profile registration error:',
        error.message
      );
    }
  }

  useEffect(()=>{
    if(!supabase){
      setMessage('Supabase environment is not configured.');
      setLoading(false);
      return;
    }

    const db=supabase;

    void db.auth.getSession().then(async({data})=>{
      const uid=data.session?.user?.id||'';

      if(uid){
        await registerPartnerProfile(uid);
      }

      setUserId(uid);
      setLoading(false);
    });

    const {
      data:subscription
    }=db.auth.onAuthStateChange(
      async(_event,session)=>{
        const uid=session?.user?.id||'';

        if(uid){
          await registerPartnerProfile(uid);
        }

        setUserId(uid);
        setLoading(false);
      }
    );

    return ()=>{
      subscription.subscription.unsubscribe();
    };
  },[]);

  async function submit(){
    if(!supabase)return;

    if(!email.trim()||!password){
      setMessage('Email and password are required.');
      return;
    }

    setWorking(true);
    setMessage('');

    try{
      if(mode==='login'){
        const {error}=await supabase.auth
          .signInWithPassword({
            email:email.trim(),
            password
          });

        if(error)throw error;

      }else{
        const {data,error}=await supabase.auth
          .signUp({
            email:email.trim(),
            password
          });

        if(error)throw error;

        if(!data.session){
          setMessage(
            'Account created. Complete email confirmation if requested.'
          );
        }
      }
    }catch(e:any){
      setMessage(
        e?.message||String(e)
      );
    }finally{
      setWorking(false);
    }
  }

  async function logout(){
    if(!supabase)return;
    await supabase.auth.signOut();
    setShowAuthForm(false);
  }

  if(loading){
    return(
      <div style={{
        minHeight:'100vh',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        background:'#f5f7f8',
        fontFamily:'Arial,Helvetica,sans-serif'
      }}>
        FIT ID Partner loading...
      </div>
    );
  }

  if(!userId&&!showAuthForm){
    return <PartnerLanding
      onLogin={()=>{setMode('login');setMessage('');setShowAuthForm(true);}}
      onSignup={()=>{setMode('signup');setMessage('');setShowAuthForm(true);}}
    />;
  }

  if(!userId){
    return(
      <div style={{
        minHeight:'100vh',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        background:'#f5f7f8',
        padding:24,
        fontFamily:'Arial,Helvetica,sans-serif'
      }}>
        <div style={{
          width:'100%',
          maxWidth:420,
          background:'#fff',
          border:'1px solid #e5e7eb',
          borderRadius:22,
          padding:30,
          boxShadow:'0 20px 50px rgba(17,24,39,.08)'
        }}>
          <button
            type="button"
            onClick={()=>{setShowAuthForm(false);setMessage('');}}
            style={{border:0,background:'transparent',color:'#2E7050',fontWeight:700,padding:'0 0 18px',cursor:'pointer'}}
          >← 파트너 홈으로 돌아가기</button>
          <div style={{
            width:48,
            height:48,
            borderRadius:14,
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            background:'#16a36a',
            color:'#fff',
            fontSize:22,
            fontWeight:900,
            marginBottom:18
          }}>
            F
          </div>

          <div style={{
            fontSize:11,
            fontWeight:900,
            letterSpacing:1.7,
            color:'#8a94a4'
          }}>
            FIT ID PARTNER
          </div>

          <h1 style={{
            margin:'7px 0 8px',
            fontSize:28
          }}>
            {mode==='login'
              ?'Partner Login'
              :'Create Partner Account'}
          </h1>

          <p style={{
            margin:'0 0 22px',
            color:'#6b7280',
            fontSize:13,
            lineHeight:1.6
          }}>
            상품 등록과 FIT CHECK 데이터를
            쇼핑몰 계정별로 관리합니다.
          </p>

          <input
            value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            style={{marginBottom:10}}
          />

          <input
            value={password}
            onChange={e=>setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            onKeyDown={e=>{
              if(e.key==='Enter'){
                void submit();
              }
            }}
          />

          {!!message&&(
            <div style={{
              marginTop:12,
              padding:11,
              borderRadius:10,
              background:'#f6f8f9',
              color:'#6b7280',
              fontSize:12
            }}>
              {message}
            </div>
          )}

          <button
            className="primaryBtn"
            style={{
              width:'100%',
              marginTop:16
            }}
            disabled={working}
            onClick={()=>void submit()}
          >
            {working
              ?'Processing...'
              :mode==='login'
                ?'Login'
                :'Create account'}
          </button>

          <button
            style={{
              width:'100%',
              border:0,
              background:'transparent',
              marginTop:13,
              color:'#667085',
              fontWeight:800
            }}
            onClick={()=>{
              setMessage('');
              setMode(
                mode==='login'
                  ?'signup'
                  :'login'
              );
            }}
          >
            {mode==='login'
              ?'Create Partner account'
              :'Back to login'}
          </button>
        </div>
      </div>
    );
  }

  return(
    <>
      {children(userId)}

      <button
        onClick={()=>void logout()}
        style={{
          position:'fixed',
          right:22,
          bottom:22,
          zIndex:1000,
          border:'1px solid #d7dce2',
          background:'#fff',
          padding:'9px 12px',
          borderRadius:10,
          fontWeight:800,
          boxShadow:'0 8px 25px rgba(0,0,0,.08)'
        }}
      >
        Logout
      </button>
    </>
  );
}
