/**
 * HTML install markup for the Partner-side PoC.
 * Merchant IDs are converted into safe HTML attribute text before copying.
 */
export function validMerchantProductId(value:string){
  return value.length>0&&value.length<=120&&!/[\u0000-\u001f\u007f]/.test(value);
}
export type InstallProduct={code:string;merchantProductId:string};
const SDK='https://fit-id-demo-malls.vercel.app/sdk/v1/fit-id.js';
const escapeAttr=(raw:string)=>raw.replace(/&/g,'&amp;').replace(/"/g,'&quot;')
  .replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;');
const validUuid=(v:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export type ButtonAppearance={buttonColor?:string;textColor?:string;accentColor?:string;radius?:number};
const safeColor=(value:string|undefined)=>value&&/^#[0-9a-fA-F]{6}$/.test(value)?value:'';
export function buildSdkInstallSnippet(shopId:string,product:InstallProduct|null,appearance:ButtonAppearance={}):string{
  if(!validUuid(shopId)||!product)return '';
  let attributes='';
  if(product.merchantProductId){
    if(product.merchantProductId.length>120||/[\u0000-\u001f\u007f]/.test(product.merchantProductId))return '';
    attributes='data-fit-id-merchant-product-id="'+escapeAttr(product.merchantProductId)+'"';
  }else{
    if(!/^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/.test(product.code))return '';
    attributes='data-fit-id-product-code="'+escapeAttr(product.code)+'"';
  }
  const colorFields=[
    ['data-fit-id-button-color',safeColor(appearance.buttonColor)],
    ['data-fit-id-text-color',safeColor(appearance.textColor)],
    ['data-fit-id-accent-color',safeColor(appearance.accentColor)]
  ];
  const theme=colorFields.filter(([,value])=>value).map(([name,value])=>' '+name+'="'+value+'"').join('');
  const radius=[0,4,8,12,16,24].includes(appearance.radius as number)
    ?' data-fit-id-radius="'+appearance.radius+'"':'';
  return '<div '+attributes+' data-fit-id-shop-id="'+escapeAttr(shopId)+'"'+theme+radius+'></div>\n'+
    '<script defer src="'+SDK+'"></script>';
}
