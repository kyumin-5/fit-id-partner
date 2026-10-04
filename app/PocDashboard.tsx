'use client';

import {
  useCallback,
  useEffect,
  useState
} from 'react';

import {
  createClient
} from '@supabase/supabase-js';

type Summary={
  link_open:number;
  fit_check_view:number;
  fit_check_save:number;
};

type ProductMetric={
  product_id:string;
  product_code:string;
  product_name:string;
  link_open:number;
  fit_check_view:number;
  fit_check_save:number;
  recommended_sizes:Record<string,number>;
};

type DashboardData={
  summary:Summary;
  products:ProductMetric[];
};

const supabaseUrl=
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey=
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase=
  supabaseUrl&&supabaseKey
    ?createClient(supabaseUrl,supabaseKey)
    :null;

function percent(value:number,total:number){
  if(!total)return '0%';
  return `${Math.round((value/total)*1000)/10}%`;
}

function Metric({
  label,
  value,
  helper
}:{
  label:string;
  value:string;
  helper:string;
}){
  return(
    <div className="metricCard">
      <div className="metricTop">
        <span>{label}</span>
        <span className="liveBadge">
          LIVE
        </span>
      </div>

      <strong>{value}</strong>
      <small>{helper}</small>
    </div>
  );
}

export default function PocDashboard({
  shopId
}:{
  shopId:string;
}){
  const [data,setData]=
    useState<DashboardData|null>(null);

  const [loading,setLoading]=
    useState(false);

  const [error,setError]=
    useState('');

  const load=useCallback(async()=>{
    if(!shopId){
      setData({
        summary:{
          link_open:0,
          fit_check_view:0,
          fit_check_save:0
        },
        products:[]
      });
      return;
    }

    if(!supabase){
      setError(
        'Supabase environment is not configured.'
      );
      return;
    }

    setLoading(true);
    setError('');

    try{
      const {
        data:dashboard,
        error:dashboardError
      }=await supabase.rpc(
        'get_partner_poc_dashboard',
        {
          p_shop_id:shopId
        }
      );

      if(dashboardError){
        throw dashboardError;
      }

      setData(
        (dashboard??{
          summary:{
            link_open:0,
            fit_check_view:0,
            fit_check_save:0
          },
          products:[]
        }) as DashboardData
      );

    }catch(e:any){
      setError(
        e?.message||String(e)
      );
    }finally{
      setLoading(false);
    }
  },[shopId]);

  useEffect(()=>{
    void load();
  },[load]);

  const summary=
    data?.summary??{
      link_open:0,
      fit_check_view:0,
      fit_check_save:0
    };

  return(
    <>
      <section className="metricGrid">
        <Metric
          label="LINK OPEN"
          value={String(summary.link_open)}
          helper="Partner link entries"
        />

        <Metric
          label="FIT CHECK VIEW"
          value={String(summary.fit_check_view)}
          helper={`View conversion ${percent(
            summary.fit_check_view,
            summary.link_open
          )}`}
        />

        <Metric
          label="RESULT SAVE"
          value={String(summary.fit_check_save)}
          helper={`Save conversion ${percent(
            summary.fit_check_save,
            summary.fit_check_view
          )}`}
        />

        <Metric
          label="POC STATUS"
          value={loading?'SYNC':'LIVE'}
          helper="Authorized shop aggregate"
        />
      </section>

      <section
        className="panel"
        style={{marginTop:20}}
      >
        <div className="panelHeader">
          <div>
            <p className="sectionLabel">
              POC FUNNEL
            </p>

            <h3>
              Product FIT CHECK performance
            </h3>
          </div>

          <button
            className="secondaryBtn"
            disabled={loading}
            onClick={()=>void load()}
          >
            {loading
              ?'Loading...'
              :'Refresh'}
          </button>
        </div>

        {error?(
          <div className="emptyState">
            Analytics error: {error}
          </div>

        ):!data?.products?.length?(
          <div className="emptyState">
            No products for this Partner account.
          </div>

        ):(
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>CODE</th>
                  <th>LINK</th>
                  <th>VIEW</th>
                  <th>SAVE</th>
                  <th>VIEW RATE</th>
                  <th>SAVE RATE</th>
                  <th>RECOMMENDED</th>
                </tr>
              </thead>

              <tbody>
                {data.products.map(product=>(
                  <tr key={product.product_id}>
                    <td style={{
                      textAlign:'left',
                      fontWeight:800
                    }}>
                      {product.product_name}
                    </td>

                    <td>
                      {product.product_code}
                    </td>

                    <td>
                      {product.link_open}
                    </td>

                    <td>
                      {product.fit_check_view}
                    </td>

                    <td>
                      {product.fit_check_save}
                    </td>

                    <td>
                      {percent(
                        product.fit_check_view,
                        product.link_open
                      )}
                    </td>

                    <td>
                      {percent(
                        product.fit_check_save,
                        product.fit_check_view
                      )}
                    </td>

                    <td>
                      {Object.entries(
                        product.recommended_sizes||{}
                      ).length
                        ?Object.entries(
                            product.recommended_sizes
                          )
                          .map(
                            ([size,count])=>
                              `${size} ${count}`
                          )
                          .join(' · ')
                        :'-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
