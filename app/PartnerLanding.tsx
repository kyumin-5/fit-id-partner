'use client';

import styles from './PartnerLanding.module.css';

type PartnerLandingProps = {
  onLogin: () => void;
  onSignup: () => void;
};

const steps = [
  {number:'01',title:'상품 데이터 등록',body:'우리 쇼핑몰 상품의 사이즈와 실측을 FIT ID 규격으로 관리합니다.'},
  {number:'02',title:'FIT CHECK 연결',body:'고객이 상품 페이지에서 본인의 핏 기준과 실측을 비교합니다.'},
  {number:'03',title:'PoC 운영 확인',body:'연동 상태와 테스트 흐름을 파트너 계정에서 확인합니다.'}
];

export default function PartnerLanding({onLogin,onSignup}:PartnerLandingProps){
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.container}>
          <div className={styles.nav}>
            <a className={styles.logo} href="#top" aria-label="FIT ID Partner 홈">F<span>.</span> <small>FIT ID <em>PARTNER</em></small></a>
            <nav aria-label="파트너 소개 메뉴" className={styles.navLinks}>
              <a href="#how">서비스 안내</a>
              <a href="#preview">운영 미리보기</a>
              <a href="https://fit-id-official-site.vercel.app/#contact" target="_blank" rel="noopener noreferrer">제휴 문의</a>
            </nav>
            <button className={styles.loginButton} type="button" onClick={onLogin}>로그인 <span aria-hidden="true">↗</span></button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className={styles.hero}>
          <div className={styles.container}>
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <div className={styles.eyebrow}><span className={styles.pulse}/> FIT ID FOR COMMERCE · PoC</div>
                <h1>우리 쇼핑몰의 상품과<br/><span>고객의 핏을 연결하다.</span></h1>
                <p>FIT ID Partner는 상품별 사이즈·실측 정보를 관리하고, 고객의 개인 핏 기준과 연결하는 쇼핑몰 파트너 공간입니다.</p>
                <div className={styles.heroButtons}>
                  <button type="button" className={styles.primary} onClick={onSignup}>파트너 시작하기 <span aria-hidden="true">↗</span></button>
                  <a href="#how" className={styles.secondary}>서비스 둘러보기 <span aria-hidden="true">↓</span></a>
                </div>
                <p className={styles.heroNote}>먼저 둘러보세요. 상품 등록과 대시보드 이용 시에만 로그인이 필요합니다.</p>
              </div>
              <div className={styles.preview} id="preview" aria-label="실제 데이터가 아닌 파트너 대시보드 설명용 미리보기">
                <div className={styles.previewBar}><span>F. <strong>PARTNER OVERVIEW</strong></span><span>PREVIEW</span></div>
                <div className={styles.previewBody}>
                  <div className={styles.previewHeader}><small>SHOP MANAGEMENT</small><h2>판매 상품의 핏 데이터를<br/>한곳에서 관리하세요.</h2><p>연동 구조 안내용 화면 · 실제 쇼핑몰 데이터 아님</p></div>
                  <div className={styles.metrics}>
                    <div><small>PRODUCT CATALOG</small><strong>사이즈 · 실측</strong><span>상품 정보 관리</span></div>
                    <div><small>FIT CHECK</small><strong>고객별 비교</strong><span>연동 경험 검증</span></div>
                  </div>
                  <div className={styles.table}>
                    <div className={styles.tableHeading}><span>PRODUCT</span><span>SIZE RANGE</span><span>STATUS</span></div>
                    <div><span>Daily shirt</span><span>S / M / L</span><b>예시</b></div>
                    <div><span>Everyday denim</span><span>26 – 32</span><b>예시</b></div>
                  </div>
                  <button type="button" className={styles.previewAction} onClick={onLogin}>내 쇼핑몰 대시보드 열기 <span aria-hidden="true">→</span></button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.how} id="how">
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <small>HOW FIT ID WORKS</small>
              <h2>가입 전에도, 서비스 흐름부터<br/>확인할 수 있습니다.</h2>
              <p>상품 데이터를 고객의 핏 경험과 연결하는 과정입니다. 현재는 MVP 및 초기 PoC 검증 단계입니다.</p>
            </div>
            <div className={styles.steps}>
              {steps.map(item=><article key={item.number} className={styles.step}>
                <div className={styles.stepNumber}>{item.number} <span aria-hidden="true">↗</span></div>
                <h3>{item.title}</h3><p>{item.body}</p>
              </article>)}
            </div>
          </div>
        </section>

        <section className={styles.callout}>
          <div className={styles.container}>
            <div className={styles.calloutInner}>
              <div><small>READY TO CONNECT?</small><h2>우리 쇼핑몰에도 FIT CHECK를.</h2><p>파트너 계정 생성과 실제 데이터 관리는 로그인 후 시작할 수 있습니다.</p></div>
              <div className={styles.calloutActions}>
                <button type="button" className={styles.primary} onClick={onSignup}>파트너 계정 만들기 ↗</button>
                <a href="https://fit-id-official-site.vercel.app/#contact" target="_blank" rel="noopener noreferrer">PoC 제휴 문의 ↗</a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className={styles.footer}><div className={styles.container}><span>© FIT ID · PARTNER</span><a href="https://fit-id-official-site.vercel.app/" target="_blank" rel="noopener noreferrer">FIT ID 공식 홈페이지 ↗</a></div></footer>
    </div>
  );
}
