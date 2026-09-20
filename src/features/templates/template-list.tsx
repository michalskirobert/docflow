"use client";
import { useState } from "react";
import { Copy, Edit3, FilePlus2, Trash2 } from "lucide-react";
import { useCreateTemplateService, useDeleteTemplateService, useTemplatesService } from "./service";
import type { Template } from "./types";
import { TemplateEditor } from "./template-editor";

export default function TemplateList(){
 const query=useTemplatesService(); const create=useCreateTemplateService(); const [editing,setEditing]=useState<Template|null|"new">(null);
 return <><div className="page-actions"><button className="btn" onClick={()=>setEditing("new")}><FilePlus2 size={18}/> New template</button></div>
 {query.data?.length ? <div className="template-grid">{query.data.map(t=><TemplateCard key={t.id} template={t} onEdit={()=>setEditing(t)} onDuplicate={()=>create.mutate({name:`${t.name} copy`,description:t.description??"",content:t.content})}/>)}</div> : <div className="empty-state"><FilePlus2/><h2>Create your first template</h2><p>Design reusable documents with variables, tables and images.</p></div>}
 {editing && <TemplateEditor template={editing==="new"?undefined:editing} onClose={()=>setEditing(null)}/>}</>;
}
function TemplateCard({template,onEdit,onDuplicate}:{template:Template;onEdit:()=>void;onDuplicate:()=>void}){ const remove=useDeleteTemplateService(template.id); let variables:string[]=[]; try{variables=JSON.parse(template.variablesJson)}catch{}
 return <article className="template-card"><div className="template-preview" dangerouslySetInnerHTML={{__html:template.content}}/><div className="template-body"><div className="row between"><h3>{template.name}</h3>{template.isExample&&<span className="badge">Example</span>}</div><p className="muted clamp">{template.description||"No description"}</p><div className="variable-list">{variables.slice(0,4).map(v=><span key={v}>{`{{${v}}}`}</span>)}</div><div className="card-actions"><button onClick={onEdit}><Edit3/> Edit</button><button onClick={onDuplicate}><Copy/> Duplicate</button><button className="danger-link" onClick={()=>confirm("Delete this template?")&&remove.mutate(undefined)}><Trash2/></button></div></div></article> }
