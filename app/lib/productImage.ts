// Public partner product imagery for FIT CHECK and AI virtual try-on.
// Public bucket paths are owned by the authenticated partner's UID.
export type ProductImageUploadArgs={
  db:any;
  shopId:string;
  authUserId:string;
  productId:string;
  file:File;
};
const MAX_IMAGE_SIZE=5*1024*1024;
export async function inspectProductImage(file:File){
  if(file.size===0||file.size>MAX_IMAGE_SIZE){
    throw new Error('상품 사진은 5MB 이하 JPG·PNG·WebP 파일이어야 합니다.');
  }
  const magic=new Uint8Array(await file.slice(0,16).arrayBuffer());
  let kind:'jpeg'|'png'|'webp'|null=null;
  if(magic.length>=3&&magic[0]===255&&magic[1]===216&&magic[2]===255)kind='jpeg';
  else if(magic.length>=8&&magic[0]===137&&magic[1]===80&&magic[2]===78&&magic[3]===71&&magic[4]===13&&magic[5]===10)kind='png';
  else if(magic.length>=12&&String.fromCharCode(...magic.slice(0,4))==='RIFF'&&
    String.fromCharCode(...magic.slice(8,12))==='WEBP')kind='webp';
  if(!kind)throw new Error('지원하지 않는 이미지입니다. 실제 JPG·PNG·WebP 파일을 선택하세요.');
  const mimeMap={jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
  if(file.type&&file.type!==mimeMap[kind])throw new Error('파일 형식과 이미지 내용이 일치하지 않습니다.');
  return {mime:mimeMap[kind],ext:kind==='jpeg'?'jpg':kind};
}
export function publicPartnerImageUrl(db:any,imagePath:string|null|undefined):string{
  if(!db||!imagePath)return '';
  if(/^https:\/\//.test(imagePath))return imagePath;
  return db.storage.from('product-images').getPublicUrl(imagePath).data.publicUrl;
}
export async function uploadPartnerProductImage({
  db,shopId,authUserId,productId,file
}:ProductImageUploadArgs):Promise<{imagePath:string;url:string}>{
  if(!db||!shopId||!authUserId||!productId)throw new Error('파트너 로그인 또는 상품 선택을 확인해주세요.');
  const {data:userData,error:userError}=await db.auth.getUser();
  if(userError||userData?.user?.id!==authUserId)throw new Error('상품 사진 업로드 권한을 확인할 수 없습니다.');
  const {data:owned,error:lookupError}=await db.from('products').select('id,shop_id')
    .eq('id',productId).eq('shop_id',shopId).maybeSingle();
  if(lookupError||!owned)throw new Error('현재 파트너 소유 상품만 이미지를 등록할 수 있습니다.');
  const {mime,ext}=await inspectProductImage(file);
  const path=[authUserId,shopId,productId,crypto.randomUUID()+'.'+ext].join('/');
  const {error:uploadError}=await db.storage.from('product-images')
    .upload(path,file,{contentType:mime,upsert:false,cacheControl:'31536000'});
  if(uploadError)throw new Error('이미지 저장 실패: '+uploadError.message);
  const {data:saved,error:dbError}=await db.from('products').update({image_path:path})
    .eq('id',productId).eq('shop_id',shopId).select('image_path').single();
  if(dbError||saved?.image_path!==path){
    // Remove newly uploaded unreferenced image when DB persistence fails.
    await db.storage.from('product-images').remove([path]);
    throw new Error('상품에 사진을 연결하지 못했습니다: '+(dbError?.message||'DB 응답 오류'));
  }
  return {imagePath:path,url:publicPartnerImageUrl(db,path)};
}
