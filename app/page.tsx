'use client';

import {useEffect,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import PartnerAuthGate from './PartnerAuthGate';
import PocDashboard from './PocDashboard';

type MajorCategory='TOP'|'BOTTOM'|'OUTER'|'DRESS';

type DimensionKey=
  |'CHEST_WIDTH'
  |'SHOULDER_WIDTH'
  |'SLEEVE_LENGTH'
  |'BODY_LENGTH'
  |'HEM_WIDTH'
  |'WAIST_WIDTH'
  |'HIP_WIDTH'
  |'THIGH_WIDTH'
  |'RISE'
  |'OUTSEAM_LENGTH';

type Size={
  label:string;
  measurements:Partial<Record<DimensionKey,string>>;
};

type Product={
  id:string;
  code:string;
  name:string;
  material:string;
  stretch:string;
  majorCategory:MajorCategory;
  subCategory:string;
  sizes:Size[];
};

type Tab='dashboard'|'products'|'analytics'|'integration';

const CATEGORY_REGISTRY:Record<
  MajorCategory,
  {
    label:string;
    dimensions:DimensionKey[];
    subCategories:Array<[string,string,DimensionKey[]?]>;
  }
>={
  TOP:{
    label:'상의',
    dimensions:[
      'CHEST_WIDTH',
      'SHOULDER_WIDTH',
      'SLEEVE_LENGTH',
      'BODY_LENGTH',
      'HEM_WIDTH'
    ],
    subCategories:[
      ['TSHIRT','티셔츠'],
      ['SHIRT','셔츠'],
      ['BLOUSE','블라우스'],
      ['KNIT','니트'],
      ['SWEATSHIRT','스웨트셔츠'],
      ['HOODIE','후드'],
      ['SLEEVELESS','민소매',[
        'CHEST_WIDTH',
        'SHOULDER_WIDTH',
        'BODY_LENGTH',
        'HEM_WIDTH'
      ]]
    ]
  },

  BOTTOM:{
    label:'하의',
    dimensions:[
      'WAIST_WIDTH',
      'HIP_WIDTH',
      'THIGH_WIDTH',
      'RISE',
      'OUTSEAM_LENGTH',
      'HEM_WIDTH'
    ],
    subCategories:[
      ['PANTS','바지'],
      ['SLACKS','슬랙스'],
      ['DENIM','데님'],
      ['JOGGER','조거'],
      ['WIDE_PANTS','와이드 팬츠'],
      ['SHORTS','반바지'],
      ['SKIRT','스커트',[
        'WAIST_WIDTH',
        'HIP_WIDTH',
        'OUTSEAM_LENGTH',
        'HEM_WIDTH'
      ]],
      ['LEGGINGS','레깅스']
    ]
  },

  OUTER:{
    label:'아우터',
    dimensions:[
      'CHEST_WIDTH',
      'SHOULDER_WIDTH',
      'SLEEVE_LENGTH',
      'BODY_LENGTH',
      'HEM_WIDTH'
    ],
    subCategories:[
      ['JACKET','재킷'],
      ['COAT','코트'],
      ['PADDING','패딩'],
      ['CARDIGAN','가디건'],
      ['WINDBREAKER','윈드브레이커'],
      ['VEST','베스트',[
        'CHEST_WIDTH',
        'SHOULDER_WIDTH',
        'BODY_LENGTH',
        'HEM_WIDTH'
      ]]
    ]
  },

  DRESS:{
    label:'원피스',
    dimensions:[
      'CHEST_WIDTH',
      'WAIST_WIDTH',
      'HIP_WIDTH',
      'SHOULDER_WIDTH',
      'SLEEVE_LENGTH',
      'BODY_LENGTH'
    ],
    subCategories:[
      ['MINI_DRESS','미니 원피스'],
      ['MIDI_DRESS','미디 원피스'],
      ['LONG_DRESS','롱 원피스']
    ]
  }
};

const DIMENSION_UI:Record<
  DimensionKey,
  {label:string;english:string}
>={
  CHEST_WIDTH:{label:'가슴 단면',english:'CHEST'},
  SHOULDER_WIDTH:{label:'어깨 너비',english:'SHOULDER'},
  SLEEVE_LENGTH:{label:'소매 길이',english:'SLEEVE'},
  BODY_LENGTH:{label:'총장',english:'LENGTH'},
  HEM_WIDTH:{label:'밑단 단면',english:'HEM'},
  WAIST_WIDTH:{label:'허리 단면',english:'WAIST'},
  HIP_WIDTH:{label:'힙 단면',english:'HIP'},
  THIGH_WIDTH:{label:'허벅지 단면',english:'THIGH'},
  RISE:{label:'밑위',english:'RISE'},
  OUTSEAM_LENGTH:{label:'총장',english:'LENGTH'}
};

const getDimensions=(
  major:MajorCategory,
  sub:string
)=>{
  const definition=CATEGORY_REGISTRY[major];
  const found=definition.subCategories.find(
    item=>item[0]===sub
  );

  return found?.[2]||definition.dimensions;
};

const makeSize=(
  label:string,
  values:Partial<Record<DimensionKey,string>>={}
):Size=>({
  label,
  measurements:{...values}
});

const seed:Size[]=[
  makeSize('S',{
    WAIST_WIDTH:'35',
    HIP_WIDTH:'47',
    THIGH_WIDTH:'28',
    RISE:'29',
    OUTSEAM_LENGTH:'100',
    HEM_WIDTH:'20'
  }),
  makeSize('M',{
    WAIST_WIDTH:'37',
    HIP_WIDTH:'49',
    THIGH_WIDTH:'29',
    RISE:'30',
    OUTSEAM_LENGTH:'102',
    HEM_WIDTH:'21'
  }),
  makeSize('L',{
    WAIST_WIDTH:'39',
    HIP_WIDTH:'51',
    THIGH_WIDTH:'30',
    RISE:'31',
    OUTSEAM_LENGTH:'104',
    HEM_WIDTH:'22'
  })
];

const blank=():Size=>makeSize('');

const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey=
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl,supabaseKey)
    : null;

function PartnerApp({authUserId}:{authUserId:string}){
  const [tab,setTab]=useState<Tab>('dashboard');
  const [shop,setShop]=useState('Partner Workspace');
  const [shopId,setShopId]=useState('');
  const [name,setName]=useState('');
  const [material,setMaterial]=useState('');
  const [stretch,setStretch]=useState('조금');
  const [majorCategory,setMajorCategory]=useState<MajorCategory>('BOTTOM');
  const [subCategory,setSubCategory]=useState('PANTS');
  const [sizes,setSizes]=useState<Size[]>(seed);
  const [products,setProducts]=useState<Product[]>([]);
  const [latest,setLatest]=useState<Product|null>(null);
  const [saving,setSaving]=useState(false);
  const [status,setStatus]=useState('');
  const [editingProductId,setEditingProductId]=
    useState<string|null>(null);

  // The installation snippet is generated from products owned by the signed-in partner.
  const [sdkSelectedCode,setSdkSelectedCode]=useState('');
  const selectedSdkProductCode=
    products.some(item=>item.code===sdkSelectedCode)
      ?sdkSelectedCode
      :(products[0]?.code||'');
  const sdkInstallSnippet=selectedSdkProductCode&&shopId
    ?'<div data-fit-id-product-code="'+selectedSdkProductCode+
      '" data-fit-id-shop-id="'+shopId+'"></div>\n'+
      '<script defer src="https://fit-id-demo-malls.vercel.app/sdk/v1/fit-id.js"></script>'
    :'';

  useEffect(()=>{
    void initPartner();
  },[authUserId]);

  async function initPartner(){
    if(!supabase){
      setStatus(
        'Supabase environment is not configured.'
      );
      return;
    }

    const db=supabase;

    setStatus(
      'Partner workspace loading...'
    );

    async function findOwnedShop(){
      const {
        data,
        error
      }=await db
        .from('shops')
        .select('id,name')
        .eq('owner_user_id',authUserId)
        .limit(1)
        .maybeSingle();

      if(error){
        throw error;
      }

      return data as {
        id:string;
        name:string;
      }|null;
    }

    try{
      let owned=await findOwnedShop();

      if(!owned?.id){
        const {
          data:created,
          error:createError
        }=await db
          .from('shops')
          .insert({
            name:'MY SHOP',
            owner_user_id:authUserId
          })
          .select('id,name')
          .single();

        if(createError){
          /*
           * 여러 탭에서 동시에 첫 로그인했을 경우
           * DB unique index가 중복 생성을 막는다.
           * 그때는 이미 생성된 자기 shop을 다시 조회한다.
           */
          if(createError.code==='23505'){
            owned=await findOwnedShop();
          }else{
            throw createError;
          }
        }else{
          owned=created as {
            id:string;
            name:string;
          };
        }
      }

      if(!owned?.id){
        throw new Error(
          'Partner shop could not be initialized.'
        );
      }

      setShopId(owned.id);
      setShop(owned.name);

      await loadProducts(owned.id);

    }catch(e:any){
      setShopId('');
      setProducts([]);
      setShop('Partner Workspace');

      setStatus(
        'Partner shop initialization failed: '+
        (e?.message||String(e))
      );
    }
  }

  async function loadProducts(targetShopId=shopId){
    if(!targetShopId){
      setProducts([]);
      return;
    }

    if(!supabase){
      setStatus('Supabase 환경변수가 없습니다. .env.local을 확인해주세요.');
      return;
    }

    const db=supabase;

    const {data,error}=await db
      .from('products')
      .select(
        'id,code,name,material,stretch,major_category,sub_category,product_sizes(size_label,waist,hip,thigh,rise,length,measurements,measurement_semantics,measurement_schema_version)'
      )
      .eq('shop_id',targetShopId)
      .order('created_at',{ascending:false});

    if(error){
      setStatus('DB 조회 실패: '+error.message);
      return;
    }

    const mapped:Product[]=(data??[]).map((p:any)=>{
      const major:MajorCategory=
        ['TOP','BOTTOM','OUTER','DRESS'].includes(
          String(p.major_category||'')
        )
          ?p.major_category
          :'BOTTOM';

      const sub=
        String(
          p.sub_category||
          (major==='BOTTOM'?'PANTS':'')
        ).trim().toUpperCase();

      return {
        id:p.id,
        code:p.code,
        name:p.name,
        material:p.material??'',
        stretch:p.stretch??'',
        majorCategory:major,
        subCategory:sub,
        sizes:(p.product_sizes??[]).map((row:any)=>{
          const raw=
            row?.measurements &&
            typeof row.measurements==='object'
              ?row.measurements
              :{};

          const measurements:Partial<Record<DimensionKey,string>>={};

          getDimensions(major,sub).forEach(key=>{
            const legacy=
              key==='WAIST_WIDTH'
                ?row.waist
                :key==='HIP_WIDTH'
                  ?row.hip
                  :key==='THIGH_WIDTH'
                    ?row.thigh
                    :key==='RISE'
                      ?row.rise
                      :key==='OUTSEAM_LENGTH'
                        ?row.length
                        :null;

            const value=raw[key]??legacy;

            if(value!=null&&String(value)!==''){
              measurements[key]=String(value);
            }
          });

          return {
            label:String(row.size_label||''),
            measurements
          };
        })
      };
    });

    setProducts(mapped);
    setStatus('Supabase 연결됨 · 등록 상품을 불러왔습니다.');
  }

  const changeLabel=(i:number,v:string)=>{
    setSizes(current=>
      current.map(
        (row,index)=>
          index===i
            ?{...row,label:v}
            :row
      )
    );
  };

  const changeMeasurement=(
    i:number,
    key:DimensionKey,
    value:string
  )=>{
    setSizes(current=>
      current.map(
        (row,index)=>
          index===i
            ?{
                ...row,
                measurements:{
                  ...row.measurements,
                  [key]:value
                }
              }
            :row
      )
    );
  };

  const resetProductForm=()=>{
    setEditingProductId(null);
    setName('');
    setMaterial('');
    setStretch('조금');
    setMajorCategory('BOTTOM');
    setSubCategory('PANTS');
    setSizes(seed.map(row=>({
      label:row.label,
      measurements:{...row.measurements}
    })));
  };

  const changeMajorCategory=(major:MajorCategory)=>{
    const firstSub=
      CATEGORY_REGISTRY[
        major
      ].subCategories[0]?.[0]||
      '';

    setMajorCategory(major);
    setSubCategory(firstSub);

    setSizes(current=>
      current.map(row=>({
        label:row.label,
        measurements:{}
      }))
    );
  };

  const changeSubCategory=(sub:string)=>{
    setSubCategory(sub);

    setSizes(current=>
      current.map(row=>({
        label:row.label,
        measurements:{}
      }))
    );
  };

  const startEdit=(p:Product)=>{
    setEditingProductId(p.id);
    setName(p.name);
    setMaterial(p.material);
    setStretch(p.stretch||'조금');
    setMajorCategory(p.majorCategory);
    setSubCategory(p.subCategory);
    setSizes(
      p.sizes.length
        ?p.sizes.map(row=>({
            label:row.label,
            measurements:{...row.measurements}
          }))
        :[blank()]
    );
    setStatus(
      '수정 모드 · '+p.code+' · 수정 후 기존 저장 버튼을 눌러주세요.'
    );

    window.scrollTo({
      top:0,
      behavior:'smooth'
    });
  };

  async function removeProduct(p:Product){
    if(!supabase||!shopId)return;

    const confirmed=window.confirm(
      '"'+p.name+'" 상품을 삭제할까요?\n'+
      'Product Code '+p.code+'는 더 이상 사용할 수 없습니다.'
    );

    if(!confirmed)return;

    setSaving(true);

    try{
      const {error}=await supabase
        .from('products')
        .delete()
        .eq('id',p.id)
        .eq('shop_id',shopId);

      if(error)throw error;

      if(editingProductId===p.id){
        resetProductForm();
      }

      if(latest?.id===p.id){
        setLatest(null);
      }

      await loadProducts(shopId);
      setStatus('✓ 상품 삭제 완료');

    }catch(e:any){
      setStatus(
        '상품 삭제 실패: '+(e?.message||String(e))
      );
    }finally{
      setSaving(false);
    }
  }

  async function add(){
    if(!supabase){
      setStatus('Supabase 환경변수가 없습니다. 상품 저장을 사용할 수 없습니다.');
      return;
    }

    if(!name.trim()){
      alert('상품명을 입력해주세요.');
      return;
    }

    const db=supabase;
    const validSizes=sizes.filter(x=>x.label.trim());


    if(validSizes.length===0){
      alert('사이즈를 하나 이상 입력해주세요.');
      return;
    }

    const normalizedLabels=
      validSizes.map(x=>x.label.trim().toUpperCase());

    if(new Set(normalizedLabels).size!==normalizedLabels.length){
      alert('같은 사이즈명은 중복해서 등록할 수 없습니다.');
      return;
    }

    const dimensions=
      getDimensions(
        majorCategory,
        subCategory
      );

    for(const size of validSizes){
      for(const dimension of dimensions){
        const raw=
          String(
            size.measurements[
              dimension
            ]||
            ''
          ).trim();

        const value=
          Number(raw);

        if(
          !raw||
          !Number.isFinite(value)
        ){
          alert(
            size.label.trim()+' 사이즈의 '+
            DIMENSION_UI[dimension].label+
            ' 실측값을 숫자로 입력해주세요.'
          );
          return;
        }

        if(value<=0){
          alert(
            size.label.trim()+' 사이즈의 '+
            DIMENSION_UI[dimension].label+
            ' 실측값은 0보다 커야 합니다.'
          );
          return;
        }
      }
    }

    const rpcSizes=
      validSizes.map(size=>({
        size_label:
          size.label.trim(),

        measurements:
          Object.fromEntries(
            dimensions.map(
              dimension=>[
                dimension,
                Number(
                  size.measurements[
                    dimension
                  ]
                )
              ]
            )
          )
      }));

    setSaving(true);
    setStatus('Supabase에 저장 중...');

    try{
      if(!shopId){
        throw new Error(
          'No shop is assigned to this Partner account.'
        );
      }

      const activeShopId=shopId;

      if(editingProductId){
        const {error:updateError}=await db.rpc(
          'update_partner_product_v2',
          {
            p_product_id:editingProductId,
            p_name:name.trim(),
            p_material:material.trim(),
            p_stretch:stretch,
            p_major_category:majorCategory,
            p_sub_category:subCategory,
            p_sizes:rpcSizes
          }
        );

        if(updateError){
          throw updateError;
        }

        await loadProducts(activeShopId);
        resetProductForm();
        setStatus('✓ 상품 수정 완료');
        return;
      }

      let code='';
      let productId='';

      for(let attempt=0;attempt<5;attempt++){
        code='FIT-'+Math.floor(100000+Math.random()*900000);

        const {
          data,
          error
        }=await db.rpc(
          'create_partner_product_v2',
          {
            p_shop_id:activeShopId,
            p_code:code,
            p_name:name.trim(),
            p_material:material.trim(),
            p_stretch:stretch,
            p_major_category:majorCategory,
            p_sub_category:subCategory,
            p_sizes:rpcSizes
          }
        );

        if(!error){
          productId=String(data||'');
          break;
        }

        if(error.code!=='23505'){
          throw error;
        }
      }

      if(!productId){
        throw new Error(
          'Product Code 생성에 실패했습니다. 다시 시도해주세요.'
        );
      }

      const p:Product={
        id:productId,
        code,
        name:name.trim(),
        material:material.trim(),
        stretch,
        majorCategory,
        subCategory,
        sizes:validSizes.map(row=>({
          label:row.label,
          measurements:{...row.measurements}
        }))
      };

      setProducts(old=>[p,...old]);
      setLatest(p);

      resetProductForm();

      setStatus('✓ Supabase 영구 저장 완료');

    }catch(e:any){
      setStatus(
        '저장 실패: '+(e?.message??'알 수 없는 오류')
      );
    }finally{
      setSaving(false);
    }
  }

  return (
    <div className="appShell">

      <aside className="sidebar">

        <div className="brand">
          <div className="brandMark">F</div>

          <div>
            <div className="brandName">FIT ID</div>
            <div className="brandSub">PARTNER</div>
          </div>
        </div>

        <nav className="nav">

          <button
            className={tab==='dashboard'?'navItem active':'navItem'}
            onClick={()=>setTab('dashboard')}
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            className={tab==='products'?'navItem active':'navItem'}
            onClick={()=>setTab('products')}
          >
            <span>▦</span>
            상품 관리
          </button>

          <button
            className={tab==='analytics'?'navItem active':'navItem'}
            onClick={()=>setTab('analytics')}
          >
            <span>⌁</span>
            FIT Analytics
          </button>

          <button
            className={tab==='integration'?'navItem active':'navItem'}
            onClick={()=>setTab('integration')}
          >
            <span>↔</span>
            연동 관리
          </button>

        </nav>

        <div className="sideBottom">

          <div className="shopBadge">

            <span className="shopDot"/>

            <div>
              <strong>{shop || 'MY SHOP'}</strong>
              <small>Partner Workspace</small>
            </div>

          </div>

        </div>

      </aside>

      <main className="mainArea">

        <header className="topbar">

          <div>

            <p className="eyebrow">
              FIT ID PARTNER
            </p>

            <h1>
              {tab==='dashboard'&&'Dashboard'}
              {tab==='products'&&'상품 관리'}
              {tab==='analytics'&&'FIT Analytics'}
              {tab==='integration'&&'연동 관리'}
            </h1>

          </div>

          <div className="topActions">

            <span className="demoTag">
              MVP
            </span>

            <button
              className="secondaryBtn"
              onClick={()=>void loadProducts()}
            >
              DB 새로고침
            </button>

          </div>

        </header>

        {status&&(
          <div className="statusBar">
            <span className="statusDot"/>
            {status}
          </div>
        )}

        {tab==='dashboard'&&(
          <>

            <section className="heroCard">

              <div>

                <span className="heroLabel">
                  FIT ID FOR COMMERCE
                </span>

                <h2>
                  고객이 상품 페이지에서<br/>
                  자신의 FIT ID로 바로 사이즈를 확인하도록
                </h2>

                <p>
                  상품 실측 데이터를 FIT ID와 연결해
                  소비자마다 개인화된 추천 사이즈와
                  FIT SCORE를 제공합니다.
                </p>

                <button
                  className="primaryBtn"
                  onClick={()=>setTab('integration')}
                >
                  쇼핑몰 연동 구조 보기 →
                </button>

              </div>

              <div className="fitPreview">

                <div className="previewHeader">
                  <span>상품 상세 페이지</span>
                  <span className="liveDot">
                    ● LIVE PREVIEW
                  </span>
                </div>

                <div className="mockProduct">

                  <div className="mockImage">
                    <span>PRODUCT</span>
                  </div>

                  <div className="mockInfo">
                    <small>DENIM COLLECTION</small>
                    <strong>Wide Denim 02</strong>
                    <span>₩79,000</span>
                  </div>

                </div>

                <button className="fitButton">
                  <span className="fitButtonLogo">
                    FIT ID
                  </span>
                  내 FIT ID로 사이즈 확인
                </button>

                <p className="previewCaption">
                  고객이 버튼을 누르면 현재 상품을 자동 식별하여
                  FIT ID 추천으로 연결되는 구조
                </p>

              </div>

            </section>

            <PocDashboard shopId={shopId}/>

            <section className="dashboardGrid">

              <div className="panel">

                <div className="panelHeader">

                  <div>
                    <p className="sectionLabel">
                      PRODUCT DATA
                    </p>
                    <h3>최근 등록 상품</h3>
                  </div>

                  <button
                    className="textBtn"
                    onClick={()=>setTab('products')}
                  >
                    전체 보기
                  </button>

                </div>

                {products.length===0?(
                  <div className="emptyState">
                    아직 등록된 상품이 없습니다.
                  </div>
                ):(
                  <div className="productList">

                    {products.slice(0,4).map((p,index)=>(
                      <div
                        className="productRow"
                        key={p.id}
                      >

                        <div className="productThumb">
                          {String(index+1).padStart(2,'0')}
                        </div>

                        <div className="productMain">

                          <strong>
                            {p.name}
                          </strong>

                          <span>
                            {
                              CATEGORY_REGISTRY[
                                p.majorCategory
                              ].label
                            }
                            {' · '}
                            {
                              CATEGORY_REGISTRY[
                                p.majorCategory
                              ].subCategories.find(
                                item=>
                                  item[0]===
                                  p.subCategory
                              )?.[1]||
                              p.subCategory
                            }
                            {' · '}
                            {p.material || '소재 미입력'}
                            {' · '}
                            신축성 {p.stretch}
                          </span>

                        </div>

                        <div className="sizeChips">

                          {p.sizes.slice(0,4).map(s=>(
                            <span key={s.label}>
                              {s.label}
                            </span>
                          ))}

                        </div>

                      </div>
                    ))}

                  </div>
                )}

              </div>

              <div className="panel insightPanel">

                <div className="panelHeader">

                  <div>
                    <p className="sectionLabel">
                      FIT INSIGHT
                    </p>
                    <h3>사이즈 선택 인사이트</h3>
                  </div>

                  <span className="demoTag">
                    DEMO DATA
                  </span>

                </div>

                <Insight
                  label="M 사이즈 추천 비중"
                  value="48%"
                  width="48%"
                />

                <Insight
                  label="허벅지 타이트 피드백"
                  value="27%"
                  width="27%"
                />

                <Insight
                  label="핏 만족 피드백"
                  value="71%"
                  width="71%"
                />

                <div className="insightNote">
                  실제 서비스에서는 상품별 추천·착용 데이터를
                  집계해 사이즈 설계와 상품 운영에 활용할 수 있습니다.
                </div>

              </div>

            </section>

          </>
        )}

        {tab==='products'&&(
          <>

            <section className="sectionIntro">

              <div>

                <p className="sectionLabel">
                  PRODUCT MANAGEMENT
                </p>

                <h2>
                  상품 FIT DATA 등록
                </h2>

                <p>
                  판매 상품의 실측 데이터를 FIT ID 공통 규격으로 저장합니다.
                  Product Code는 현재 MVP 연동 확인을 위한 내부 식별값입니다.
                </p>

              </div>

            </section>

            <section className="formGrid">

              <div className="panel">

                <div className="panelHeader">

                  <div>
                    <p className="sectionLabel">
                      BASIC INFO
                    </p>
                    <h3>상품 정보</h3>
                  </div>

                </div>

                <div className="field">

                  <label>쇼핑몰명</label>

                  <input
                    value={shop}
                    readOnly
                    aria-label="현재 Partner 쇼핑몰"
                  />

                </div>

                <div className="field">

                  <label>상품명</label>

                  <input
                    value={name}
                    onChange={e=>setName(e.target.value)}
                    placeholder="Wide Denim 02"
                  />

                </div>

                <div className="field">

                  <label>대분류</label>

                  <select
                    value={majorCategory}
                    onChange={e=>
                      changeMajorCategory(
                        e.target.value as MajorCategory
                      )
                    }
                  >
                    {(Object.keys(
                      CATEGORY_REGISTRY
                    ) as MajorCategory[]).map(
                      major=>(
                        <option
                          key={major}
                          value={major}
                        >
                          {
                            CATEGORY_REGISTRY[
                              major
                            ].label
                          }
                        </option>
                      )
                    )}
                  </select>

                </div>

                <div className="field">

                  <label>세부 카테고리</label>

                  <select
                    value={subCategory}
                    onChange={e=>
                      changeSubCategory(
                        e.target.value
                      )
                    }
                  >
                    {
                      CATEGORY_REGISTRY[
                        majorCategory
                      ].subCategories.map(
                        option=>(
                          <option
                            key={option[0]}
                            value={option[0]}
                          >
                            {option[1]}
                          </option>
                        )
                      )
                    }
                  </select>

                </div>

                <div className="field">

                  <label>소재</label>

                  <input
                    value={material}
                    onChange={e=>setMaterial(e.target.value)}
                    placeholder="Cotton 98%, Spandex 2%"
                  />

                </div>

                <div className="field">

                  <label>신축성</label>

                  <select
                    value={stretch}
                    onChange={e=>setStretch(e.target.value)}
                  >
                    <option>없음</option>
                    <option>조금</option>
                    <option>많음</option>
                  </select>

                </div>

                <div className="standardBox">

                  <span>
                    FIT DATA STANDARD
                  </span>

                  <p>
                    {
                      getDimensions(
                        majorCategory,
                        subCategory
                      )
                        .map(
                          key=>
                            DIMENSION_UI[
                              key
                            ].english
                        )
                        .join(' · ')
                    }
                    {' · STRETCH'}
                  </p>

                </div>

              </div>

              <div className="panel">

                <div className="panelHeader">

                  <div>
                    <p className="sectionLabel">
                      SIZE DATA
                    </p>
                    <h3>사이즈 실측</h3>
                  </div>

                  <button
                    className="secondaryBtn"
                    onClick={()=>setSizes([...sizes,blank()])}
                  >
                    + 사이즈 추가
                  </button>

                </div>

                <div className="tableWrap">

                  <table>

                    <thead>
                      <tr>
                        <th>SIZE</th>

                        {
                          getDimensions(
                            majorCategory,
                            subCategory
                          ).map(
                            dimension=>(
                              <th key={dimension}>
                                {
                                  DIMENSION_UI[
                                    dimension
                                  ].label
                                }
                              </th>
                            )
                          )
                        }
                      </tr>
                    </thead>

                    <tbody>

                      {sizes.map((row,i)=>(
                        <tr key={i}>

                          <td>
                            <input
                              value={row.label}
                              onChange={e=>
                                changeLabel(
                                  i,
                                  e.target.value
                                )
                              }
                            />
                          </td>

                          {
                            getDimensions(
                              majorCategory,
                              subCategory
                            ).map(
                              dimension=>(
                                <td key={dimension}>

                                  <input
                                    value={
                                      row.measurements[
                                        dimension
                                      ]||
                                      ''
                                    }
                                    onChange={e=>
                                      changeMeasurement(
                                        i,
                                        dimension,
                                        e.target.value
                                      )
                                    }
                                  />

                                </td>
                              )
                            )
                          }

                        </tr>
                      ))}

                    </tbody>

                  </table>

                </div>

                <p className="helperText">
                  단위 cm · 현재 MVP에서는 사업자가 직접 확인한
                  실측값을 입력합니다.
                </p>

                <button
                  className="primaryBtn full"
                  disabled={saving}
                  onClick={add}
                >
                  {saving
                    ? '저장 중...'
                    : '상품 FIT DATA 등록'
                  }
                </button>

              </div>

            </section>

            {latest&&(
              <section className="successPanel">

                <div>

                  <span className="successLabel">
                    ✓ SAVE COMPLETE
                  </span>

                  <h3>
                    {latest.name}
                  </h3>

                  <p>
                    FIT DATA가 Supabase에 저장되었습니다.
                  </p>

                </div>

                <div className="internalCode">

                  <small>
                    MVP INTERNAL CODE
                  </small>

                  <strong>
                    {latest.code}
                  </strong>

                </div>

              </section>
            )}

            <section className="panel productManagementPanel">

              <div className="panelHeader">

                <div>
                  <p className="sectionLabel">
                    CATALOG
                  </p>
                  <h3>
                    등록 상품 {products.length}
                  </h3>
                </div>

                <button
                  className="secondaryBtn"
                  onClick={()=>void loadProducts()}
                >
                  DB 새로고침
                </button>

              </div>

              {products.length===0?(
                <div className="emptyState">
                  아직 등록된 상품이 없습니다.
                </div>
              ):(
                <div className="catalogGrid">

                  {products.map((p,index)=>(
                    <article
                      className="productCard"
                      key={p.id}
                    >

                      <div className="productCardImage">

                        <span>
                          FIT DATA
                        </span>

                        <strong>
                          {String(index+1).padStart(2,'0')}
                        </strong>

                      </div>

                      <div className="productCardBody">

                        <div className="productCardTop">

                          <div>
                            <small>
                              {shop}
                            </small>
                            <h4>
                              {p.name}
                            </h4>
                          </div>

                          <span className="statusPill">
                            ACTIVE
                          </span>

                        </div>

                        <p>
                          {
                            CATEGORY_REGISTRY[
                              p.majorCategory
                            ].label
                          }
                          {' · '}
                          {
                            CATEGORY_REGISTRY[
                              p.majorCategory
                            ].subCategories.find(
                              item=>
                                item[0]===
                                p.subCategory
                            )?.[1]||
                            p.subCategory
                          }
                          {' · '}
                          {p.material || '소재 미입력'}
                          {' · '}
                          신축성 {p.stretch}
                        </p>

                        <div className="sizeChips left">

                          {p.sizes.map(s=>(
                            <span key={s.label}>
                              {s.label}
                            </span>
                          ))}

                        </div>

                        <div className="codeLine">

                          <span>
                            Internal Code
                          </span>

                          <strong>
                            {p.code}
                          </strong>

                        </div>

                        <a
                          className="fitButton"
                          style={{textDecoration:'none'}}
                          href={`https://fit-id-consumer-mtvz.vercel.app/?productCode=${encodeURIComponent(p.code)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <span className="fitButtonLogo">
                            FIT ID
                          </span>
                          FIT CHECK 링크 테스트
                        </a>

                        <div
                          style={{
                            display:'grid',
                            gridTemplateColumns:'1fr 1fr',
                            gap:8,
                            marginTop:8
                          }}
                        >
                          <button
                            className="secondaryBtn"
                            disabled={saving}
                            onClick={()=>startEdit(p)}
                          >
                            수정
                          </button>

                          <button
                            className="secondaryBtn"
                            disabled={saving}
                            onClick={()=>void removeProduct(p)}
                            style={{color:'#b42318'}}
                          >
                            삭제
                          </button>
                        </div>

                      </div>

                    </article>
                  ))}

                </div>
              )}

            </section>

          </>
        )}

        {tab==='analytics'&&(
          <>

            <section className="sectionIntro">

              <div>

                <p className="sectionLabel">
                  FIT ANALYTICS
                </p>

                <h2>
                  판매 이후의 핏 경험까지 데이터로
                </h2>

                <p>
                  고객의 추천 사이즈와 구매 후 착용 피드백을 집계해
                  상품별 사이즈 이슈를 발견하는
                  Partner Analytics 구상입니다.
                </p>

              </div>

              <span className="demoTag">
                DEMO DATA
              </span>

            </section>

            <section className="metricGrid">

              <MetricCard
                label="FIT CHECK"
                value="1,284"
                helper="DEMO DATA"
              />

              <MetricCard
                label="추천 수락률"
                value="74%"
                helper="DEMO DATA"
              />

              <MetricCard
                label="피드백 완료율"
                value="39%"
                helper="DEMO DATA"
              />

              <MetricCard
                label="핏 만족 응답"
                value="71%"
                helper="DEMO DATA"
              />

            </section>

            <section className="analyticsGrid">

              <div className="panel">

                <p className="sectionLabel">
                  SIZE DISTRIBUTION
                </p>

                <h3>
                  추천 사이즈 분포
                </h3>

                <div className="barChart">
                  <ChartBar label="S" value={24}/>
                  <ChartBar label="M" value={48}/>
                  <ChartBar label="L" value={28}/>
                </div>

              </div>

              <div className="panel">

                <p className="sectionLabel">
                  WEAR FEEDBACK
                </p>

                <h3>
                  부위별 착용 피드백
                </h3>

                <div className="feedbackList">

                  <FeedbackRow
                    label="허리"
                    good={68}
                    issue="타이트 19%"
                  />

                  <FeedbackRow
                    label="힙"
                    good={75}
                    issue="타이트 12%"
                  />

                  <FeedbackRow
                    label="허벅지"
                    good={59}
                    issue="타이트 27%"
                  />

                  <FeedbackRow
                    label="기장"
                    good={72}
                    issue="김 18%"
                  />

                </div>

              </div>

            </section>

            <section className="panel">

              <div className="panelHeader">

                <div>
                  <p className="sectionLabel">
                    PRODUCT INSIGHT
                  </p>
                  <h3>
                    상품 운영 인사이트 예시
                  </h3>
                </div>

                <span className="demoTag">
                  DEMO DATA
                </span>

              </div>

              <div className="insightCards">

                <MiniInsight
                  number="01"
                  title="Wide Denim 02"
                  text="M 사이즈에서 허벅지 타이트 피드백 비중이 상대적으로 높습니다."
                />

                <MiniInsight
                  number="02"
                  title="Classic Slacks"
                  text="추천 사이즈와 실제 선택 사이즈의 일치율이 높게 나타납니다."
                />

                <MiniInsight
                  number="03"
                  title="Future Insight"
                  text="누적 핏 데이터를 향후 사이즈 설계와 상품 기획에 활용합니다."
                />

              </div>

            </section>

          </>
        )}

        {tab==='integration'&&(
          <>

            <section className="sectionIntro">

              <div>

                <p className="sectionLabel">
                  STORE INTEGRATION
                </p>

                <h2>
                  고객은 상품코드를 입력하지 않습니다.
                </h2>

                <p>
                  최종 서비스에서는 쇼핑몰 상품 상세 페이지에
                  FIT ID 버튼을 설치하고, 현재 상품을 자동 식별해
                  곧바로 개인화 추천을 제공합니다.
                </p>

              </div>

              <span className="plannedTag">
                MVP NEXT
              </span>

            </section>

            <section className="integrationHero">

              <div className="integrationSteps">

                <IntegrationStep
                  number="01"
                  title="상품 데이터 연결"
                  text="쇼핑몰 상품 ID와 FIT DATA를 연결합니다."
                />

                <IntegrationStep
                  number="02"
                  title="FIT ID 버튼 설치"
                  text="상품 상세 페이지에 [내 FIT ID로 사이즈 확인] 버튼을 노출합니다."
                />

                <IntegrationStep
                  number="03"
                  title="상품 자동 식별"
                  text="고객이 버튼을 누르면 현재 보고 있는 상품을 자동으로 인식합니다."
                />

                <IntegrationStep
                  number="04"
                  title="개인화 추천"
                  text="FIT ID가 추천 사이즈와 FIT SCORE를 즉시 제공합니다."
                />

              </div>

              <div className="integrationMock">

                <div className="browserBar">

                  <span/>
                  <span/>
                  <span/>

                  <small>
                    yourshop.com/products/denim-02
                  </small>

                </div>

                <div className="storeMock">

                  <div className="storeImage">
                    PRODUCT IMAGE
                  </div>

                  <div className="storeDetail">

                    <small>
                      MY SHOP
                    </small>

                    <h3>
                      Wide Denim 02
                    </h3>

                    <p>
                      ₩79,000
                    </p>

                    <div className="nativeSizes">
                      <button>S</button>
                      <button>M</button>
                      <button>L</button>
                    </div>

                    <a
  className="fitButton"
href={selectedSdkProductCode ? 'https://fit-id-consumer-mtvz.vercel.app/?productCode='+encodeURIComponent(selectedSdkProductCode) : '#'}
  target="_blank"
  rel="noopener noreferrer">
  <span className="fitButtonLogo">
    FIT ID
  </span>
  내 FIT ID로 사이즈 확인
</a>
                    <div className="recommendationMock">

                      <span>
                        BEST MATCH
                      </span>

                      <strong>
                        M · FIT SCORE 91
                      </strong>

                      <p>
                        허리와 힙은 잘 맞고,
                        허벅지는 슬림하게 느껴질 수 있어요.
                      </p>

                    </div>

                  </div>

                </div>

              </div>

            </section>

            <section className="panel" style={{marginTop:22,padding:24}}>
              <p className="sectionLabel">PARTNER SDK / POC V1</p>
              <h3 style={{marginTop:8}}>실제 쇼핑몰에 FIT ID 버튼 설치</h3>
              <p style={{marginBottom:16}}>
                아래 코드를 테스트 상품의 상세 페이지 HTML에 넣으면 FIT ID 버튼이 생성됩니다.
                상품별 FIT ID 코드를 선택한 뒤 복사하세요. 실제 운영 전에 쇼핑몰 관리자와 테스트 환경에서 검증해야 합니다.
              </p>

              {products.length>0&&shopId?(
                <>
                  <label htmlFor="sdk-product-selector" style={{display:'block',fontWeight:700,marginBottom:8}}>
                    설치할 등록 상품 선택
                  </label>
                  <select
                    id="sdk-product-selector"
                    value={selectedSdkProductCode}
                    onChange={event=>setSdkSelectedCode(event.target.value)}
                    style={{
                      width:'100%',maxWidth:600,padding:'12px',
                      borderRadius:10,border:'1px solid #cddbd2',
                      background:'white',color:'#10251c',marginBottom:14
                    }}
                  >
                    {products.map(product=>(
                      <option key={product.id} value={product.code}>
                        {product.name} · {product.code}
                      </option>
                    ))}
                  </select>
                  <pre style={{
                    whiteSpace:'pre-wrap',wordBreak:'break-all',padding:18,
                    background:'#0b2419',color:'#b3f6d4',borderRadius:12,
                    lineHeight:1.7,fontSize:12
                  }}><code>{sdkInstallSnippet}</code></pre>
                  <button
                    type="button"
                    className="primaryBtn"
                    style={{marginTop:12}}
                    onClick={()=>{
                      if(typeof navigator!=='undefined'&&navigator.clipboard?.writeText){
                        void navigator.clipboard.writeText(sdkInstallSnippet)
                          .then(()=>setStatus('선택한 상품의 SDK 설치 코드를 복사했습니다.'))
                          .catch(()=>setStatus('클립보드 복사 실패: 설치 코드를 직접 선택해 복사해주세요.'));
                      }else{
                        setStatus('브라우저 클립보드 권한이 없어 코드를 직접 선택해야 합니다.');
                      }
                    }}
                  >
                    설치 코드 복사
                  </button>
                  <p style={{marginTop:12,fontSize:12}}>
                    <a href="https://fit-id-demo-malls.vercel.app/sdk-demo.html"
                       target="_blank" rel="noopener noreferrer">
                      SDK 독립 테스트 페이지 열기 ↗
                    </a>
                  </p>
                </>
              ):(
                <p>상품을 먼저 등록하면 상품별 SDK 설치 코드가 자동 생성됩니다.</p>
              )}

              <p style={{marginTop:14,fontSize:12}}>
                PoC 단계 기능입니다. 제휴 상품 실사 이미지 및 가상피팅 검증은 별도 준비가 필요합니다.
                고객 결제 화면과 개인정보를 수집하지 않으며, 실제 쇼핑몰 설치 시 도메인·로그인·모바일 호환성을 확인합니다.
              </p>
            </section>

            <section className="integrationCards">

              <div className="panel">

                <p className="sectionLabel">
                  CURRENT MVP
                </p>

                <h3>
                  현재 구현
                </h3>

                <ul className="checkList">
                  <li>상품 FIT DATA Supabase 저장</li>
                  <li>상품별 내부 Product Code 발급</li>
                  <li>Consumer FIT CHECK 연결용 데이터 구조</li>
                  <li>외부 쇼핑몰 임베드 SDK v1 테스트 버전</li>
                </ul>

              </div>

              <div className="panel">

                <p className="sectionLabel">
                  NEXT INTEGRATION
                </p>

                <h3>
                  상용화 연동 구조
                </h3>

                <ul className="checkList planned">
                  <li>쇼핑몰 상품 ID 자동 매핑</li>
                  <li>쇼핑몰 플랫폼별 공식 설치 어댑터 · API</li>
                  <li>상품 데이터 CSV·API 동기화</li>
                  <li>추천·착용 데이터 Partner Analytics 집계</li>
                </ul>

              </div>

            </section>

          </>
        )}

      </main>

    </div>
  );
}

export default function Page(){
  return(
    <PartnerAuthGate>
      {authUserId=>(
        <PartnerApp authUserId={authUserId}/>
      )}
    </PartnerAuthGate>
  );
}


function MetricCard({
  label,
  value,
  helper,
  live=false
}:{
  label:string;
  value:string;
  helper:string;
  live?:boolean;
}){
  return(
    <div className="metricCard">

      <div className="metricTop">
        <span>{label}</span>
        {live&&(
          <span className="liveBadge">
            LIVE
          </span>
        )}
      </div>

      <strong>{value}</strong>
      <small>{helper}</small>

    </div>
  );
}

function Insight({
  label,
  value,
  width
}:{
  label:string;
  value:string;
  width:string;
}){
  return(
    <div className="insightBlock">

      <div className="insightTop">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      <div className="progress">
        <span style={{width}}/>
      </div>

    </div>
  );
}

function ChartBar({
  label,
  value
}:{
  label:string;
  value:number;
}){
  return(
    <div className="chartItem">

      <div className="chartTrack">

        <div
          className="chartFill"
          style={{height:`${value*2.4}px`}}
        >
          <span>{value}%</span>
        </div>

      </div>

      <strong>{label}</strong>

    </div>
  );
}

function FeedbackRow({
  label,
  good,
  issue
}:{
  label:string;
  good:number;
  issue:string;
}){
  return(
    <div className="feedbackRow">

      <div className="feedbackLabel">
        <strong>{label}</strong>
        <span>{issue}</span>
      </div>

      <div className="feedbackProgress">
        <span style={{width:`${good}%`}}/>
      </div>

      <strong>
        {good}% 좋음
      </strong>

    </div>
  );
}

function MiniInsight({
  number,
  title,
  text
}:{
  number:string;
  title:string;
  text:string;
}){
  return(
    <div className="miniInsight">

      <span>{number}</span>

      <strong>{title}</strong>

      <p>{text}</p>

    </div>
  );
}

function IntegrationStep({
  number,
  title,
  text
}:{
  number:string;
  title:string;
  text:string;
}){
  return(
    <div className="integrationStep">

      <span>{number}</span>

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>

    </div>
  );
}

function num(v:string){
  const n=Number(v);
  return Number.isFinite(n)?n:null;
}