'use client';

import {useEffect,useState} from 'react';
import {createClient} from '@supabase/supabase-js';

type Size={
  label:string;
  waist:string;
  hip:string;
  thigh:string;
  rise:string;
  length:string;
};

type Product={
  id:string;
  code:string;
  name:string;
  material:string;
  stretch:string;
  sizes:Size[];
};

type Tab='dashboard'|'products'|'analytics'|'integration';

const seed:Size[]=[
  {label:'S',waist:'35',hip:'47',thigh:'28',rise:'29',length:'100'},
  {label:'M',waist:'37',hip:'49',thigh:'29',rise:'30',length:'102'},
  {label:'L',waist:'39',hip:'51',thigh:'30',rise:'31',length:'104'}
];

const blank=():Size=>({
  label:'',
  waist:'',
  hip:'',
  thigh:'',
  rise:'',
  length:''
});

const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey=
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl,supabaseKey)
    : null;

export default function Page(){
  const [tab,setTab]=useState<Tab>('dashboard');
  const [shop,setShop]=useState('MY SHOP');
  const [name,setName]=useState('');
  const [material,setMaterial]=useState('');
  const [stretch,setStretch]=useState('조금');
  const [sizes,setSizes]=useState<Size[]>(seed);
  const [products,setProducts]=useState<Product[]>([]);
  const [latest,setLatest]=useState<Product|null>(null);
  const [saving,setSaving]=useState(false);
  const [status,setStatus]=useState('');

  useEffect(()=>{
    void loadProducts();
  },[]);

  async function loadProducts(){
    if(!supabase){
      setStatus('Supabase 환경변수가 없습니다. .env.local을 확인해주세요.');
      return;
    }

    const db=supabase;

    const {data,error}=await db
      .from('products')
      .select(
        'id,code,name,material,stretch,product_sizes(size_label,waist,hip,thigh,rise,length)'
      )
      .order('created_at',{ascending:false});

    if(error){
      setStatus('DB 조회 실패: '+error.message);
      return;
    }

    const mapped:Product[]=(data??[]).map((p:any)=>({
      id:p.id,
      code:p.code,
      name:p.name,
      material:p.material??'',
      stretch:p.stretch??'',
      sizes:(p.product_sizes??[]).map((s:any)=>({
        label:s.size_label,
        waist:String(s.waist??''),
        hip:String(s.hip??''),
        thigh:String(s.thigh??''),
        rise:String(s.rise??''),
        length:String(s.length??'')
      }))
    }));

    setProducts(mapped);
    setStatus('Supabase 연결됨 · 등록 상품을 불러왔습니다.');
  }

  const change=(i:number,k:keyof Size,v:string)=>{
    setSizes(a=>a.map((r,j)=>j===i?{...r,[k]:v}:r));
  };

  async function add(){
    if(!supabase){
      setStatus('Supabase 환경변수가 없습니다. 상품 저장을 사용할 수 없습니다.');
      return;
    }

    if(!shop.trim()){
      alert('쇼핑몰명을 입력해주세요.');
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

    setSaving(true);
    setStatus('Supabase에 저장 중...');

    try{
      let shopId:string;

      const {
        data:existing,
        error:shopFindError
      }=await db
        .from('shops')
        .select('id')
        .eq('name',shop.trim())
        .limit(1)
        .maybeSingle();

      if(shopFindError){
        throw shopFindError;
      }

      if(existing?.id){
        shopId=existing.id;
      }else{
        const {
          data:newShop,
          error
        }=await db
          .from('shops')
          .insert({name:shop.trim()})
          .select('id')
          .single();

        if(error){
          throw error;
        }

        shopId=newShop.id;
      }

      let code='';
      let productRow:any=null;

      for(let attempt=0;attempt<5;attempt++){
        code='FIT-'+Math.floor(100000+Math.random()*900000);

        const {data,error}=await db
          .from('products')
          .insert({
            shop_id:shopId,
            code,
            name:name.trim(),
            material:material.trim(),
            stretch
          })
          .select('id,code,name,material,stretch')
          .single();

        if(!error){
          productRow=data;
          break;
        }

        if(error.code!=='23505'){
          throw error;
        }
      }

      if(!productRow){
        throw new Error(
          'Product Code 생성에 실패했습니다. 다시 시도해주세요.'
        );
      }

      const rows=validSizes.map(s=>({
        product_id:productRow.id,
        size_label:s.label.trim(),
        waist:num(s.waist),
        hip:num(s.hip),
        thigh:num(s.thigh),
        rise:num(s.rise),
        length:num(s.length)
      }));

      const {error:sizeError}=await db
        .from('product_sizes')
        .insert(rows);

      if(sizeError){
        await db
          .from('products')
          .delete()
          .eq('id',productRow.id);

        throw sizeError;
      }

      const p:Product={
        id:productRow.id,
        code:productRow.code,
        name:productRow.name,
        material:productRow.material??'',
        stretch:productRow.stretch??'',
        sizes:validSizes
      };

      setProducts(old=>[p,...old]);
      setLatest(p);
      setName('');
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

            <section className="metricGrid">

              <MetricCard
                label="등록 상품"
                value={String(products.length)}
                helper="Supabase 실제 데이터"
                live
              />

              <MetricCard
                label="FIT CHECK"
                value="1,284"
                helper="DEMO DATA"
              />

              <MetricCard
                label="연결 고객"
                value="436"
                helper="DEMO DATA"
              />

              <MetricCard
                label="착용 피드백"
                value="318"
                helper="DEMO DATA"
              />

            </section>

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
                    onChange={e=>setShop(e.target.value)}
                    placeholder="MY SHOP"
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
                    waist · hip · thigh · rise · length · stretch
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
                        <th>허리</th>
                        <th>힙</th>
                        <th>허벅지</th>
                        <th>밑위</th>
                        <th>총장</th>
                      </tr>
                    </thead>

                    <tbody>

                      {sizes.map((r,i)=>(
                        <tr key={i}>

                          {(
                            [
                              'label',
                              'waist',
                              'hip',
                              'thigh',
                              'rise',
                              'length'
                            ] as Array<keyof Size>
                          ).map(k=>(
                            <td key={k}>

                              <input
                                value={r[k]}
                                onChange={e=>
                                  change(i,k,e.target.value)
                                }
                              />

                            </td>
                          ))}

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
href="exp://snawtqs-anonymous-8081.exp.direct?productCode=FIT-731675">
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
                  <li>FIT ID 버튼 SDK / API</li>
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