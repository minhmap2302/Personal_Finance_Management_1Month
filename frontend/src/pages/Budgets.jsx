import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Wallet, CalendarRange, LoaderCircle, TrendingUp, CircleDollarSign, ShieldCheck, PiggyBank } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { useToast } from '../context/ToastContext';
import { budgetApi, categoryApi, asList, money, numberValue, formatInput, alertTone } from '../services/pfmApi';
import { ConfirmDialog, EmptyState, Field, Modal, PageLoading, Progress } from '../components/PfmUI';
import PfmSelect from '../components/PfmSelect';

const idOf = u => u?.id ?? u?.userId;
export default function Budgets(){
 const {user}=useAuth(); const {activeFamily,activeFamilyId}=useFamily(); const toast=useToast(); const role=activeFamily?.myRole||'MEMBER'; const canManage=['OWNER','MANAGER'].includes(role);
 const [items,setItems]=useState([]),[cats,setCats]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[form,setForm]=useState(null),[target,setTarget]=useState(null),[amountText,setAmountText]=useState(''),[childForm,setChildForm]=useState(null),[childAmount,setChildAmount]=useState('');
 const load=useCallback(async()=>{
  if(!activeFamilyId){setItems([]);setLoading(false);return;}
  setLoading(true);
  try{
   const [b,c]=await Promise.all([
    budgetApi.list(activeFamilyId,{page:0,size:50,sort:'startDate,desc'}),
    categoryApi.list(activeFamilyId,'EXPENSE')
   ]);
   const list=asList(b);
   const detailed=await Promise.all(list.map(async budget=>{
    try{
     const detail=await budgetApi.get(activeFamilyId,budget.id);
     return {...budget,...detail,subBudgets:Array.isArray(detail?.subBudgets)?detail.subBudgets:[],subBudgetLoadError:false};
    }catch(detailError){
     // Không giả định ngân sách con rỗng nếu API chi tiết bị lỗi.
     console.error('Không thể tải chi tiết ngân sách',budget.id,detailError);
     return {...budget,subBudgets:undefined,subBudgetLoadError:true};
    }
   }));
   setItems(detailed);
   setCats(asList(c));
   if(detailed.some(budget=>budget.subBudgetLoadError)){
    toast('Không tải được chi tiết một số ngân sách. Hãy kiểm tra API GET /budgets/{id}.','error');
   }
  }catch(e){
   toast(e?.response?.data?.message||'Không thể tải ngân sách.','error');
  }finally{setLoading(false);}
 },[activeFamilyId,toast]);
 useEffect(()=>{load();},[load]);
 const today = new Date(); today.setHours(0,0,0,0);
 const activeBudgets = items.filter(b => { const start=new Date(`${b.startDate}T00:00:00`), end=new Date(`${b.endDate}T23:59:59`); return start<=today && end>=today; });
 const totalLimit = activeBudgets.reduce((sum,b)=>sum+Number(b.amount||0),0);
 const totalSpent = activeBudgets.reduce((sum,b)=>sum+Number(b.spent||0),0);
 const totalSaved = activeBudgets.reduce((sum,b)=>sum+Number(b.saved||0),0);
 const totalUsed = activeBudgets.reduce((sum,b)=>sum+Number(b.used??(Number(b.spent||0)+Number(b.saved||0))),0);
 const totalRemaining = totalLimit-totalUsed;
 const overallPercent = totalLimit>0 ? Math.min(100,Math.max(0,totalUsed/totalLimit*100)) : 0;
 function openEdit(b){setForm(b);setAmountText(formatInput(b.amount));}
 async function save(e){e.preventDefault();const amount=numberValue(amountText);const start=new Date(`${form.startDate}T00:00:00`),end=new Date(`${form.endDate}T00:00:00`);const days=(end-start)/86400000;if(!amount||!form.startDate||!form.endDate||days<0||days>366){toast('Khoảng ngày phải hợp lệ và không vượt quá 366 ngày; hạn mức phải lớn hơn 0.','error');return;}setBusy(true);try{const payload={amount,startDate:form.startDate,endDate:form.endDate};if(form.id)await budgetApi.update(activeFamilyId,form.id,payload);else await budgetApi.create(activeFamilyId,payload);toast(form.id?'Đã cập nhật ngân sách tổng.':'Đã tạo ngân sách tổng.','success');setForm(null);await load();}catch(e){toast(e?.response?.data?.message||'Không thể lưu ngân sách.','error');}finally{setBusy(false);}}
  async function saveChild(e){
   e.preventDefault();
   const amount=numberValue(childAmount);
   if(!amount||!childForm?.categoryId){toast('Chọn danh mục và hạn mức hợp lệ.','error');return;}
   const parent=items.find(x=>String(x.id)===String(childForm.budgetId));
   const old=parent?.subBudgets?.find(x=>String(x.id)===String(childForm.id));
   const unallocated=Number(parent?.unallocated||0)+(old?Number(old.amount):0);
   if(amount>unallocated){toast(`Hạn mức con vượt số tiền chưa phân bổ (${money(unallocated)}).`,'error');return;}
   setBusy(true);
   try{
    const payload=childForm.id?{amount}:{categoryId:Number(childForm.categoryId),amount};
    const saved=childForm.id
      ? await budgetApi.updateSub(activeFamilyId,childForm.budgetId,childForm.id,payload)
      : await budgetApi.createSub(activeFamilyId,childForm.budgetId,payload);
    // POST/PUT trả về SubBudgetResponse; cập nhật trực tiếp để giao diện không
    // phụ thuộc vào lần GET thứ hai mới hiển thị ngân sách con.
    const savedRow=saved&&typeof saved==='object'?saved:{...old,id:childForm.id,categoryId:Number(childForm.categoryId),amount};
    const delta=amount-Number(old?.amount||0);
    setItems(current=>current.map(budget=>{
      if(String(budget.id)!==String(childForm.budgetId))return budget;
      const existing=Array.isArray(budget.subBudgets)?budget.subBudgets:[];
      const next=childForm.id
        ? existing.map(row=>String(row.id)===String(childForm.id)?{...row,...savedRow}:row)
        : [...existing,savedRow];
      return {...budget,subBudgets:next,subBudgetLoadError:false,allocated:Number(budget.allocated||0)+delta,unallocated:Number(budget.unallocated||0)-delta};
    }));
    toast(childForm.id?'Đã cập nhật ngân sách con.':'Đã thêm ngân sách con.','success');
    setChildForm(null);
   }catch(e){
    toast(e?.response?.data?.message||'Không thể lưu ngân sách con.','error');
   }finally{setBusy(false);}
  }
 async function remove(){setBusy(true);try{await budgetApi.remove(activeFamilyId,target.id);toast('Đã xóa ngân sách tổng.','success');setTarget(null);await load();}catch(e){toast(e?.response?.data?.message||'Không thể xóa ngân sách.','error');}finally{setBusy(false);}}
 async function removeChild(b,sub){setBusy(true);try{await budgetApi.removeSub(activeFamilyId,b.id,sub.id);toast('Đã xóa ngân sách con.','success');await load();}catch(e){toast(e?.response?.data?.message||'Không thể xóa ngân sách con.','error');}finally{setBusy(false);}}
 return <motion.div className="pfm-page pfm-budget-page" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}><div className="pfm-page-heading"><div><div className="pfm-eyebrow">KẾ HOẠCH CHI TIÊU · {activeFamily?.name||'CHƯA CHỌN GIA ĐÌNH'}</div><h1>Ngân sách gia đình</h1><p>Theo dõi hạn mức, khoản đã chi và tiền đóng góp tiết kiệm trong kỳ.</p></div>{canManage&&<button className="pfm-btn pfm-btn-primary" onClick={()=>{setForm({startDate:'',endDate:''});setAmountText('');}} disabled={!activeFamilyId}><Plus size={17}/> Tạo ngân sách tổng</button>}</div>
 {!loading&&items.length>0&&<section className="pfm-budget-overview"><div className="pfm-budget-overview-main"><div><span className="pfm-budget-overline"><Wallet size={14}/> TỔNG QUAN NGÂN SÁCH ĐANG HIỆU LỰC</span><h2>{money(totalLimit)}</h2><p>Tổng hạn mức của {activeBudgets.length} ngân sách trong thời gian hiện tại</p></div><div className="pfm-budget-ring" style={{'--budget-progress':`${overallPercent}%`}}><div><strong>{overallPercent.toLocaleString('vi-VN',{maximumFractionDigits:0})}%</strong><small>đã sử dụng</small></div></div></div><div className="pfm-budget-overview-progress"><span style={{width:`${overallPercent}%`}}/></div><div className="pfm-budget-kpis"><div><span><CircleDollarSign size={15}/> Đã chi tiêu</span><b>{money(totalSpent)}</b></div><div><span><PiggyBank size={15}/> Đã tiết kiệm</span><b>{money(totalSaved)}</b></div><div><span><TrendingUp size={15}/> Đã sử dụng</span><b>{money(totalUsed)}</b></div><div><span><ShieldCheck size={15}/> Còn lại</span><b className={totalRemaining<0?'negative':''}>{money(totalRemaining)}</b></div></div></section>}
 {loading?<PageLoading rows={4}/>:items.length===0?<EmptyState title="Chưa thiết lập ngân sách" description="Chủ gia đình hoặc quản lý có thể tạo ngân sách tổng đầu tiên."/>:<div className="pfm-budget-list">{items.map(b=>{const pct=Number(b.usedPercent||0),tone=alertTone(b.status,pct);return <section className="pfm-panel pfm-budget-card" key={b.id}><div className="pfm-budget-head"><div><div className="pfm-eyebrow">NGÂN SÁCH TỔNG</div><h2>{new Date(`${b.startDate}T00:00:00`).toLocaleDateString('vi-VN')} – {new Date(`${b.endDate}T00:00:00`).toLocaleDateString('vi-VN')}</h2></div><div className="pfm-inline-actions">{canManage&&<><button className="pfm-icon-btn" title="Sửa ngân sách" onClick={()=>openEdit(b)}><Pencil size={16}/></button><button className="pfm-icon-btn danger" title="Xóa ngân sách" onClick={()=>setTarget(b)}><Trash2 size={16}/></button></>}</div></div>
 <div className="pfm-budget-total"><strong>{money(b.amount)}</strong><span className={`pfm-status pfm-${tone}`}>{tone==='danger'?'Vượt mức':tone==='warning'?'Cảnh báo':'Bình thường'} · {pct.toLocaleString('vi-VN',{maximumFractionDigits:1})}%</span></div><Progress value={pct} status={tone}/><div className="pfm-budget-stats"><div><small>Đã chi tiêu</small><b>{money(b.spent)}</b></div><div><small>Đã tiết kiệm</small><b>{money(b.saved)}</b></div><div><small>Đã sử dụng</small><b>{money(b.used)}</b></div><div><small>Còn lại</small><b className={Number(b.remaining)<0?'negative':''}>{money(b.remaining)}</b></div></div><div className="pfm-unallocated"><span>Chưa phân bổ cho ngân sách con</span><b>{money(b.unallocated)}</b></div>
 <div className="pfm-subbudget-head"><div><h3>Ngân sách theo danh mục</h3><p>Hạn mức con chỉ áp dụng cho danh mục chi tiêu.</p></div>{canManage&&<button className="pfm-btn pfm-btn-outline" onClick={()=>{setChildForm({budgetId:b.id});setChildAmount('');}}><Plus size={15}/> Thêm hạn mức con</button>}</div>
 {b.subBudgetLoadError?<div className="pfm-sub-empty">Không tải được danh sách ngân sách con. Vui lòng tải lại hoặc kiểm tra API chi tiết ngân sách.</div>:(b.subBudgets||[]).length===0?<div className="pfm-sub-empty">Chưa phân bổ ngân sách theo danh mục.</div>:<div className="pfm-sub-list">{b.subBudgets.map(s=>{const sp=Number(s.usedPercent||0),st=alertTone(s.status,sp);return <div className="pfm-sub-row" key={s.id}><div className="pfm-sub-title"><b>{s.categoryName}</b><span>{money(s.spent)} / {money(s.amount)}</span></div><Progress value={sp} status={st}/><div className="pfm-sub-foot"><small>{sp.toLocaleString('vi-VN',{maximumFractionDigits:1})}% đã dùng · Còn {money(s.remaining)}</small>{canManage&&<div><button onClick={()=>{setChildForm({budgetId:b.id,...s});setChildAmount(formatInput(s.amount));}}><Pencil size={14}/></button><button className="danger" onClick={()=>removeChild(b,s)}><Trash2 size={14}/></button></div>}</div></div>})}</div>}
 <p className="pfm-help">Đã sử dụng ngân sách tổng = chi tiêu + đóng góp tiết kiệm hợp lệ. Các mục tiêu đã hủy không được tính vào tổng đóng góp.</p></section>})}</div>}
 {form&&<Modal title={form.id?'Chỉnh sửa ngân sách tổng':'Thiết lập ngân sách tổng'} onClose={()=>setForm(null)}><form className="pfm-form" onSubmit={save}><Field label="Tổng hạn mức (VND)"><input required inputMode="numeric" value={amountText} onChange={e=>setAmountText(formatInput(e.target.value))} placeholder="20.000.000"/></Field><Field label="Ngày bắt đầu"><input type="date" required value={form.startDate||''} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))}/></Field><Field label="Ngày kết thúc"><input type="date" required value={form.endDate||''} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))}/></Field><p className="pfm-help">Thời gian áp dụng không được vượt quá 366 ngày.</p><div className="pfm-form-actions"><button type="button" className="pfm-btn pfm-btn-light" onClick={()=>setForm(null)}>Hủy</button><button className="pfm-btn pfm-btn-primary" disabled={busy}>{busy&&<LoaderCircle className="pfm-spin" size={16}/>}Lưu ngân sách</button></div></form></Modal>}
 {childForm&&<Modal title={childForm.id?'Chỉnh sửa ngân sách con':'Thêm ngân sách con'} onClose={()=>setChildForm(null)}><form className="pfm-form" onSubmit={saveChild}><Field label="Danh mục chi tiêu"><PfmSelect ariaLabel="Danh mục chi tiêu" value={childForm.categoryId||''} placeholder="Chọn danh mục" onChange={value=>setChildForm(f=>({...f,categoryId:value}))} options={[{value:'',label:'Chọn danh mục'},...cats.filter(c=>c.active!==false).map(c=>({value:String(c.id),label:c.name}))]}/></Field><Field label="Hạn mức (VND)"><input required inputMode="numeric" value={childAmount} onChange={e=>setChildAmount(formatInput(e.target.value))} placeholder="3.000.000"/></Field><p className="pfm-help">Số tiền nhập không được vượt số chưa phân bổ của ngân sách tổng.</p><div className="pfm-form-actions"><button type="button" className="pfm-btn pfm-btn-light" onClick={()=>setChildForm(null)}>Hủy</button><button className="pfm-btn pfm-btn-primary" disabled={busy}>{busy&&<LoaderCircle className="pfm-spin" size={16}/>}Lưu ngân sách con</button></div></form></Modal>}
 {target&&<ConfirmDialog title="Xóa ngân sách tổng?" description="Toàn bộ ngân sách con thuộc ngân sách này cũng sẽ bị xóa. Dữ liệu giao dịch và đóng góp tiết kiệm không bị xóa." onCancel={()=>setTarget(null)} onConfirm={remove} busy={busy} confirmText="Xóa ngân sách"/>}
 </motion.div>;
}
