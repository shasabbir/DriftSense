export const promptStyles = `
:host { all: initial; color-scheme: light; }
* { box-sizing: border-box; }
button, input { font: inherit; }
.ds-overlay { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; padding: 24px; background: rgba(17, 24, 39, .56); backdrop-filter: blur(3px); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #17201d; }
.ds-dialog { width: min(540px, 100%); max-height: calc(100vh - 32px); overflow: auto; background: #fbfcfb; border: 1px solid rgba(255,255,255,.8); border-radius: 8px; box-shadow: 0 24px 70px rgba(12, 22, 18, .28); }
.ds-header { height: 62px; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e5e9e7; }
.ds-brand { display: flex; align-items: center; gap: 10px; font-weight: 720; font-size: 14px; }
.ds-brand-mark { width: 30px; height: 30px; display: grid; place-items: center; color: white; background: #167b5a; border-radius: 6px; }
.ds-privacy { display: flex; align-items: center; gap: 6px; color: #52615c; font-size: 12px; font-weight: 650; }
.ds-copy { padding: 24px 24px 16px; }
.ds-domain, .ds-kicker { display: inline-block; margin-bottom: 9px; color: #167b5a; font-size: 11px; font-weight: 750; text-transform: uppercase; }
.ds-copy h1 { margin: 0; color: #17201d; font-size: 27px; line-height: 1.18; letter-spacing: 0; }
.ds-copy p { margin: 9px 0 0; color: #65726e; font-size: 14px; line-height: 1.55; }
.ds-options { padding: 0 24px; display: grid; gap: 8px; }
.ds-option { width: 100%; min-height: 58px; padding: 10px 13px; display: flex; align-items: center; justify-content: space-between; text-align: left; color: #26312d; background: #fff; border: 1px solid #dce3df; border-radius: 7px; cursor: pointer; transition: border-color .15s, background .15s, box-shadow .15s; }
.ds-option:hover { border-color: #91aa9f; background: #f9fbfa; }
.ds-option-selected { border-color: #167b5a; background: #f0f8f5; box-shadow: 0 0 0 2px rgba(22,123,90,.1); }
.ds-option span:first-child { display: grid; gap: 3px; }
.ds-option strong { font-size: 13px; }
.ds-option small { color: #75817d; font-size: 11px; }
.ds-radio { width: 20px; height: 20px; flex: none; display: grid; place-items: center; color: white; background: #167b5a; border: 1px solid #b7c4be; border-radius: 50%; }
.ds-option:not(.ds-option-selected) .ds-radio { background: white; }
.ds-duration { margin: 14px 24px 0; padding: 12px 13px; display: flex; align-items: center; justify-content: space-between; background: #f2f4f3; border-radius: 7px; color: #46534e; font-size: 12px; font-weight: 650; }
.ds-duration > span:first-child { display: flex; align-items: center; gap: 8px; }
.ds-duration-input { display: flex; align-items: center; gap: 6px; color: #6b7772; }
.ds-duration input { width: 48px; height: 32px; border: 1px solid #cfd8d3; border-radius: 6px; text-align: center; color: #17201d; background: white; }
.ds-actions { padding: 18px 24px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ds-text-button, .ds-primary { min-height: 40px; padding: 0 14px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; }
.ds-text-button { color: #697570; background: transparent; border: 0; }
.ds-primary { color: #fff; background: #17201d; border: 1px solid #17201d; }
.ds-primary:disabled { opacity: .45; cursor: not-allowed; }
.ds-reflection-copy { padding-top: 30px; }
.ds-reflection-grid { padding: 4px 24px 26px; display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.ds-reflection-grid button { min-height: 88px; padding: 15px; display: grid; gap: 5px; text-align: left; color: #24302b; background: white; border: 1px solid #dce3df; border-radius: 7px; cursor: pointer; }
.ds-reflection-grid button:hover { border-color: #167b5a; background: #f4faf7; }
.ds-reflection-grid strong { font-size: 13px; }
.ds-reflection-grid small { color: #74807b; font-size: 11px; line-height: 1.4; }
@media (max-width: 520px) { .ds-overlay { padding: 10px; } .ds-reflection-grid { grid-template-columns: 1fr; } .ds-actions { align-items: stretch; flex-direction: column-reverse; } .ds-primary, .ds-text-button { width: 100%; } }
`
