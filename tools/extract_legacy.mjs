// Usage: node tools/extract_legacy.mjs legacy/tree.html  -> JSON on stdout
import fs from "node:fs";
import vm from "node:vm";
const h = fs.readFileSync(process.argv[2], "utf8");
const s = h.slice(h.indexOf("<script>") + 8);
const a = s.indexOf("function c(");
const b = s.indexOf("var st=");
const v1 = s.indexOf("var VENV=");
const v2 = s.indexOf("\nfunction MV", v1);
const code = s.slice(a, b) + "\n" + s.slice(v1, v2) +
  "\nthis.out={W,T,DU,R,P,E,CYC,HD,HL,FL,FEDU,TEACH,PROOF,C_REG,C_HIRE,VENV,NODES,chg:chgCell};";
// chgCell is defined after var st; pull it in
const cc = s.indexOf("function chgCell");
const ce = s.indexOf("\nfunction MW", cc);
const ctx = {};
vm.runInNewContext(s.slice(a, b) + "\n" + s.slice(cc, ce) + "\n" + s.slice(v1, v2) +
  "\nthis.out={W,T,DU,R,P,E,CYC,HD,HL,FL,FEDU,TEACH,PROOF,C_REG,C_HIRE,VENV,NODES};" +
  "this.chg={};W.forEach(function(r){if(!r.g)this.chg[r.id]=chgCell(r)}.bind(this));", ctx);
ctx.out.CHG = ctx.chg;
process.stdout.write(JSON.stringify(ctx.out));
